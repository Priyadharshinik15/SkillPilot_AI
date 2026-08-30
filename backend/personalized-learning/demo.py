"""
End-to-End Backend Demo
=========================
Runs the full pipeline with no frontend attached — everything here is a
plain Python function you can call from Streamlit, FastAPI, or React later.

    python demo.py

Walks through:
  1. Goal Analyzer          - free text -> structured learner profile
  2. Multi-Goal Skill Graph - shared spine + goal branches (NOVELTY)
  3. Skill Gap + Readiness  - current vs required
  4. Recommendation Engine  - ranked courses
  5. Quiz + BKT             - Bayesian mastery update (NOVELTY)
  6. False Mastery Detector - self-report vs demonstrated mismatch
  7. Confidence Calibration - Dunning-Kruger detection (NOVELTY)
  8. What-If Simulator      - counterfactual readiness projection (NOVELTY)
  9. Spaced Repetition      - SM-2 review scheduling for decay (NOVELTY)
 10. Persistence            - everything saved to SQLite
"""

import pandas as pd
from datetime import date

from engine.goal_analyzer import analyze_goal
from engine.graph import build_graph, multi_goal_merge, goal_required_skills
from engine.skill_gap import compute_gaps, readiness_score
from engine.recommender import recommend
from engine.adaptive import BKTEngine, detect_false_mastery
from engine.calibration import QuizAnswer, calibration_report
from engine.whatif import what_if
from engine.spaced_repetition import ReviewState, sm2_update, build_review_queue
from database import db

DATA = "data"


def section(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


def run():
    db.init_db("database/learning.db")

    skills_csv = f"{DATA}/skills.csv"
    prereq_csv = f"{DATA}/prerequisites.csv"
    roles_csv = f"{DATA}/roles.csv"
    courses_csv = f"{DATA}/courses.csv"

    roles_df = pd.read_csv(roles_csv)
    courses_df = pd.read_csv(courses_csv)
    G = build_graph(prereq_csv)

    # ---- 1. Goal Analyzer -------------------------------------------------
    section("1. GOAL ANALYZER")
    raw_text = "I want to become an AI Engineer. I know Python well and have basic machine learning and statistics."
    profile = analyze_goal(raw_text, skills_csv)
    print(f"Input: \"{raw_text}\"")
    print("Extracted profile:", profile)

    user_id = "learner_001"
    db.upsert_user("database/learning.db", user_id, "Demo Learner", profile["goal"], profile["experience"])
    for skill, level in profile["skills"].items():
        db.upsert_skill("database/learning.db", user_id, skill, level)

    # ---- 2. Multi-Goal Skill Graph (novelty) ------------------------------
    section("2. MULTI-GOAL SKILL GRAPH (shared spine + branches)")
    goals = ["AI Engineer", "Data Scientist"]
    merged = multi_goal_merge(G, roles_df, goals)
    print(f"Goals: {goals}")
    print("Shared spine (learn once, counts for both goals):")
    print("  " + " -> ".join(merged["spine"]))
    for g, branch in merged["branches"].items():
        print(f"{g} branch: " + (" -> ".join(branch) if branch else "(none, fully covered by spine)"))
    print("\nFull merged learning order:")
    print("  " + " -> ".join(merged["full_order"]))

    # ---- 3. Skill Gap + Readiness (single-goal path for the rest of demo)-
    section("3. SKILL GAP + READINESS")
    goal = profile["goal"] if profile["goal"] != "Unspecified" else "AI Engineer"
    required = goal_required_skills(roles_df, goal)
    current_mastery = {**{s: 0.0 for s in required}, **profile["skills"]}
    gaps = compute_gaps(current_mastery, required)
    readiness = readiness_score(current_mastery, required)

    print(f"Goal: {goal}")
    print(f"Career readiness: {readiness}%")
    print("Top skill gaps:")
    for skill, gap in gaps[:6]:
        print(f"  {skill:<20} gap={gap}")

    # ---- 4. Recommendation Engine ------------------------------------------
    section("4. RECOMMENDATION ENGINE")
    ranked = recommend(courses_df, gaps, current_mastery, raw_text, top_k=5)
    if not ranked.empty:
        for _, row in ranked.iterrows():
            print(f"  [{row['score']:.3f}] {row['title']}  ({row['skill']}, {row['difficulty']})")
    else:
        print("  No gap-matching courses found.")

    # ---- 5. Quiz + BKT (novelty) --------------------------------------------
    section("5. QUIZ + BAYESIAN KNOWLEDGE TRACING")
    quiz_skill = "Machine Learning"
    # Demo scenario: learner self-reported strong ML but the quiz says otherwise
    self_reported = 0.85
    answers_correct = [True, False, False, False, True]  # 2/5 correct
    bkt = BKTEngine()
    demonstrated = bkt.update_from_quiz(quiz_skill, self_reported, answers_correct)
    print(f"Skill: {quiz_skill}")
    print(f"Self-reported mastery: {self_reported}")
    print(f"Quiz answers (5 Qs): {['correct' if a else 'wrong' for a in answers_correct]}")
    print(f"BKT posterior mastery after quiz: {demonstrated}")
    db.upsert_skill("database/learning.db", user_id, quiz_skill, self_reported, demonstrated)

    for a_correct, qid in zip(answers_correct, ["q1", "q2", "q3", "q4", "q5"]):
        db.record_quiz_answer("database/learning.db", user_id, quiz_skill, qid, a_correct, confidence=4)

    # ---- 6. False Mastery Detector ------------------------------------------
    section("6. FALSE MASTERY DETECTOR")
    mismatch = detect_false_mastery(self_reported, demonstrated)
    print(mismatch)
    if mismatch["flagged"]:
        print("  -> Roadmap will insert a revision module before advancing to Deep Learning.")

    # ---- 7. Confidence Calibration (novelty) --------------------------------
    section("7. CONFIDENCE CALIBRATION / DUNNING-KRUGER CHECK")
    quiz_with_confidence = [
        QuizAnswer("q1", True, 5),
        QuizAnswer("q2", False, 5),   # wrong but very confident -> overconfident
        QuizAnswer("q3", False, 4),
        QuizAnswer("q4", True, 2),    # right but unsure -> fragile mastery
        QuizAnswer("q5", False, 3),
    ]
    report = calibration_report(quiz_with_confidence)
    print(report)

    # ---- 8. What-If Simulator (novelty) -------------------------------------
    section("8. WHAT-IF SIMULATOR")
    candidates = ["Deep Learning", "MLOps", "Statistics"]
    projections = what_if(current_mastery, required, candidates)
    for p in projections:
        print(f"  If you complete '{p['skill']}': {p['current_readiness']}% -> {p['projected_readiness']}% (+{p['delta']})")

    # ---- 9. Spaced Repetition Scheduling (novelty) ---------------------------
    section("9. SPACED REPETITION (knowledge decay -> review queue)")
    review_states = {}
    for skill, quality_sequence in {
        "Python": [5, 5, 4],
        "Statistics": [4, 2],
        quiz_skill: [3],
    }.items():
        st = ReviewState(skill=skill)
        for q in quality_sequence:
            st = sm2_update(st, q)
        review_states[skill] = st
        print(f"  {skill:<20} interval={st.interval_days}d  next_review={st.next_review}  ease={round(st.ease_factor,2)}")

    queue = build_review_queue(review_states, today=date.today())
    print("Due now:", queue["due_now"] or "(none)")
    print("Upcoming:", queue["upcoming"] or "(none)")

    # ---- 10. Persist roadmap -------------------------------------------------
    section("10. PERSISTENCE")
    db.save_roadmap("database/learning.db", user_id, goal, merged)
    saved_skills = db.get_learner_skills("database/learning.db", user_id)
    print("Saved learner_skills row for user:", saved_skills)
    print("\nAll data written to database/learning.db")
    print("\nDemo complete. Every function above is import-ready for a Streamlit,")
    print("FastAPI, or React frontend — see engine/*.py and database/db.py.")


if __name__ == "__main__":
    run()
