import os
import json
from typing import List, AsyncGenerator
from langchain_mistralai import ChatMistralAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from diff_match_patch import diff_match_patch
from database import Message
from dotenv import load_dotenv

load_dotenv()

# We expect MISTRAL_API_KEY in the environment
llm = ChatMistralAI(
    model="mistral-small-2506",
    temperature=0.7,
    streaming=True
)

eval_llm = ChatMistralAI(
    model="mistral-small-2506",
    temperature=0.0
)

# 1. Chat Generation
async def generate_chat_response(messages: List[Message]) -> AsyncGenerator[str, None]:
    system_prompt = SystemMessage(
        content=(
            "You are a helpful sales assistant drafting cold outreach emails. "
            "You can ask one or two clarifying questions if the user's request is too vague, "
            "but if the user asks you to just draft it or leave placeholders, YOU MUST COMPLY IMMEDIATELY "
            "and provide the draft using [Placeholders] for missing information. Do not stubbornly refuse to draft the email."
        )
    )
    
    langchain_messages = [system_prompt]
    for msg in messages:
        if msg.role == 'user':
            langchain_messages.append(HumanMessage(content=msg.content))
        else:
            langchain_messages.append(AIMessage(content=msg.content))
            
    # Stream the response
    async for chunk in llm.astream(langchain_messages):
        yield chunk.content

# 2. Signal Calculations

async def calculate_prompt_count(messages: List[Message]) -> int:
    """
    Meaningful Prompt Count: Categorizes user messages via LLM and counts only meaningful ones.
    """
    user_messages = [msg.content for msg in messages if msg.role == 'user']
    if not user_messages:
        return 0

    prompts_text = ""
    for i, msg in enumerate(user_messages):
        prompts_text += f"Prompt {i+1}: {msg}\n"

    prompt = ChatPromptTemplate.from_template(
        "Categorize each of the following user prompts into exactly one of these categories:\n"
        "- Clarification (e.g., answering AI questions, 'I am selling software')\n"
        "- Revision (e.g., asking to rewrite a section)\n"
        "- New instruction (e.g., adding a new topic or constraint)\n"
        "- Fact-checking (e.g., correcting the AI)\n"
        "- Style change (e.g., 'make it more professional')\n"
        "- Trivial (e.g., conversational filler, 'hi', keysmashing 'asdfg')\n\n"
        "Respond ONLY with a valid JSON object in this exact format: {{\"categorized_prompts\": [{{\"message\": \"...\", \"category\": \"...\"}}]}}\n\n"
        "Prompts:\n{prompts_text}"
    )

    chain = prompt | eval_llm | StrOutputParser()

    try:
        result = await chain.ainvoke({"prompts_text": prompts_text})
        clean_result = result.replace('```json', '').replace('```', '').strip()
        data = json.loads(clean_result)
        
        meaningful_categories = {"revision", "new instruction", "fact-checking", "style change"}
        count = 0
        for item in data.get("categorized_prompts", []):
            if item.get("category", "").lower() in meaningful_categories:
                count += 1
        return count
    except Exception as e:
        print(f"Error calculating prompt count: {e}")
        # Fallback to length heuristic
        return sum(1 for m in user_messages if len(m.strip()) > 10)

def calculate_edit_ratio(final_text: str, messages: List[Message]) -> float:
    """
    Calculates the Edit Ratio using diff-match-patch.
    (Length of characters from AI output that exist in final draft) / (Total length of final draft)
    """
    if not final_text:
        return 0.0
        
    ai_texts = [msg.content for msg in messages if msg.role == 'ai']
    concatenated_ai = "\n".join(ai_texts)
    
    if not concatenated_ai:
        return 0.0

    dmp = diff_match_patch()
    diffs = dmp.diff_main(concatenated_ai, final_text)
    dmp.diff_cleanupSemantic(diffs)
    
    # diffs is a list of tuples: (operation, text)
    # operation: -1 (delete), 1 (insert), 0 (equal)
    # We want to measure how much of the final_text came from 'equal' blocks.
    
    matching_chars = 0
    for op, text in diffs:
        if op == 0:
            matching_chars += len(text)
            
    ratio = matching_chars / len(final_text)
    return min(1.0, max(0.0, ratio)) # Clamp between 0 and 1


async def calculate_verification_score(messages: List[Message]) -> int:
    """
    Uses an LLM as a judge to assign a Verification Behavior Score (1-4).
    """
    transcript = ""
    for msg in messages:
        transcript += f"{msg.role.upper()}: {msg.content}\n"
        
    prompt = ChatPromptTemplate.from_template(
        "Analyze the following chat transcript between a USER and an AI.\n"
        "Score the USER's verification behavior on a scale of 1 to 4 based on this rubric:\n"
        "1: Uncritical Acceptance (Never challenged or questioned the AI)\n"
        "2: Surface-Level Friction (Asked weak clarifications but didn't challenge facts)\n"
        "3: Critical Pushback (Explicitly questioned a factual claim or logic)\n"
        "4: Active Verification (Actively verified and corrected claims with their own facts)\n\n"
        "Respond ONLY with a valid JSON object in this exact format: {{\"score\": X}}\n\n"
        "Transcript:\n{transcript}"
    )
    
    chain = prompt | eval_llm | StrOutputParser()
    
    try:
        result = await chain.ainvoke({"transcript": transcript})
        clean_result = result.replace('```json', '').replace('```', '').strip()
        data = json.loads(clean_result)
        return int(data.get("score", 1))
    except Exception as e:
        print(f"Error calculating verification score: {e}")
        return 1

async def generate_ai_interpretation(prompt_count: int, edit_ratio: float, verification_score: int, messages: List[Message]) -> str:
    """
    Generates the final 1-paragraph interpretation of the user's behavior.
    """
    transcript = ""
    for msg in messages:
        transcript += f"{msg.role.upper()}: {msg.content}\n"
        
    prompt = ChatPromptTemplate.from_template(
        "You are evaluating a user's behavior while they interacted with an AI to write a cold email.\n"
        "Here are their stats:\n"
        "- Meaningful Prompts sent: {prompt_count}\n"
        "- Edit Ratio (Adoption of AI text): {edit_ratio:.2f} (1.0 means they copy-pasted entirely, 0.0 means they wrote it all themselves)\n"
        "- Verification Behavior Score (1=Blindly Accepted, 4=Actively Verified): {verification_score}/4\n\n"
        "Here is the transcript:\n{transcript}\n\n"
        "Write a single, insightful paragraph interpreting how they worked WITH the AI. "
        "Anchor your observations in the stats and transcript. Don't say 'great job', just observe their habits."
    )
    
    chain = prompt | eval_llm | StrOutputParser()
    
    try:
        result = await chain.ainvoke({
            "prompt_count": prompt_count,
            "edit_ratio": edit_ratio,
            "verification_score": verification_score,
            "transcript": transcript
        })
        return result
    except Exception as e:
        print(f"Error generating AI interpretation: {e}")
        return "AI interpretation unavailable due to an error."
