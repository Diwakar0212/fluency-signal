# The Fluency Signal

A web app designed to measure how a user collaborates with an AI assistant to draft a cold outreach email. It captures all chat history, calculates an edit ratio based on the final submission, and uses an LLM-as-a-judge to evaluate their verification behavior.

## How to run locally

1. Open `backend/.env.example`, rename it to `.env`, and add your `MISTRAL_API_KEY` (and `LANGCHAIN_API_KEY` for LangSmith tracing).
2. Start the backend (FastAPI): `cd backend && python -m venv venv && .\venv\Scripts\Activate.ps1 && pip install -r ../requirements.txt && python main.py`
3. Start the frontend (React/Vite): `cd frontend && npm install && npm run dev`

## Data Model

We use a local SQLite database (managed by SQLModel/SQLAlchemy) to ensure the project is fully portable. The schema consists of:
*   **Session**: Represents a single user's attempt at the assessment.
*   **Message**: Stores every chat message (user and AI) tied to the `session_id`, including a timestamp and role.
*   **FinalSubmission**: When the user hits Submit, this table stores the final email draft text along with the three computed signals (`prompt_count`, `edit_ratio`, `verification_signal`) and the `ai_interpretation` paragraph.

## Signal Definitions & Reasoning

### 1. Meaningful Prompt Count
Instead of a raw count of all user messages (which includes noise like "hi" or "thanks"), we calculate a **Meaningful Prompt Count**. We filter out any user message shorter than 10 characters. This is defensible because volume does not equal effort; we want to count actual instructions and iterations, not pleasantries.

### 2. Adoption Rate (Edit Ratio)
To calculate how much of the AI's suggestion made it into the final email, we use the `diff-match-patch` algorithm on the backend. When the session ends, we concatenate all of the AI's responses and run a diff against the user's Final Draft. The formula is: `(Number of characters in the Final Draft that exactly match text from the AI) / (Total length of the Final Draft)`. 
**Why:** This is objective and mathematically rigorous. It clearly separates "copy-pasters" (high ratio) from "ideators" who write their own prose (low ratio).

### 3. Critical Friction (Verification Signal)
To detect if the user ever pushed back on a factual claim, we use an **LLM-as-a-judge**. At submission, the entire session transcript is passed to a Mistral LLM with a specific LangChain evaluation prompt. 
**Why:** Keyword matching (e.g., regexing for "are you sure") is extremely brittle. Using an LLM explicitly prompted to look for semantic pushback or fact-checking behavior is the industry standard for evaluating complex, unstructured conversational behavior.

## Trade-offs & Future Improvements

1.  **Draft Editing History**: Currently, we only evaluate the *Final Draft*. With more time, we would implement auto-saving `DraftEdit` rows in the database (debounced to every 2 seconds of typing) to capture the timeline of how their email evolved alongside the chat.
2.  **Telemetry and Copy-Paste Detection**: We could add frontend telemetry to detect if they highlighted text in the chat and hit `Ctrl+C`, vs manually typing it out. This would augment the diffing algorithm.
3.  **Authentication**: The app currently operates as a single-user prototype without login handling. In a real-world scenario, we'd add Clerk or Supabase Auth.
