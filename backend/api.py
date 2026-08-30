"""
SkillPilot AI — FastAPI Backend
================================
Run with:
    cd backend
    personalized-learning\\hcl\\Scripts\\activate
    uvicorn api:app --reload --port 8000

All engine logic lives in personalized-learning/engine/*.
"""

import os
import sys
import json
import hashlib
from datetime import date, datetime
from typing import List, Optional, Dict

# ── path setup ──────────────────────────────────────────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
_PL   = os.path.join(_HERE, "personalized-learning")
if _PL not in sys.path:
    sys.path.insert(0, _PL)

from dotenv import load_dotenv
load_dotenv(os.path.join(_PL, ".env"))

import pandas as pd
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from engine.goal_analyzer   import analyze_goal
from engine.graph            import build_graph, multi_goal_merge, goal_required_skills, topo_order
from engine.skill_gap        import compute_gaps, readiness_score
from engine.recommender      import recommend
from engine.adaptive         import BKTEngine, detect_false_mastery
from engine.calibration      import QuizAnswer, calibration_report
from engine.whatif           import what_if
from engine.spaced_repetition import ReviewState, sm2_update, build_review_queue
from database import db

# ── data ────────────────────────────────────────────────────────────────────
DATA     = os.path.join(_PL, "data")
DB_PATH  = os.path.join(_PL, "database", "learning.db")

db.init_db(DB_PATH)

skills_df   = pd.read_csv(f"{DATA}/skills.csv")
roles_df    = pd.read_csv(f"{DATA}/roles.csv")
courses_df  = pd.read_csv(f"{DATA}/courses.csv")
prereq_csv  = f"{DATA}/prerequisites.csv"
with open(f"{DATA}/quiz_bank.json") as f:
    QUIZ_BANK = json.load(f)

G         = build_graph(prereq_csv)
ALL_GOALS = sorted(roles_df["role"].unique().tolist())
ALL_SKILLS= skills_df["skill"].tolist()

# ── app ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="SkillPilot AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def get_user_id(creds: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Simple token = username (for demo; replace with JWT in production)."""
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return creds.credentials   # token is just the username

# ── Pydantic models ───────────────────────────────────────────────────────────
class RegisterReq(BaseModel):
    username: str
    password: str
    name: str
    goal_text: str
    experience: str
    second_goal: Optional[str] = None

class LoginReq(BaseModel):
    username: str
    password: str

class AnalyzeGoalReq(BaseModel):
    text: str

class QuizSubmitReq(BaseModel):
    skill: str
    answers_correct: List[bool]
    confidence: int = 3

class WhatIfReq(BaseModel):
    candidate_skills: List[str]

class ChatReq(BaseModel):
    message: str

class CompleteProjectReq(BaseModel):
    project_id: str

# ── helpers ───────────────────────────────────────────────────────────────────
def _build_learner_state(user_id: str, user_row: dict) -> dict:
    """Reconstruct full learner state from DB for a given user."""
    goal      = user_row["goal"]
    required  = goal_required_skills(roles_df, goal)

    # Skills — merge required set with stored masteries
    stored    = db.get_learner_skills(DB_PATH, user_id)
    skills    = []
    for skill, req_level in required.items():
        mastery = stored.get(skill, 0.0)
        skills.append({
            "name":          skill,
            "mastery":       round(mastery, 4),
            "required":      req_level,
            "lastPracticed": 0,
        })

    current_mastery = {s["name"]: s["mastery"] for s in skills}
    gaps     = compute_gaps(current_mastery, required)
    readiness= readiness_score(current_mastery, required)

    # Roadmap phases from topo order
    topo     = topo_order(G, list(required.keys()))
    phase_size= max(1, len(topo) // 4)
    chunks   = [topo[i:i+phase_size] for i in range(0, len(topo), phase_size)]
    phase_labels = ["Foundation", "Core Skills", "Advanced", "Expert"]

    roadmap  = []
    for idx, chunk in enumerate(chunks[:5]):
        statuses = [current_mastery.get(s, 0.0) / required.get(s, 1.0) for s in chunk]
        avg_prog  = round(sum(statuses) / len(statuses) * 100) if statuses else 0
        # phase locked if prior phase not at 60%
        if idx == 0:
            status = "in_progress"
        else:
            prior_chunk = chunks[idx-1]
            prior_avg   = sum(current_mastery.get(s, 0) / required.get(s, 1) for s in prior_chunk) / max(len(prior_chunk), 1)
            status = "in_progress" if prior_avg >= 0.6 else "locked"
        label = phase_labels[idx] if idx < len(phase_labels) else f"Phase {idx+1}"
        roadmap.append({
            "id":    idx + 1,
            "phase": f"0{idx+1}",
            "title": label,
            "skills": chunk,
            "progress": avg_prog,
            "status":   status,
            "assessmentRequired": avg_prog > 0 and avg_prog < 80,
            "lockReason": f"Complete Phase {idx} first" if status == "locked" else None,
        })

    # Next best action = highest-gap skill that has available quiz questions
    quiz_skills = set(QUIZ_BANK.keys())
    action_skill = next(
        (s for s, g in gaps if s in quiz_skills), gaps[0][0] if gaps else None
    )

    # Spaced repetition / decay
    sched     = db.get_review_schedule(DB_PATH, user_id)
    today     = date.today()
    decay_alerts = []
    for skill_name, row in sched.items():
        nxt = datetime.strptime(row["next_review"], "%Y-%m-%d").date() if isinstance(row["next_review"], str) else row["next_review"]
        days_since = max((today - nxt).days, 0)
        if days_since > 7:
            retention = max(10, 100 - days_since * 2)
            decay_alerts.append({"skill": skill_name, "daysSince": days_since, "retention": retention})
    decay_alerts.sort(key=lambda x: x["retention"])

    # Evidence of mastery (aggregate from quiz_results)
    evidence = {"course": 0, "quiz": 0, "coding": 0, "project": 0}
    # Approximate from mastery scores
    avg_mastery = sum(current_mastery.values()) / max(len(current_mastery), 1)
    evidence = {
        "course":  min(100, round(avg_mastery * 120)),
        "quiz":    min(100, round(avg_mastery * 90)),
        "coding":  min(100, round(avg_mastery * 80)),
        "project": min(100, round(avg_mastery * 100)),
    }

    # False mastery — skills where BKT differs from self_reported
    skills_full = db.get_learner_skills_full(DB_PATH, user_id) if hasattr(db, "get_learner_skills_full") else []
    false_mastery = []
    for row_s in skills_full:
        sr = row_s.get("self_reported") or 0
        bkt= row_s.get("bkt_mastery")  or sr
        if sr - bkt >= 0.25:
            false_mastery.append({"skill": row_s["skill"], "selfReported": sr, "demonstrated": bkt})

    # Chat history
    chat_history = db.get_chat_history(DB_PATH, user_id)
    if not chat_history:
        chat_history = [{
            "role": "assistant",
            "content": f"Hi {user_row['name']}! I'm your Learning Copilot. I know your full skill profile and roadmap. Ask me anything.",
        }]

    # Adaptations
    adaptations = db.get_adaptation_history(DB_PATH, user_id)

    # Projects — filter by goal
    PROJECTS_MAP = {
        "AI Engineer": [
            {"id":"p1","title":"Customer Churn Prediction","skills":["Machine Learning","Pandas","Feature Engineering"],"difficulty":"Intermediate","hours":6,"reason":"Strengthens your weakest ML skills","recommended":True},
            {"id":"p2","title":"RAG Document Assistant","skills":["LLM","RAG","Python"],"difficulty":"Advanced","hours":10,"reason":"Prepares for Generative AI phase","recommended":False},
            {"id":"p3","title":"ML Model Deployment API","skills":["FastAPI","Docker","MLOps"],"difficulty":"Intermediate","hours":8,"reason":"Covers MLOps gap","recommended":False},
        ],
        "Data Scientist": [
            {"id":"p4","title":"EDA & Visualization Dashboard","skills":["Pandas","Data Visualization","Statistics"],"difficulty":"Beginner","hours":4,"reason":"Builds core data science workflow","recommended":True},
            {"id":"p5","title":"Predictive Analytics Pipeline","skills":["Machine Learning","SQL","Feature Engineering"],"difficulty":"Intermediate","hours":8,"reason":"End-to-end ML project","recommended":False},
        ],
        "Full Stack Developer": [
            {"id":"p6","title":"Full Stack Todo App","skills":["React","Node.js","Databases"],"difficulty":"Intermediate","hours":6,"reason":"Covers the full stack in one project","recommended":True},
            {"id":"p7","title":"REST API with Auth","skills":["REST APIs","Node.js","Databases"],"difficulty":"Intermediate","hours":5,"reason":"Core backend skill","recommended":False},
        ],
        "Cybersecurity Specialist": [
            {"id":"p8","title":"Capture the Flag Challenge","skills":["Ethical Hacking","Network Security","Cryptography"],"difficulty":"Advanced","hours":10,"reason":"Real-world security practice","recommended":True},
        ],
        "Cloud DevOps Engineer": [
            {"id":"p9","title":"Deploy App on AWS ECS","skills":["Docker","AWS","CI/CD"],"difficulty":"Intermediate","hours":7,"reason":"Real cloud deployment experience","recommended":True},
            {"id":"p10","title":"Terraform IaC Setup","skills":["Terraform","Cloud Architecture","AWS"],"difficulty":"Advanced","hours":9,"reason":"Infrastructure as code","recommended":False},
        ],
    }
    projects = PROJECTS_MAP.get(goal, PROJECTS_MAP.get("AI Engineer", []))

    return {
        "name":            user_row["name"],
        "goal":            goal,
        "experience":      user_row["experience"],
        "readiness":       readiness,
        "readinessDelta":  0,
        "skills":          skills,
        "roadmap":         roadmap,
        "weeklyStats":     {"skillsImproved": 0, "lessonsCompleted": 0, "projectsDone": 0, "hoursLearned": 0},
        "evidenceOfMastery": evidence,
        "decayAlerts":     decay_alerts,
        "falseMastery":    false_mastery,
        "nextAction": {
            "type":          "assessment",
            "title":         f"{action_skill} Assessment" if action_skill else "Take a Quiz",
            "duration":      "15-20 min",
            "reason":        f"Your {action_skill} mastery is {round(current_mastery.get(action_skill, 0) * 100)}% — improving it will unlock the next phase." if action_skill else "Complete an assessment to calibrate your profile.",
            "skill":         action_skill,
            "targetMastery": required.get(action_skill, 0.7) if action_skill else 0.7,
        },
        "adaptationHistory": adaptations,
        "projects":        projects,
        "chatHistory":     chat_history,
        "whatIfResult":    None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/register")
def register(req: RegisterReq):
    existing = db.get_user(DB_PATH, req.username.lower())
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken.")

    # Analyze goal text
    profile = analyze_goal(req.goal_text, f"{DATA}/skills.csv")
    goal    = profile["goal"]
    if goal == "Unspecified" or goal not in ALL_GOALS:
        goal = ALL_GOALS[0]

    db.create_user(DB_PATH, req.username.lower(), _hash(req.password), req.name, goal, req.experience)

    # Seed skills from profile
    required = goal_required_skills(roles_df, goal)
    base     = {"beginner": 0.2, "intermediate": 0.4, "advanced": 0.65}.get(req.experience, 0.3)
    for skill in required:
        mastery = profile["skills"].get(skill, base)
        db.upsert_skill(DB_PATH, req.username.lower(), skill, mastery, mastery)

    user_row = {"name": req.name, "goal": goal, "experience": req.experience}
    state    = _build_learner_state(req.username.lower(), user_row)
    return {"token": req.username.lower(), "learner": state}


@app.post("/api/login")
def login(req: LoginReq):
    user = db.get_user(DB_PATH, req.username.lower())
    if not user:
        raise HTTPException(status_code=401, detail="Username not found.")
    if user.get("password_hash") != _hash(req.password):
        raise HTTPException(status_code=401, detail="Incorrect password.")
    state = _build_learner_state(req.username.lower(), user)
    return {"token": req.username.lower(), "learner": state}


@app.get("/api/me")
def get_me(user_id: str = Depends(get_user_id)):
    user = db.get_user(DB_PATH, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return _build_learner_state(user_id, user)


# ─────────────────────────────────────────────────────────────────────────────
# STATIC DATA
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/goals")
def get_goals():
    return {"goals": ALL_GOALS}

@app.get("/api/skills")
def get_skills():
    return skills_df.to_dict(orient="records")

@app.get("/api/quiz")
def get_quiz(skill: str):
    questions = QUIZ_BANK.get(skill, [])
    if not questions:
        raise HTTPException(status_code=404, detail=f"No quiz found for skill: {skill}")
    return questions

@app.get("/api/quiz/skills")
def get_quiz_skills():
    return {"skills": list(QUIZ_BANK.keys())}


# ─────────────────────────────────────────────────────────────────────────────
# GOAL ANALYSIS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/analyze-goal")
def api_analyze_goal(req: AnalyzeGoalReq, user_id: str = Depends(get_user_id)):
    profile = analyze_goal(req.text, f"{DATA}/skills.csv")
    if profile["goal"] not in ALL_GOALS:
        profile["goal"] = ALL_GOALS[0]

    # Update DB
    user = db.get_user(DB_PATH, user_id)
    if user:
        db.upsert_user(DB_PATH, user_id, user["name"], profile["goal"], profile["experience"])
        required = goal_required_skills(roles_df, profile["goal"])
        for skill in required:
            mastery = profile["skills"].get(skill, 0.2)
            db.upsert_skill(DB_PATH, user_id, skill, mastery, mastery)

    # Return new full state
    user = db.get_user(DB_PATH, user_id)
    return _build_learner_state(user_id, user)


# ─────────────────────────────────────────────────────────────────────────────
# ROADMAP
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/roadmap")
def get_roadmap_api(user_id: str = Depends(get_user_id)):
    user = db.get_user(DB_PATH, user_id)
    if not user:
        raise HTTPException(404)
    goal     = user["goal"]
    required = goal_required_skills(roles_df, goal)
    current  = db.get_learner_skills(DB_PATH, user_id)
    topo     = topo_order(G, list(required.keys()))
    return {"goal": goal, "topo_order": topo, "required": required, "current": current}


# ─────────────────────────────────────────────────────────────────────────────
# RECOMMENDATIONS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/recommendations")
def get_recommendations(user_id: str = Depends(get_user_id)):
    user     = db.get_user(DB_PATH, user_id)
    if not user:
        raise HTTPException(404)
    required = goal_required_skills(roles_df, user["goal"])
    current  = db.get_learner_skills(DB_PATH, user_id)
    gaps     = compute_gaps(current, required)
    ranked   = recommend(courses_df, gaps, current, user["goal"], top_k=8)
    return ranked.to_dict(orient="records")


# ─────────────────────────────────────────────────────────────────────────────
# QUIZ SUBMIT (BKT + calibration + SM-2 + adaptation)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/quiz/submit")
def submit_quiz(req: QuizSubmitReq, user_id: str = Depends(get_user_id)):
    user     = db.get_user(DB_PATH, user_id)
    if not user:
        raise HTTPException(404)
    required = goal_required_skills(roles_df, user["goal"])
    current  = db.get_learner_skills(DB_PATH, user_id)

    self_reported = current.get(req.skill, 0.5)
    bkt           = BKTEngine()
    demonstrated  = bkt.update_from_quiz(req.skill, self_reported, req.answers_correct)

    # Persist updated mastery
    db.upsert_skill(DB_PATH, user_id, req.skill, self_reported, demonstrated)

    # Record individual answers
    for i, correct in enumerate(req.answers_correct):
        db.record_quiz_answer(DB_PATH, user_id, req.skill, f"q{i}", correct, req.confidence)

    # False mastery
    mismatch = detect_false_mastery(self_reported, demonstrated)

    # Calibration
    quiz_answers = [
        QuizAnswer(f"q{i}", c, req.confidence) for i, c in enumerate(req.answers_correct)
    ]
    calib = calibration_report(quiz_answers)

    # SM-2 spaced repetition
    sched    = db.get_review_schedule(DB_PATH, user_id)
    existing = sched.get(req.skill)
    if existing:
        state = ReviewState(
            skill=req.skill,
            repetitions=existing["repetitions"],
            ease_factor=existing["ease_factor"],
            interval_days=existing["interval_days"],
            next_review=datetime.strptime(existing["next_review"], "%Y-%m-%d").date()
                        if isinstance(existing["next_review"], str) else existing["next_review"],
        )
    else:
        state = ReviewState(skill=req.skill)

    score   = sum(req.answers_correct) / max(len(req.answers_correct), 1)
    quality = min(5, round(score * 5))
    state   = sm2_update(state, quality)
    db.upsert_review_schedule(
        DB_PATH, user_id, req.skill,
        state.repetitions, state.ease_factor,
        state.interval_days, str(state.next_review)
    )

    # Adaptation
    adapted = False
    gap     = self_reported - demonstrated
    if score < 0.6 and gap >= 0.15:
        adapted = True
        TEMPLATES = {
            "Machine Learning": {
                "before": ["ML Fundamentals", "Deep Learning", "PyTorch"],
                "after":  ["ML Fundamentals", "ML Revision", "Feature Engineering Practice", "ML Reassessment", "Deep Learning", "PyTorch"],
                "reason": f"Your demonstrated ML proficiency ({round(demonstrated*100)}%) was below the 70% prerequisite threshold. A targeted revision module has been inserted.",
            },
            "Statistics": {
                "before": ["Statistics", "Machine Learning", "Deep Learning"],
                "after":  ["Statistics Revision", "Statistics Reassessment", "Machine Learning", "Deep Learning"],
                "reason": f"Quiz results indicate fragile Statistics knowledge ({round(demonstrated*100)}%). A revision cycle has been inserted.",
            },
        }
        tpl = TEMPLATES.get(req.skill, {
            "before": [req.skill, "Next Phase"],
            "after":  [f"{req.skill} Revision", f"{req.skill} Reassessment", "Next Phase"],
            "reason": f"Demonstrated {req.skill} score ({round(demonstrated*100)}%) was significantly lower than self-reported ({round(self_reported*100)}%). A corrective revision block has been added.",
        })
        trigger = f"{req.skill} quiz — score {round(score*100)}%, BKT mastery {round(demonstrated*100)}%"
        db.add_adaptation(DB_PATH, user_id, trigger, tpl["before"], tpl["after"], tpl["reason"])

    # Return fresh full learner state
    new_state = _build_learner_state(user_id, user)

    return {
        "skill":        req.skill,
        "self_reported": self_reported,
        "demonstrated": demonstrated,
        "score":        f"{sum(req.answers_correct)}/{len(req.answers_correct)}",
        "mismatch":     mismatch,
        "calib":        calib,
        "adapted":      adapted,
        "next_review":  str(state.next_review),
        "learner":      new_state,
    }


# ─────────────────────────────────────────────────────────────────────────────
# WHAT-IF
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/whatif")
def whatif_api(req: WhatIfReq, user_id: str = Depends(get_user_id)):
    user     = db.get_user(DB_PATH, user_id)
    if not user:
        raise HTTPException(404)
    required = goal_required_skills(roles_df, user["goal"])
    current  = db.get_learner_skills(DB_PATH, user_id)
    results  = what_if(current, required, req.candidate_skills)
    return {"projections": results}


# ─────────────────────────────────────────────────────────────────────────────
# REVIEW QUEUE
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/review-queue")
def review_queue(user_id: str = Depends(get_user_id)):
    sched = db.get_review_schedule(DB_PATH, user_id)
    states = {}
    for skill, row in sched.items():
        nxt = datetime.strptime(row["next_review"], "%Y-%m-%d").date() \
              if isinstance(row["next_review"], str) else row["next_review"]
        states[skill] = ReviewState(
            skill=skill,
            repetitions=row["repetitions"],
            ease_factor=row["ease_factor"],
            interval_days=row["interval_days"],
            next_review=nxt,
        )
    queue = build_review_queue(states, today=date.today())
    details = {s: {"next_review": str(states[s].next_review), "interval_days": states[s].interval_days}
               for s in {**{s: None for s in queue["due_now"]}, **{s: None for s in queue["upcoming"]}}}
    return {"due_now": queue["due_now"], "upcoming": queue["upcoming"], "details": details}


# ─────────────────────────────────────────────────────────────────────────────
# CHAT (context-aware Groq LLM or rule-based fallback)
# ─────────────────────────────────────────────────────────────────────────────

def _rule_based_reply(message: str, state: dict) -> tuple[str, Optional[dict]]:
    msg   = message.lower()
    goal  = state.get("goal", "your goal")
    name  = state.get("name", "")
    skills= {s["name"]: s for s in state.get("skills", [])}
    gaps  = [(s["name"], round((s["required"] - s["mastery"]) * 100))
             for s in state.get("skills", []) if s["required"] > s["mastery"]]
    gaps.sort(key=lambda x: -x[1])

    if any(w in msg for w in ["deep learning", "locked", "block", "unlock", "can't start", "cannot"]):
        ml = skills.get("Machine Learning", {})
        ml_m = round(ml.get("mastery", 0) * 100)
        ml_r = round(ml.get("required", 0.8) * 100)
        return (
            f"Your Deep Learning module is currently locked because your Machine Learning mastery is {ml_m}%.\n\n"
            f"You need {ml_r}% mastery in Machine Learning to unlock it.\n\n"
            f"I recommend taking the Machine Learning assessment to update your mastery score.",
            {"label": "Take Assessment", "path": "/assess"}
        )

    if any(w in msg for w in ["ready", "readiness", "progress", "how am i"]):
        r = state.get("readiness", 0)
        top3 = "\n".join(f"  • {s} — gap: {g}%" for s, g in gaps[:3]) if gaps else "  All skills are on track!"
        return (
            f"Your current career readiness for **{goal}** is **{r}%**.\n\nTop bottlenecks:\n{top3}",
            {"label": "View Roadmap", "path": "/roadmap"}
        )

    if any(w in msg for w in ["next", "what should", "do now", "recommend"]):
        na = state.get("nextAction", {})
        return (
            f"Your next best action is:\n\n⚡ **{na.get('title', 'Take a quiz')}** ({na.get('duration', '~15 min')})\n\n{na.get('reason', '')}",
            {"label": "Start Now", "path": "/next-action"}
        )

    if any(w in msg for w in ["decay", "forget", "retention", "review"]):
        alerts = state.get("decayAlerts", [])
        if alerts:
            lines = "\n".join(f"  • {a['skill']} — {a['daysSince']} days, retention {a['retention']}%" for a in alerts)
            return (f"Your knowledge decay status:\n\n{lines}\n\nSchedule a quick revision to reset the decay timer.", {"label": "View Twin", "path": "/twin"})
        return ("No knowledge decay detected — you're up to date!", None)

    if any(w in msg for w in ["project", "build", "practice"]):
        return (
            "Projects are the fastest path to mastery. Check your Project Lab for skill-targeted recommendations based on your current gaps.",
            {"label": "Project Lab", "path": "/projects"}
        )

    if any(w in msg for w in ["goal", "path", "roadmap", "phase"]):
        stages = state.get("roadmap", [])
        summary = "\n".join(f"  Phase {s['phase']}: {s['title']} — {s['progress']}% {'🔒' if s['status']=='locked' else ''}" for s in stages)
        return (f"Your roadmap for **{goal}**:\n\n{summary}", {"label": "View Roadmap", "path": "/roadmap"})

    return (
        f"I'm your Learning Copilot — I have full context of your {goal} journey.\n\nTry asking:\n• \"Why can't I start Deep Learning?\"\n• \"What should I do right now?\"\n• \"Which skills are decaying?\"\n• \"Show me my roadmap\"",
        None
    )


@app.post("/api/chat")
def chat(req: ChatReq, user_id: str = Depends(get_user_id)):
    user  = db.get_user(DB_PATH, user_id)
    if not user:
        raise HTTPException(404)
    state = _build_learner_state(user_id, user)

    # Save user message
    db.add_chat_message(DB_PATH, user_id, "user", req.message)

    # Try Groq LLM first
    groq_key = os.environ.get("GROQ_API_KEY")
    reply_text, action = None, None

    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            context_summary = (
                f"Learner: {user['name']}, Goal: {user['goal']}, Readiness: {state['readiness']}%\n"
                f"Top skill gaps: {', '.join(f'{s} ({round((r-m)*100)}%)' for s,r,m in [(s['name'],s['required'],s['mastery']) for s in state['skills'] if s['required']>s['mastery']][:4])}\n"
                f"Next action: {state['nextAction']['title']}"
            )
            resp = client.chat.completions.create(
                model="llama3-8b-8192",
                max_tokens=300,
                messages=[
                    {"role": "system", "content": f"You are SkillPilot, a context-aware learning copilot. Learner context: {context_summary}. Give concise, actionable advice (max 3 paragraphs). Do not make up courses or skills not in the learner profile."},
                    {"role": "user", "content": req.message},
                ],
            )
            reply_text = resp.choices[0].message.content.strip()
        except Exception:
            pass

    if not reply_text:
        reply_text, action = _rule_based_reply(req.message, state)

    # Save assistant message
    db.add_chat_message(
        DB_PATH, user_id, "assistant", reply_text,
        action.get("label") if action else None,
        action.get("path")  if action else None,
    )

    return {"reply": reply_text, "action": action}


# ─────────────────────────────────────────────────────────────────────────────
# PROJECTS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/projects/complete")
def complete_project(req: CompleteProjectReq, user_id: str = Depends(get_user_id)):
    db.complete_project(DB_PATH, user_id, req.project_id)
    return {"status": "ok"}

@app.get("/api/projects/completed")
def get_completed(user_id: str = Depends(get_user_id)):
    return {"completed": db.get_completed_projects(DB_PATH, user_id)}


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
