from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, create_engine, Session as SQLSession
import uuid

class Session(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="session.id")
    role: str # 'user' or 'ai'
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class DraftEdit(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="session.id")
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class FinalSubmission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="session.id")
    final_text: str
    prompt_count: int
    edit_ratio: float
    verification_score: int
    ai_interpretation: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, echo=False, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with SQLSession(engine) as session:
        yield session
