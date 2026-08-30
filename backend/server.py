import os
import sys
import json
import math
from datetime import date, datetime, timedelta
from flask import Flask, jsonify, request, session
import hashlib

# Resolve imports from personalized-learning/
_HERE = os.path.dirname(os.path.abspath(__file__))
_PL = os.path.join(_HERE, "personalized-learning")
if _PL not in sys.path:
    sys.path.insert(0, _PL)

from dotenv import load_dotenv
load_dotenv(os.path.join(_PL, ".env"))

import pandas as pd
import networkx as nx

from engine.goal_analyzer import analyze_goal
from engine.graph import build_graph, multi_goal_merge, goal_required_skills, topo_order
from engine.skill_gap import compute_gaps, readiness_score
from engine.recommender import recommend
from engine.adaptive import BKTEngine, detect_false_mastery
from engine.calibration import QuizAnswer, calibration_report
from engine.whatif import what_if
from engine.spaced_repetition import ReviewState, sm2_update, build_review_queue
from database import db

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "skillpilot_secret_key_991823")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

DATA = os.path.join(_PL, "data")
DB_PATH = os.path.join(_PL, "database", "learning.db")
USER_ID = "streamlit_user"  # Shared user ID with Streamlit app

db.init_db(DB_PATH)

# Load data files
skills_df = pd.read_csv(f"{DATA}/skills.csv")
roles_df = pd.read_csv(f"{DATA}/roles.csv")
courses_df = pd.read_csv(f"{DATA}/courses.csv")
with open(f"{DATA}/quiz_bank.json") as f:
    quiz_bank = json.load(f)
G = build_graph(f"{DATA}/prerequisites.csv")

# Seeding values close to the MOCK_LEARNER state if DB is fresh
def seed_database():
    user = db.get_user(DB_PATH, USER_ID)
    if not user:
        db.upsert_user(DB_PATH, USER_ID, "Priyadharshini", "AI Engineer", "intermediate")
        
        # Initial skills
        initial_skills = [
            ("Python", 0.92, None),
            ("NumPy", 0.85, None),
            ("Pandas", 0.78, None),
            ("Statistics", 0.42, None),
            ("Machine Learning", 0.85, 0.61),
            ("Feature Engineering", 0.43, None),
            ("Deep Learning", 0.24, None),
            ("PyTorch", 0.10, None),
            ("MLOps", 0.12, None),
            ("Docker", 0.05, None),
            ("NLP", 0.05, None),
            ("LLM", 0.05, None),
            ("RAG", 0.05, None)
        ]
        for skill, self_rep, bkt in initial_skills:
            db.upsert_skill(DB_PATH, USER_ID, skill, self_rep, bkt)
            
        # Initial spaced repetition schedule
        today = date.today()
        # Statistics: 31 days since review, 16 days interval (so it's overdue)
        db.upsert_review_schedule(
            DB_PATH, USER_ID, "Statistics", 
            repetitions=2, ease_factor=2.1, interval_days=16,
            next_review=(today - timedelta(days=15)).isoformat()
        )
        
        # PyTorch: 90 days since review, 30 days interval (extremely overdue)
        db.upsert_review_schedule(
            DB_PATH, USER_ID, "PyTorch", 
            repetitions=1, ease_factor=1.8, interval_days=30,
            next_review=(today - timedelta(days=60)).isoformat()
        )
        
        # MLOps: 60 days since review, 20 days interval (overdue)
        db.upsert_review_schedule(
            DB_PATH, USER_ID, "MLOps", 
            repetitions=1, ease_factor=1.9, interval_days=20,
            next_review=(today - timedelta(days=40)).isoformat()
        )
        
        # Default chat messages
        db.add_chat_message(
            DB_PATH, USER_ID, "assistant",
            "Hi Priyadharshini! I'm your Learning Copilot. I have full context of your skill profile and roadmap. Ask me anything — why a skill is locked, what to study next, or how to hit your goal faster."
        )
        
        # Default adaptations
        db.add_adaptation(
            DB_PATH, USER_ID, "Quiz score 42%",
            ["ML Fundamentals", "Deep Learning", "PyTorch"],
            ["ML Fundamentals", "ML Revision", "Feature Engineering Practice", "ML Reassessment", "Deep Learning"],
            "Demonstrated ML proficiency was below the prerequisite threshold for Deep Learning."
        )

seed_database()

ROADMAP_TEMPLATES = {
    "AI Engineer": [
        {"phase": "01", "title": "Foundation", "skills": ["Python", "NumPy", "Pandas", "Statistics"]},
        {"phase": "02", "title": "Machine Learning", "skills": ["Machine Learning", "Feature Engineering"]},
        {"phase": "03", "title": "Deep Learning", "skills": ["Deep Learning", "PyTorch"]},
        {"phase": "04", "title": "Generative AI", "skills": ["NLP", "LLM", "RAG"]},
        {"phase": "05", "title": "MLOps & Deployment", "skills": ["MLOps", "Docker"]}
    ],
    "Data Scientist": [
        {"phase": "01", "title": "Foundation", "skills": ["Python", "NumPy", "Pandas", "Statistics"]},
        {"phase": "02", "title": "Data Analysis", "skills": ["SQL", "Data Visualization"]},
        {"phase": "03", "title": "Machine Learning", "skills": ["Machine Learning", "Feature Engineering"]}
    ],
    "Full Stack Developer": [
        {"phase": "01", "title": "Programming Foundation", "skills": ["Python"]},
        {"phase": "02", "title": "Frontend Basics", "skills": ["HTML", "CSS", "JavaScript"]},
        {"phase": "03", "title": "Frontend Frameworks", "skills": ["React"]},
        {"phase": "04", "title": "Backend & APIs", "skills": ["Node.js", "REST APIs"]},
        {"phase": "05", "title": "Databases", "skills": ["Databases"]}
    ],
    "Cybersecurity Specialist": [
        {"phase": "01", "title": "Security Foundation", "skills": ["Cryptography", "Network Security"]},
        {"phase": "02", "title": "Operations & Defense", "skills": ["Security Engineering", "SOC"]},
        {"phase": "03", "title": "Advanced Security", "skills": ["Application Security", "Cloud Security"]},
        {"phase": "04", "title": "Offensive Operations", "skills": ["Ethical Hacking", "Penetration Testing"]}
    ],
    "Cloud DevOps Engineer": [
        {"phase": "01", "title": "Infrastructure Core", "skills": ["Python", "Docker"]},
        {"phase": "02", "title": "Orchestration & Cloud", "skills": ["Kubernetes", "AWS"]},
        {"phase": "03", "title": "Automation & IaC", "skills": ["Terraform", "DevOps"]},
        {"phase": "04", "title": "Deployment Pipeline", "skills": ["CI/CD", "Cloud Architecture"]}
    ],
    "UI/UX Designer": [
        {"phase": "01", "title": "UX Foundations", "skills": ["User Research", "Wireframing"]},
        {"phase": "02", "title": "Interface Design", "skills": ["Figma", "UI/UX Design"]},
        {"phase": "03", "title": "Production Systems", "skills": ["Product Design", "Design Systems"]}
    ],
    "Product Manager": [
        {"phase": "01", "title": "Product Discovery", "skills": ["User Research", "Agile/Scrum"]},
        {"phase": "02", "title": "Product Strategy", "skills": ["Product Management", "Business Strategy"]},
        {"phase": "03", "title": "Program Leadership", "skills": ["Project Management"]}
    ],
    "Blockchain Engineer": [
        {"phase": "01", "title": "Core Ledger Foundations", "skills": ["Cryptography", "Blockchain"]},
        {"phase": "02", "title": "Decentralized Protocols", "skills": ["Web3", "Solidity"]},
        {"phase": "03", "title": "Integration", "skills": ["Smart Contracts"]}
    ]
}

def get_learner_data(user_id):
    user = db.get_user(DB_PATH, user_id)
    if not user:
        return None
        
    goal = user["goal"]
    experience = user["experience"]
    name = user["name"]
    
    # Get required skills for goal
    required = goal_required_skills(roles_df, goal)
    
    # Get current mastery
    current_skills_db = db.get_learner_skills_full(DB_PATH, user_id)
    current_mastery = {s["skill"]: (s["bkt_mastery"] if s["bkt_mastery"] is not None else s["self_reported"]) for s in current_skills_db}
    
    # Ensure all required skills are present in current_mastery
    for s in required:
        if s not in current_mastery:
            current_mastery[s] = 0.0
            
    # Calculate readiness score
    readiness = int(readiness_score(current_mastery, required))
    
    # Format skills for frontend
    skills_list = []
    # We want to display all skills related to the goal
    all_known_skills = list(required.keys())
    for s in current_mastery.keys():
        if s not in all_known_skills:
            all_known_skills.append(s)
            
    for s in all_known_skills:
        mastery_val = current_mastery.get(s, 0.0)
        req_val = required.get(s, 0.0)
        
        # Calculate days since last practiced
        days_since = 30 # default
        skill_db_row = next((x for x in current_skills_db if x["skill"] == s), None)
        if skill_db_row:
            updated_at_str = skill_db_row["updated_at"]
            try:
                updated_date = datetime.strptime(updated_at_str, "%Y-%m-%d %H:%M:%S").date()
                days_since = (date.today() - updated_date).days
            except Exception:
                pass
        
        skills_list.append({
            "name": s,
            "mastery": round(mastery_val, 2),
            "required": round(req_val, 2),
            "lastPracticed": max(1, days_since)
        })
        
    # Sort skills so required ones are on top
    skills_list.sort(key=lambda x: (-x["required"], -x["mastery"]))
    
    # Compute gaps
    gaps = compute_gaps(current_mastery, required)
    
    # Get review schedule
    reviews = db.get_review_schedule(DB_PATH, user_id)
    decay_alerts = []
    today = date.today()
    for s, rev in reviews.items():
        next_review_date = datetime.strptime(rev["next_review"], "%Y-%m-%d").date()
        if next_review_date < today:
            # It's overdue for review
            interval = max(1, rev["interval_days"])
            # Let's say last practiced was interval + days overdue ago
            days_overdue = (today - next_review_date).days
            days_since = interval + days_overdue
            
            # Retention formula (exponential decay)
            retention = max(15, min(95, int(100 * math.exp(-days_since / (interval * 3.0)))))
            
            decay_alerts.append({
                "skill": s,
                "daysSince": days_since,
                "retention": retention
            })
    decay_alerts.sort(key=lambda x: x["retention"])
    
    # Compute false mastery
    false_mastery = []
    for s in current_skills_db:
        if s["bkt_mastery"] is not None:
            mismatch = detect_false_mastery(s["self_reported"], s["bkt_mastery"])
            if mismatch["flagged"]:
                false_mastery.append({
                    "skill": s["skill"],
                    "selfReported": s["self_reported"],
                    "demonstrated": s["bkt_mastery"]
                })
                
    # Build roadmap phases
    if goal in ROADMAP_TEMPLATES:
        template = ROADMAP_TEMPLATES[goal]
    else:
        ordered_skills = topo_order(G, list(required.keys()))
        if not ordered_skills:
            template = ROADMAP_TEMPLATES["AI Engineer"]
        else:
            num_skills = len(ordered_skills)
            num_phases = min(5, max(1, math.ceil(num_skills / 3)))
            skills_per_phase = math.ceil(num_skills / num_phases)
            
            template = []
            phase_titles = ["Foundation", "Core Concepts", "Intermediate Practice", "Advanced Topics", "Capstone & Specialization"]
            for i in range(num_phases):
                start_idx = i * skills_per_phase
                end_idx = min(num_skills, start_idx + skills_per_phase)
                phase_skills = ordered_skills[start_idx:end_idx]
                if phase_skills:
                    template.append({
                        "phase": f"0{i+1}",
                        "title": phase_titles[i] if i < len(phase_titles) else f"Phase {i+1}",
                        "skills": phase_skills
                    })
    roadmap_phases = []
    
    for idx, t in enumerate(template):
        phase_skills = t["skills"]
        # Calculate progress in this phase
        ratios = []
        for s in phase_skills:
            req_lvl = required.get(s, 0.5)
            mst_lvl = current_mastery.get(s, 0.0)
            ratios.append(min(mst_lvl / req_lvl, 1.0) if req_lvl > 0 else 1.0)
        progress = int(100 * sum(ratios) / len(phase_skills)) if phase_skills else 100
        
        # Check status and lock logic
        # A phase is locked if any skill in a PREVIOUS phase is not completed
        # but let's do a prerequisite based locking:
        # If any prerequisite of any skill in this phase is NOT completed (mastery < required)
        is_locked = False
        lock_reason = ""
        for s in phase_skills:
            ancestors = nx.ancestors(G, s) if s in G else set()
            # filter ancestors to only those required by this goal
            req_ancestors = ancestors & set(required.keys())
            for anc in req_ancestors:
                if current_mastery.get(anc, 0.0) < required.get(anc, 0.0):
                    is_locked = True
                    lock_reason = f"{anc} ≥ {int(required[anc]*100)}% required"
                    break
            if is_locked:
                break
                
        status = "locked" if is_locked else ("completed" if progress == 100 else "in_progress")
        
        # In our demo, Machine Learning requires assessment
        assessment_required = False
        if t["title"] == "Machine Learning" and status == "in_progress" and current_mastery.get("Machine Learning", 0.0) < 0.70:
            assessment_required = True
            
        roadmap_phases.append({
            "id": idx + 1,
            "phase": t["phase"],
            "title": t["title"],
            "skills": phase_skills,
            "progress": progress,
            "status": status,
            "assessmentRequired": assessment_required,
            "lockReason": lock_reason
        })
        
    # Recommended projects
    # We load all project-type resources from courses.csv
    proj_rows = courses_df[courses_df["resource_type"] == "project"]
    projects_list = []
    
    # Get completed projects from database
    completed_ids = db.get_completed_projects(DB_PATH, user_id)
    completed_set = set()
    for cid in completed_ids:
        try:
            completed_set.add(int(cid))
        except ValueError:
            completed_set.add(cid)

    # We want to recommend projects that match the top skill gaps
    gap_skills = [g[0] for g in gaps]
    for _, r in proj_rows.iterrows():
        p_id = int(r["course_id"][1:])
        p_skill = r["skill"]
        is_rec = False
        reason = f"Covers {p_skill} gap."
        
        # If this project covers one of our top 2 gaps, recommend it
        if gap_skills and p_skill in gap_skills[:2]:
            is_rec = True
            reason = f"Strengthens your weakest {p_skill} skills."
            
        # Parse skills (in this simple CSV, we only have one skill per course,
        # but let's enrich it to look like the mockup)
        project_skills = [p_skill]
        if p_skill == "Machine Learning":
            project_skills = ["ML", "Pandas", "Feature Engineering"]
        elif p_skill == "RAG":
            project_skills = ["LLM", "RAG", "Python"]
        elif p_skill == "MLOps":
            project_skills = ["FastAPI", "Docker", "MLOps"]
            
        projects_list.append({
            "id": p_id,
            "title": r["title"],
            "skills": project_skills,
            "difficulty": r["difficulty"].capitalize(),
            "hours": 10 if r["difficulty"] == "hard" else (6 if r["difficulty"] == "medium" else 4),
            "reason": reason,
            "recommended": is_rec,
            "completed": p_id in completed_set
        })
        
    # If the user has completed at least one project, recommend more projects!
    ADDITIONAL_PROJECT_POOL = [
        {"id": 101, "title": "Dockerized Microservice Deployment", "skill": "Docker", "difficulty": "Medium", "hours": 6, "skills": ["Docker", "Python"], "reason": "Deploy and test REST APIs inside docker containers."},
        {"id": 102, "title": "Time Series Forecasting of Traffic Flow", "skill": "Machine Learning", "difficulty": "Hard", "hours": 12, "skills": ["Machine Learning", "Pandas", "Statistics"], "reason": "Model smart traffic patterns and forecast congestion points."},
        {"id": 103, "title": "LLM Agent with Web Tool Calling", "skill": "LLM", "difficulty": "Hard", "hours": 10, "skills": ["LLM", "Python", "REST APIs"], "reason": "Build agents capable of interfacing with online data feeds."},
        {"id": 104, "title": "React Interactive Skill Twin Dashboard", "skill": "React", "difficulty": "Medium", "hours": 8, "skills": ["React", "CSS", "JavaScript"], "reason": "Build highly responsive data dashboards."},
        {"id": 105, "title": "RESTful CRUD Backend Service", "skill": "REST APIs", "difficulty": "Easy", "hours": 4, "skills": ["REST APIs", "Python"], "reason": "Implement scalable CRUD endpoints using Flask/FastAPI."},
        {"id": 106, "title": "Distributed Database Cluster Management", "skill": "Databases", "difficulty": "Hard", "hours": 14, "skills": ["Databases", "Docker"], "reason": "Optimize replica sets and shardings for database scaling."},
        {"id": 107, "title": "Spaced Repetition Review Engine", "skill": "Python", "difficulty": "Easy", "hours": 5, "skills": ["Python"], "reason": "Implement SM-2 scheduling algorithm from scratch."},
        {"id": 108, "title": "Deep Transfer Learning Image Classifier", "skill": "Deep Learning", "difficulty": "Hard", "hours": 11, "skills": ["Deep Learning", "PyTorch", "Python"], "reason": "Train vision models using PyTorch libraries."}
    ]

    # Dynamically append additional projects if any project is completed
    if len(completed_set) > 0:
        for p in ADDITIONAL_PROJECT_POOL:
            p_id = p["id"]
            p_skill = p["skill"]
            # Recommend projects relevant to user goals
            if p_skill in required:
                is_rec = False
                reason = p["reason"]
                if gap_skills and p_skill in gap_skills[:2]:
                    is_rec = True
                    reason = f"Targeted: {p['reason']}"
                
                projects_list.append({
                    "id": p_id,
                    "title": p["title"],
                    "skills": p["skills"],
                    "difficulty": p["difficulty"],
                    "hours": p["hours"],
                    "reason": reason,
                    "recommended": is_rec,
                    "completed": p_id in completed_set
                })

    # Sort projects: recommended first, completed last
    projects_list.sort(key=lambda x: (1 if x["completed"] else 0, -1 if x["recommended"] else 0))
    
    # Determine Next Best Action
    next_action = {
        "type": "study",
        "title": "Study Python Basics",
        "duration": "15 min",
        "reason": "Start building your programming foundations.",
        "skill": "Python",
        "targetMastery": 0.80
    }
    
    # Action selection logic:
    # 1. If we have a false mastery flag:
    if false_mastery:
        fm_skill = false_mastery[0]["skill"]
        req_lvl = required.get(fm_skill, 0.70)
        next_action = {
            "type": "assessment",
            "title": f"{fm_skill} Assessment",
            "duration": "18 min",
            "reason": f"Your {fm_skill} mastery is {int(current_mastery.get(fm_skill, 0.0)*100)}% and blocking deep progress. Complete a quick test to recalibrate.",
            "skill": fm_skill,
            "targetMastery": req_lvl
        }
    # 2. If a skill has high decay (low retention):
    elif decay_alerts:
        dec_skill = decay_alerts[0]["skill"]
        next_action = {
            "type": "practice",
            "title": f"Review {dec_skill}",
            "duration": "10 min",
            "reason": f"Your estimated retention for {dec_skill} is down to {decay_alerts[0]['retention']}% due to lack of practice. Let's fix that.",
            "skill": dec_skill,
            "targetMastery": required.get(dec_skill, 0.70)
        }
    # 3. Else, pick the first uncompleted required skill in topological order
    else:
        ordered_required = topo_order(G, list(required.keys()))
        target_skill = None
        for s in ordered_required:
            if current_mastery.get(s, 0.0) < required.get(s, 0.0):
                target_skill = s
                break
        if target_skill:
            req_lvl = required.get(target_skill, 0.70)
            next_action = {
                "type": "assessment",
                "title": f"{target_skill} Assessment" if current_mastery.get(target_skill, 0.0) > 0 else f"Study {target_skill}",
                "duration": "15 min",
                "reason": f"{target_skill} is next in your learning path. Completing this unlocks downstream skills.",
                "skill": target_skill,
                "targetMastery": req_lvl
            }
            
    # Evidence of Mastery weighted estimate
    completed_courses_count = sum(1 for s in current_skills_db if (s["bkt_mastery"] or s["self_reported"]) >= required.get(s["skill"], 0.70))
    total_required = len(required)
    course_evidence = int(100 * completed_courses_count / total_required) if total_required > 0 else 100
    
    # Average score on quizzes
    with db.get_conn(DB_PATH) as conn:
        q_row = conn.execute("SELECT AVG(correct) as avg_score FROM quiz_results WHERE user_id = ?", (user_id,)).fetchone()
        quiz_avg = int(q_row["avg_score"] * 100) if q_row["avg_score"] is not None else 72
        
    evidence_of_mastery = {
        "course": course_evidence,
        "quiz": quiz_avg,
        "coding": 68,  # simulated coding environment indicator
        "project": 80 if completed_courses_count > 4 else 60
    }
    
    # Chat History
    chat_history = db.get_chat_history(DB_PATH, user_id)
    
    # Adaptation History
    adaptation_history = db.get_adaptation_history(DB_PATH, user_id)
    
    return {
        "name": name,
        "goal": goal,
        "experience": experience,
        "readiness": readiness,
        "readinessDelta": 8,  # static indicator
        "skills": skills_list,
        "roadmap": roadmap_phases,
        "weeklyStats": {
            "skillsImproved": max(1, completed_courses_count),
            "lessonsCompleted": max(2, completed_courses_count * 2),
            "projectsDone": 1 if completed_courses_count > 5 else 0,
            "hoursLearned": round(completed_courses_count * 2.5 + 2.0, 1)
        },
        "evidenceOfMastery": evidence_of_mastery,
        "decayAlerts": decay_alerts,
        "falseMastery": false_mastery,
        "nextAction": next_action,
        "adaptationHistory": adaptation_history,
        "projects": projects_list,
        "chatHistory": chat_history,
        "whatIfResult": None
    }

# ---------------------------------------------------- API Endpoints -----------

@app.route("/api/auth/register", methods=["POST"])
def post_register():
    req_data = request.get_json()
    username = req_data.get("username", "").strip()
    password = req_data.get("password", "")
    name = req_data.get("name", "").strip()
    goal_text = req_data.get("goal_text", "").strip()
    experience = req_data.get("experience", "beginner")
    second_goal = req_data.get("second_goal", "None")
    
    if not username or not password or not name:
        return jsonify({"error": "Username, password, and name are required"}), 400
        
    existing = db.get_user(DB_PATH, username)
    if existing:
        return jsonify({"error": "Username already exists"}), 409
        
    password_hash = hash_password(password)
    
    # Run Goal Analyzer to extract starting skills and primary goal
    profile = analyze_goal(goal_text, f"{DATA}/skills.csv")
    goal = profile["goal"]
    if goal == "Unspecified":
        goal = "AI Engineer"
        
    experience = profile["experience"] or experience
    
    db.create_user(DB_PATH, username, password_hash, name, goal, experience)
    
    required = goal_required_skills(roles_df, goal)
    for s, level in required.items():
        start_level = 0.05
        if s in profile["skills"]:
            start_level = profile["skills"][s]
        db.upsert_skill(DB_PATH, username, s, start_level, None)
        
    if second_goal != "None" and second_goal in roles_df["role"].unique():
        merged_roadmap = multi_goal_merge(G, roles_df, [goal, second_goal])
        db.save_roadmap(DB_PATH, username, f"{goal} + {second_goal}", merged_roadmap)
    else:
        roadmap_skills = topo_order(G, list(required.keys()))
        db.save_roadmap(DB_PATH, username, goal, {"full_order": roadmap_skills})
        
    db.add_chat_message(
        DB_PATH, username, "assistant",
        f"Welcome {name}! I'm your Learning Copilot. I've analyzed your career aim and created a personalized roadmap for you to become a **{goal}**. Ask me anything to get started!"
    )
    
    session["user_id"] = username
    return jsonify(get_learner_data(username))

@app.route("/api/auth/login", methods=["POST"])
def post_login():
    req_data = request.get_json()
    username = req_data.get("username", "").strip()
    password = req_data.get("password", "")
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
        
    user = db.get_user(DB_PATH, username)
    if not user:
        return jsonify({"error": "Invalid username or password"}), 401
        
    password_hash = hash_password(password)
    if user["password_hash"] != password_hash:
        return jsonify({"error": "Invalid username or password"}), 401
        
    session["user_id"] = username
    return jsonify(get_learner_data(username))

@app.route("/api/auth/logout", methods=["POST"])
def post_logout():
    session.pop("user_id", None)
    return jsonify({"success": True})

@app.route("/api/learner", methods=["GET"])
def get_learner():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    data = get_learner_data(user_id)
    if not data:
        return jsonify({"error": "User not found"}), 404
    return jsonify(data)

@app.route("/api/goal/analyze", methods=["POST"])
def post_goal_analyze():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    req_data = request.get_json()
    goal_text = req_data.get("goal_text", "")
    second_goal = req_data.get("second_goal", "None")
    
    profile = analyze_goal(goal_text, f"{DATA}/skills.csv")
    goal = profile["goal"]
    if goal == "Unspecified":
        goal = "AI Engineer"
        
    experience = profile["experience"]
    
    user_row = db.get_user(DB_PATH, user_id)
    name = user_row["name"] if user_row else "Learner"
    
    db.upsert_user(DB_PATH, user_id, name, goal, experience)
    
    required = goal_required_skills(roles_df, goal)
    for s, level in required.items():
        start_level = 0.05
        if s in profile["skills"]:
            start_level = profile["skills"][s]
        db.upsert_skill(DB_PATH, user_id, s, start_level, None)
        
    if second_goal != "None" and second_goal in roles_df["role"].unique():
        merged_roadmap = multi_goal_merge(G, roles_df, [goal, second_goal])
        db.save_roadmap(DB_PATH, user_id, f"{goal} + {second_goal}", merged_roadmap)
    else:
        roadmap_skills = topo_order(G, list(required.keys()))
        db.save_roadmap(DB_PATH, user_id, goal, {"full_order": roadmap_skills})
        
    db.add_chat_message(
        DB_PATH, user_id, "assistant",
        f"I've updated your learning path to target **{goal}**! Your initial career readiness is calculated from your profile. Check the Learning Path to see the custom milestones I've configured for you."
    )
    
    return jsonify(get_learner_data(user_id))

@app.route("/api/quiz", methods=["GET"])
def get_quiz():
    skill = request.args.get("skill", "Machine Learning")
    questions = quiz_bank.get(skill, [])
    return jsonify(questions)

@app.route("/api/quiz/submit", methods=["POST"])
def post_quiz_submit():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    req_data = request.get_json()
    skill = req_data.get("skill")
    answers = req_data.get("answers")  # List of correctness (bool)
    confidence = req_data.get("confidence")  # int (1-5)
    
    current_skills_db = db.get_learner_skills_full(DB_PATH, user_id)
    skill_row = next((s for s in current_skills_db if s["skill"] == skill), None)
    self_reported = skill_row["self_reported"] if skill_row else 0.5
    
    # Run BKT logic
    bkt = BKTEngine()
    demonstrated = bkt.update_from_quiz(skill, self_reported, answers)
    
    # Record quiz answers in DB
    for idx, ans_correct in enumerate(answers):
        db.record_quiz_answer(DB_PATH, user_id, skill, f"q{idx}", ans_correct, confidence)
        
    # Update learner skills
    db.upsert_skill(DB_PATH, user_id, skill, self_reported, demonstrated)
    
    # Spaced repetition scheduling
    quality = sum(answers)  # Map 0-5 correct to quality scale
    review_state = ReviewState(skill=skill)
    # Check if there is an existing review schedule
    reviews_db = db.get_review_schedule(DB_PATH, user_id)
    if skill in reviews_db:
        r_db = reviews_db[skill]
        review_state.repetitions = r_db["repetitions"]
        review_state.ease_factor = r_db["ease_factor"]
        review_state.interval_days = r_db["interval_days"]
        
    updated_rev = sm2_update(review_state, quality)
    db.upsert_review_schedule(
        DB_PATH, user_id, skill,
        updated_rev.repetitions, updated_rev.ease_factor,
        updated_rev.interval_days, updated_rev.next_review.isoformat()
    )
    
    # Run Confidence Calibration
    quiz_answers = [QuizAnswer(f"q{i}", answers[i], confidence) for i in range(len(answers))]
    calib = calibration_report(quiz_answers)
    
    # Check for False Mastery Signal
    mismatch = detect_false_mastery(self_reported, demonstrated)
    
    # Check if we should trigger an Adaptation!
    triggered_adaptation = False
    if sum(answers) <= 2 or mismatch["flagged"]:
        # Trigger path adaptation dynamically based on the tested skill
        before = [f"{skill} Basics", "Advanced Milestones"]
        after = [f"{skill} Basics", f"{skill} Revision Module", f"{skill} Practice Lab", f"{skill} Reassessment", "Advanced Milestones"]
        reason = f"Your demonstrated {skill} proficiency ({int(demonstrated*100)}%) was below the target prerequisite threshold required for advancing."
        
        # Verify if adaptation already exists to prevent duplicate spamming
        existing_adaptations = db.get_adaptation_history(DB_PATH, user_id)
        trigger_name = f"Quiz score {int(sum(answers)/len(answers)*100)}% ({skill})"
        is_duplicate = any(a["trigger"] == trigger_name for a in existing_adaptations)
        if not is_duplicate:
            db.add_adaptation(DB_PATH, user_id, trigger_name, before, after, reason)
            triggered_adaptation = True
            
            # Append chat message from Copilot explaining the path change!
            db.add_chat_message(
                DB_PATH, user_id, "assistant",
                f"⚠️ **Path Adaptation Triggered**:\n\nBased on your quiz score on **{skill}** ({sum(answers)}/{len(answers)}), I have updated your learning path. I inserted a revision and practice module for {skill} to help you master the core concepts before you attempt advanced milestones."
            )
            
    # Compile result package
    result = {
        "skill": skill,
        "score": f"{sum(answers)}/{len(answers)}",
        "self_reported": self_reported,
        "demonstrated": demonstrated,
        "mismatch": mismatch,
        "calib": calib,
        "next_review": updated_rev.next_review.isoformat(),
        "adaptationTriggered": triggered_adaptation
    }
    
    return jsonify({
        "result": result,
        "learner": get_learner_data(user_id)
    })

@app.route("/api/whatif", methods=["POST"])
def post_whatif():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    req_data = request.get_json()
    hours_per_week = req_data.get("hoursPerWeek", 7)
    skip_skill = req_data.get("skipSkill", "")
    
    user = db.get_user(DB_PATH, user_id)
    goal = user["goal"] if user else "AI Engineer"
    required = goal_required_skills(roles_df, goal)
    
    current_skills_db = db.get_learner_skills_full(DB_PATH, user_id)
    current_mastery = {s["skill"]: (s["bkt_mastery"] if s["bkt_mastery"] is not None else s["self_reported"]) for s in current_skills_db}
    
    # Simulate: if skip, pretend mastery = required
    simulated_mastery = dict(current_mastery)
    if skip_skill:
        simulated_mastery[skip_skill] = required.get(skip_skill, 1.0)
        
    base_readiness = readiness_score(current_mastery, required)
    sim_readiness = readiness_score(simulated_mastery, required)
    
    # Time projection: base = ~14 weeks at 7h/week
    base_weeks = 14
    sim_weeks = max(1, math.ceil(base_weeks * (7.0 / max(hours_per_week, 1.0))))
    
    # If a skill was skipped, save time
    if skip_skill:
        sim_weeks = max(1, sim_weeks - 2)
        
    return jsonify({
        "baseReadiness": int(base_readiness),
        "simReadiness": int(sim_readiness),
        "baseWeeks": base_weeks,
        "simWeeks": sim_weeks,
        "weekDelta": sim_weeks - base_weeks,
        "readinessDelta": int(sim_readiness - base_readiness)
    })

@app.route("/api/projects/complete", methods=["POST"])
def post_projects_complete():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    req_data = request.get_json()
    project_id = req_data.get("project_id")
    if project_id is None:
        return jsonify({"error": "project_id is required"}), 400
        
    db.complete_project(DB_PATH, user_id, str(project_id))
    
    # Map project IDs to target skills to boost learner's mastery
    project_skill_map = {
        24: ["Machine Learning", "Feature Engineering", "Pandas"],
        25: ["RAG", "LLM", "Python"],
        101: ["Docker", "Python"],
        102: ["Machine Learning", "Pandas", "Statistics"],
        103: ["LLM", "Python", "REST APIs"],
        104: ["React", "CSS", "JavaScript"],
        105: ["REST APIs", "Python"],
        106: ["Databases", "Docker"],
        107: ["Python"],
        108: ["Deep Learning", "PyTorch", "Python"]
    }
    
    skills_to_boost = project_skill_map.get(int(project_id), [])
    
    # Boost each skill by +0.15 (up to max 1.0)
    current_skills_db = db.get_learner_skills_full(DB_PATH, user_id)
    for skill_name in skills_to_boost:
        skill_row = next((s for s in current_skills_db if s["skill"] == skill_name), None)
        self_reported = skill_row["self_reported"] if skill_row else 0.2
        bkt = skill_row["bkt_mastery"]
        if bkt is not None:
            new_bkt = min(1.0, bkt + 0.15)
            db.upsert_skill(DB_PATH, user_id, skill_name, self_reported, new_bkt)
        else:
            new_self = min(1.0, self_reported + 0.15)
            db.upsert_skill(DB_PATH, user_id, skill_name, new_self, None)
            
    return jsonify(get_learner_data(user_id))

@app.route("/api/learner/reset", methods=["POST"])
def post_learner_reset():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    with db.get_conn(DB_PATH) as conn:
        conn.execute("DELETE FROM learner_skills WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM quiz_results WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM review_schedule WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM roadmap WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM chat_history WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM adaptation_history WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM completed_projects WHERE user_id = ?", (user_id,))
        
    user_row = db.get_user(DB_PATH, user_id)
    if user_row:
        goal = user_row["goal"]
        required = goal_required_skills(roles_df, goal)
        for s in required:
            db.upsert_skill(DB_PATH, user_id, s, 0.05, None)
            
        db.add_chat_message(
            DB_PATH, user_id, "assistant",
            f"Workspace reset! I've cleared your learning history. Your roadmap for **{goal}** has been initialized to baseline."
        )
        
    return jsonify(get_learner_data(user_id))

@app.route("/api/learner/simulate-decay", methods=["POST"])
def post_simulate_decay():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    today = date.today()
    # Seed overdue reviews for the current user to trigger decay alerts
    db.upsert_review_schedule(
        DB_PATH, user_id, "Statistics", 
        repetitions=2, ease_factor=2.1, interval_days=16,
        next_review=(today - timedelta(days=15)).isoformat()
    )
    db.upsert_review_schedule(
        DB_PATH, user_id, "PyTorch", 
        repetitions=1, ease_factor=1.8, interval_days=30,
        next_review=(today - timedelta(days=60)).isoformat()
    )
    db.upsert_review_schedule(
        DB_PATH, user_id, "MLOps", 
        repetitions=1, ease_factor=1.9, interval_days=20,
        next_review=(today - timedelta(days=40)).isoformat()
    )
    
    # Also add a Copilot message about the decay simulation
    db.add_chat_message(
        DB_PATH, user_id, "assistant",
        "⚡ **Memory Decay Simulated**: I've simulated memory decay on Statistics, PyTorch, and MLOps to populate your spaced repetition review queue."
    )
    
    return jsonify(get_learner_data(user_id))

@app.route("/api/learner/simulate-adaptation", methods=["POST"])
def post_simulate_adaptation():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    before = ["ML Fundamentals", "Deep Learning", "PyTorch"]
    after = ["ML Fundamentals", "ML Revision", "Feature Engineering Practice", "ML Reassessment", "Deep Learning"]
    reason = "Demonstrated ML proficiency was below the prerequisite threshold (80%) required to unlock Deep Learning."
    
    db.add_adaptation(
        DB_PATH, user_id, "Quiz score 40% (Machine Learning)",
        before, after, reason
    )
    
    db.add_chat_message(
        DB_PATH, user_id, "assistant",
        "⚠️ **Path Adaptation Simulated**: Your Machine Learning demonstrated mastery was low. I've dynamically adapted your roadmap to insert targeted ML revision before Deep Learning."
    )
    
    return jsonify(get_learner_data(user_id))

@app.route("/api/copilot/chat", methods=["POST"])
def post_copilot_chat():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    req_data = request.get_json()
    message = req_data.get("message", "")
    
    # Log user message
    db.add_chat_message(DB_PATH, user_id, "user", message)
    
    # Compile learner context to construct the response
    data = get_learner_data(user_id)
    
    # 1. Groq LLM response generation if API key exists
    api_key = os.environ.get("GROQ_API_KEY")
    if api_key:
        try:
            from groq import Groq
            client = Groq(api_key=api_key)
            
            skills_summary = ", ".join([f"{s['name']}: {int(s['mastery']*100)}% (req: {int(s['required']*100)}%)" for s in data["skills"]])
            
            prompt = f"""You are the Learning Copilot for {data['name']}.
Their current career goal is to become a {data['goal']}.
Their current experience level is {data['experience']}.
Their current career readiness is {data['readiness']}%.
Their current skill levels are: {skills_summary}.
Their next best action is to: {data['nextAction']['title']} because "{data['nextAction']['reason']}".
Their knowledge decay alerts are: {data['decayAlerts']}.

User Message: "{message}"

Provide a highly personalized, context-aware reply in 2-4 sentences. Use markdown bold styling and bullet points if appropriate. Focus directly on their learning path, locked modules, decay alerts, or what they should do next. Keep the tone encouraging, supportive, and practical. Keep the response concise.
"""
            resp = client.chat.completions.create(
                model="llama3-8b-8192",
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}],
            )
            reply = resp.choices[0].message.content.strip()
            
            # Detect if we should suggest a button link action
            action = None
            msg_lower = message.lower()
            if "roadmap" in msg_lower or "path" in msg_lower:
                action = {"label": "View Roadmap", "path": "/roadmap"}
            elif "assess" in msg_lower or "quiz" in msg_lower or "test" in msg_lower:
                action = {"label": "Start Practice", "path": "/assess"}
            elif "decay" in msg_lower or "retention" in msg_lower:
                action = {"label": "View Twin", "path": "/twin"}
            elif "project" in msg_lower:
                action = {"label": "View Projects", "path": "/projects"}
            
            db.add_chat_message(DB_PATH, user_id, "assistant", reply, 
                                action_label=action["label"] if action else None,
                                action_path=action["path"] if action else None)
                                
            return jsonify({
                "learner": get_learner_data(user_id)
            })
        except Exception as e:
            print("Groq API error, falling back to rules:", e)
            
    # 2. Local rule-based fallback response
    msg = message.lower()
    reply = ""
    action = None
    
    if "deep learning" in msg and ("lock" in msg or "can't" in msg or "cannot" in msg or "blocked" in msg):
        ml_skill = next((s for s in data["skills"] if s["name"] == "Machine Learning"), None)
        ml_mst = int(ml_skill["mastery"]*100) if ml_skill else 0
        reply = f"Your Deep Learning module is currently locked because your Machine Learning mastery is {ml_mst}%.\n\nYou need at least 80% mastery in Machine Learning before moving forward.\n\nI recommend a 15-minute targeted practice session to close this gap."
        action = {"label": "Start Practice", "path": "/assess"}
    elif "readiness" in msg or "ready" in msg or "progress" in msg:
        reply = f"Your current career readiness for **{data['goal']}** is **{data['readiness']}%** — up 8% this week.\n\nYour highest-leverage next milestone is completing the Machine Learning prerequisite, which will unlock Deep Learning and raise your readiness score."
        action = {"label": "View Roadmap", "path": "/roadmap"}
    elif "next" in msg or "what should" in msg or "do now" in msg:
        reply = f"Based on your profile, your **next best action** is:\n\n⚡ **{data['nextAction']['title']}**\n\n{data['nextAction']['reason']}\n\nThis is the fastest path to unblocking locked milestones."
        action = {"label": "Start Now", "path": "/next-action"}
    elif "decay" in msg or "forget" in msg or "retention" in msg:
        worst_alert = data["decayAlerts"][0] if data["decayAlerts"] else None
        if worst_alert:
            reply = f"Knowledge decay has set in. **{worst_alert['skill']}** is currently your most decayed skill, down to **{worst_alert['retention']}%** retention since you haven't reviewed it in {worst_alert['daysSince']} days. A quick revision will reset its decay timer."
            action = {"label": "Quick Revision", "path": "/assess"}
        else:
            reply = "Great news! Your retention is strong across all skills, and nothing is currently overdue for spaced repetition."
    elif "project" in msg or "build" in msg or "practice" in msg:
        reply = "I recommend the **Customer Churn Prediction** project for you right now.\n\nIt targets your ML and Feature Engineering gaps, which are the main bottlenecks blocking your Deep Learning milestone."
        action = {"label": "View Projects", "path": "/projects"}
    else:
        reply = "I'm your SkillPilot Copilot. I monitor your Digital Twin to help guide your journey. Ask me why a skill is locked, what you should study next, or how to tackle decay alerts."
        
    db.add_chat_message(DB_PATH, user_id, "assistant", reply,
                        action_label=action["label"] if action else None,
                        action_path=action["path"] if action else None)
                        
    return jsonify({
        "learner": get_learner_data(user_id)
    })

@app.route("/api/search", methods=["GET"])
def get_search():
    query = request.args.get("q", "").strip().lower()
    if not query:
        return jsonify({"skills": [], "careers": [], "courses": [], "projects": []})
        
    # Match skills
    matching_skills = []
    for _, row in skills_df.iterrows():
        name = row["skill"]
        category = row["category"]
        if query in name.lower() or query in category.lower():
            matching_skills.append({"name": name, "category": category})
            
    # Match careers/goals
    matching_careers = []
    for g in KNOWN_GOALS:
        if query in g.lower():
            matching_careers.append(g)
            
    # Match courses & projects
    matching_courses = []
    matching_projects = []
    for _, row in courses_df.iterrows():
        title = row["title"]
        skill = row["skill"]
        res_type = row["resource_type"]
        difficulty = row["difficulty"]
        if query in title.lower() or query in skill.lower():
            item = {
                "id": row["course_id"],
                "title": title,
                "skill": skill,
                "difficulty": difficulty.capitalize(),
                "url": row["url"]
            }
            if res_type == "project":
                matching_projects.append(item)
            else:
                matching_courses.append(item)
                
    return jsonify({
        "skills": matching_skills[:5],
        "careers": matching_careers[:5],
        "courses": matching_courses[:5],
        "projects": matching_projects[:5]
    })

if __name__ == "__main__":
    app.run(port=8000, debug=True)
