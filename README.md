# The Fluency Signal

A web app designed to measure how a user collaborates with an AI assistant to draft a cold outreach email. It captures all chat history, calculates an edit ratio based on the final submission, and uses an LLM-as-a-judge to evaluate their verification behavior.

## How to run locally

Open `backend/.env.example`, rename it to `.env`, and add your `MISTRAL_API_KEY` (and `LANGCHAIN_API_KEY` for LangSmith tracing).

### 1. Setup the Backend (Python)

First, you'll need to set up a virtual environment and install the required Python packages. Open a terminal and run the following commands:

```bash
# 1. Create a virtual environment named 'venv'
python -m venv venv

# 2. Activate the virtual environment
# On Windows:
.\venv\Scripts\Activate.ps1
# On Mac/Linux:
source venv/bin/activate

# 3. Install the dependencies
pip install -r requirements.txt

# 4. Navigate to the backend folder and start the server
cd backend
python main.py
```

### 2. Setup the Frontend (React)

Open a **new, separate terminal** (keep the backend terminal running!) and run the following commands to start the user interface:

```bash
# 1. Navigate to the frontend folder
cd frontend

# 2. Install the necessary Node packages
npm install

# 3. Start the development server
npm run dev
```

## Data Model

I use a local SQLite database (managed by SQLModel/SQLAlchemy) to ensure the project is fully portable. The schema consists of:
*   **Session**: Represents a single user's attempt at the assessment.
*   **Message**: Stores every chat message (user and AI) tied to the `session_id`, including a timestamp and role.
*   **FinalSubmission**: When the user hits Submit, this table stores the final email draft text along with the three computed signals (`prompt_count`, `edit_ratio`, `verification_score`) and the `ai_interpretation` paragraph.

## Signal Definitions & Reasoning

### 1. Meaningful Prompt Count
Instead of a raw count of all user messages or using a naive string-length heuristic, I use a zero-temperature LLM to **categorize each user prompt**. The LLM classifies prompts into categories like `Clarification`, `Revision`, `Fact-checking`, and `Trivial`. I then strictly count only the prompts that meaningfully drive the task forward (e.g., revisions, fact-checks, new instructions), ignoring conversational filler.

### 2. Adoption Rate (Edit Ratio)
To calculate how much of the AI's suggestion made it into the final email, I use the `diff-match-patch` algorithm on the backend. When the session ends, I concatenate all of the AI's responses and run a diff against the user's Final Draft. The formula is: `(Number of characters in the Final Draft that exactly match text from the AI) / (Total length of the Final Draft)`. 
**Why:** This is objective and mathematically rigorous. It clearly separates "copy-pasters" (high ratio) from "ideators" who write their own prose (low ratio).

### 3. Critical Friction (Verification Behavior Score)
To detect if the user pushed back on factual claims, I use an **LLM-as-a-judge**. At submission, the entire session transcript is passed to a Mistral LLM with a strict evaluation rubric that assigns a **Verification Behavior Score (1-4)**:
1. **Blindly Accepted**: Never challenged the AI.
2. **Weak Verification**: Asked surface-level clarifications.
3. **Questioned AI**: Explicitly questioned a factual claim.
4. **Actively Verified**: Actively verified and corrected claims with their own facts.

**Why:** Keyword matching (e.g., regexing for "are you sure") is extremely brittle. Using an LLM explicitly prompted to look for semantic pushback or fact-checking behavior provides a much more granular and accurate metric.

## Trade-offs & Future Improvements

1.  **Draft Editing History**: Currently, I only evaluate the *Final Draft*. With more time, I would implement auto-saving `DraftEdit` rows in the database (debounced to every 2 seconds of typing) to capture the timeline of how their email evolved alongside the chat.
2.  **Telemetry and Copy-Paste Detection**: I could add frontend telemetry to detect if they highlighted text in the chat and hit `Ctrl+C`, vs manually typing it out. This would augment the diffing algorithm.
3.  **Authentication**: The app currently operates as a single-user prototype without login handling. In a real-world scenario, I'd add Clerk or Supabase Auth.
