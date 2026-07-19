from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session as SQLSession, select
from pydantic import BaseModel
import asyncio
import json

from database import create_db_and_tables, get_session, Session, Message, FinalSubmission, DraftEdit
from llm import generate_chat_response, calculate_prompt_count, calculate_edit_ratio, calculate_verification_score, generate_ai_interpretation

app = FastAPI()

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# ----------------- Models -----------------
class ChatRequest(BaseModel):
    content: str

class SubmitRequest(BaseModel):
    final_text: str

class DraftRequest(BaseModel):
    content: str

# ----------------- Routes -----------------

@app.post("/api/sessions")
def create_session(db: SQLSession = Depends(get_session)):
    new_session = Session()
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return {"session_id": new_session.id}

@app.post("/api/sessions/{session_id}/chat")
async def chat(session_id: str, request: ChatRequest, db: SQLSession = Depends(get_session)):
    # 1. Verify session
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 2. Save user message
    user_msg = Message(session_id=session_id, role="user", content=request.content)
    db.add(user_msg)
    db.commit()

    # 3. Retrieve history
    statement = select(Message).where(Message.session_id == session_id).order_by(Message.timestamp)
    history = db.exec(statement).all()

    # 4. Stream response
    async def event_generator():
        full_response = ""
        try:
            async for chunk in generate_chat_response(history):
                full_response += chunk
                # SSE format: data: {"text": "chunk"}\n\n
                yield f"data: {json.dumps({'text': chunk})}\n\n"
        finally:
            # Save AI message to DB after stream finishes or errors
            if full_response:
                try:
                    ai_msg = Message(session_id=session_id, role="ai", content=full_response)
                    from database import engine
                    with SQLSession(engine) as sync_db:
                        sync_db.add(ai_msg)
                        sync_db.commit()
                    print(f"Successfully saved AI message of length {len(full_response)}")
                except Exception as e:
                    print(f"CRITICAL ERROR saving AI message: {e}")

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/sessions/{session_id}/draft")
def save_draft(session_id: str, request: DraftRequest, db: SQLSession = Depends(get_session)):
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    draft = DraftEdit(session_id=session_id, content=request.content)
    db.add(draft)
    db.commit()
    return {"status": "ok"}

@app.post("/api/sessions/{session_id}/submit")
async def submit_session(session_id: str, request: SubmitRequest, db: SQLSession = Depends(get_session)):
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    statement = select(Message).where(Message.session_id == session_id).order_by(Message.timestamp)
    messages = db.exec(statement).all()
    
    prompt_count = calculate_prompt_count(messages)
    edit_ratio = calculate_edit_ratio(request.final_text, messages)
    verification_score = await calculate_verification_score(messages)
    ai_interpretation = await generate_ai_interpretation(prompt_count, edit_ratio, verification_score, messages)
    
    submission = FinalSubmission(
        session_id=session_id,
        final_text=request.final_text,
        prompt_count=prompt_count,
        edit_ratio=edit_ratio,
        verification_score=verification_score,
        ai_interpretation=ai_interpretation
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return {
        "prompt_count": prompt_count,
        "edit_ratio": edit_ratio,
        "verification_score": verification_score,
        "ai_interpretation": ai_interpretation
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
