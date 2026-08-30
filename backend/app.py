"""
Streamlit Frontend
====================
Run with:  streamlit run app.py   (from inside personalized-learning/)

Wires every engine module into an interactive UI:
  Sidebar   -> goal input (single or multi-goal)
  Tab 1     -> Skill Profile (gaps, readiness %)
  Tab 2     -> Roadmap (shared spine + branches, what-if simulator)
  Tab 3     -> Recommended Courses
  Tab 4     -> Quiz (BKT mastery update, false-mastery + calibration flags)
  Tab 5     -> Review Queue (spaced repetition / knowledge decay)
"""

import json
import os
import sys
from datetime import date

# Make sure 'engine', 'database', and 'data' are resolvable regardless of
# which directory Streamlit is launched from.
_HERE = os.path.dirname(os.path.abspath(__file__))
_PL   = os.path.join(_HERE, "personalized-learning")
if _PL not in sys.path:
    sys.path.insert(0, _PL)

# Also load .env from personalized-learning/
from dotenv import load_dotenv
load_dotenv(os.path.join(_PL, ".env"))

import pandas as pd
import streamlit as st

from engine.goal_analyzer import analyze_goal
from engine.graph import build_graph, multi_goal_merge, goal_required_skills, topo_order
from engine.skill_gap import compute_gaps, readiness_score
from engine.recommender import recommend
from engine.adaptive import BKTEngine, detect_false_mastery
from engine.calibration import QuizAnswer, calibration_report
from engine.whatif import what_if
from engine.spaced_repetition import ReviewState, sm2_update, build_review_queue
from database import db

DATA = os.path.join(_PL, "data")
DB_PATH = os.path.join(_PL, "database", "learning.db")
USER_ID = "streamlit_user"

st.set_page_config(page_title="AI Learning Path Recommender", layout="wide")


# ---------------------------------------------------------------- caching --
@st.cache_data
def load_data():
    skills = pd.read_csv(f"{DATA}/skills.csv")
    roles = pd.read_csv(f"{DATA}/roles.csv")
    courses = pd.read_csv(f"{DATA}/courses.csv")
    with open(f"{DATA}/quiz_bank.json") as f:
        quiz_bank = json.load(f)
    return skills, roles, courses, quiz_bank


@st.cache_resource
def get_graph():
    return build_graph(f"{DATA}/prerequisites.csv")


db.init_db(DB_PATH)
skills_df, roles_df, courses_df, quiz_bank = load_data()
G = get_graph()
ALL_GOALS = sorted(roles_df["role"].unique().tolist())

# ---------------------------------------------------------------- state ----
if "profile" not in st.session_state:
    st.session_state.profile = None
if "goals" not in st.session_state:
    st.session_state.goals = []
if "current_mastery" not in st.session_state:
    st.session_state.current_mastery = {}
if "review_states" not in st.session_state:
    st.session_state.review_states = {}
if "last_quiz_result" not in st.session_state:
    st.session_state.last_quiz_result = None

# ---------------------------------------------------------------- sidebar --
st.sidebar.title("🎓 Your Goal")

with st.sidebar.form("goal_form"):
    goal_text = st.text_area(
        "Describe your goal and current skills",
        placeholder="I want to become an AI Engineer. I know Python well and have basic machine learning.",
        height=100,
    )
    second_goal = st.selectbox("Optional second goal (multi-goal roadmap)", ["None"] + ALL_GOALS)
    submitted = st.form_submit_button("Analyze")

if submitted and goal_text.strip():
    profile = analyze_goal(goal_text, f"{DATA}/skills.csv")
    if profile["goal"] not in ALL_GOALS:
        profile["goal"] = ALL_GOALS[0]
    st.session_state.profile = profile
    st.session_state.goals = [profile["goal"]] + ([second_goal] if second_goal != "None" else [])

    required = goal_required_skills(roles_df, profile["goal"])
    mastery = {s: 0.0 for s in required}
    mastery.update(profile["skills"])
    st.session_state.current_mastery = mastery

    db.upsert_user(DB_PATH, USER_ID, "Streamlit Learner", profile["goal"], profile["experience"])
    for skill, level in profile["skills"].items():
        db.upsert_skill(DB_PATH, USER_ID, skill, level)

if st.session_state.profile is None:
    st.title("AI-Powered Personalized Learning Path Recommender")
    st.info("Fill in your goal on the left sidebar to get started.")
    st.stop()
    sys.exit(0)

profile = st.session_state.profile
goals = st.session_state.goals
primary_goal = goals[0]
required = goal_required_skills(roles_df, primary_goal)
current_mastery = st.session_state.current_mastery
gaps = compute_gaps(current_mastery, required)
readiness = readiness_score(current_mastery, required)

st.sidebar.markdown("---")
st.sidebar.metric("Career Readiness", f"{readiness}%")
st.sidebar.caption(f"Goal(s): {', '.join(goals)}")
st.sidebar.caption(f"Experience level: {profile['experience']}")

tab1, tab2, tab3, tab4, tab5 = st.tabs(
    ["📊 Skill Profile", "🗺️ Roadmap", "📚 Recommendations", "📝 Quiz", "🔁 Review Queue"]
)

# ---------------------------------------------------------------- Tab 1 ----
with tab1:
    st.subheader(f"Skill Profile — {primary_goal}")
    st.progress(min(readiness / 100, 1.0), text=f"Career readiness: {readiness}%")

    cols = st.columns(2)
    with cols[0]:
        st.markdown("**Current mastery**")
        for skill, level in sorted(required.items(), key=lambda x: -x[1]):
            cur = current_mastery.get(skill, 0.0)
            st.progress(min(cur, 1.0), text=f"{skill} — {int(cur*100)}%")
    with cols[1]:
        st.markdown("**Top skill gaps**")
        if gaps:
            gap_df = pd.DataFrame(gaps, columns=["Skill", "Gap"])
            st.dataframe(gap_df, hide_index=True, use_container_width=True)
        else:
            st.success("No gaps — you meet the required level for every skill!")

# ---------------------------------------------------------------- Tab 2 ----
with tab2:
    st.subheader("Roadmap")
    if len(goals) > 1:
        merged = multi_goal_merge(G, roles_df, goals)
        st.markdown("**Shared spine** (counts toward every goal)")
        st.write(" → ".join(merged["spine"]) if merged["spine"] else "(none)")
        for g, branch in merged["branches"].items():
            st.markdown(f"**{g} branch**")
            st.write(" → ".join(branch) if branch else "(fully covered by spine)")
        roadmap_skills = merged["full_order"]
    else:
        roadmap_skills = topo_order(G, list(required.keys()))
        st.write(" → ".join(roadmap_skills))

    st.markdown("---")
    st.markdown("### 🔮 What-if simulator")
    wcol1, wcol2 = st.columns([2, 1])
    with wcol1:
        candidate = st.selectbox("Pick a skill to simulate completing", sorted(set(roadmap_skills)))
    with wcol2:
        if st.button("Project readiness"):
            proj = what_if(current_mastery, required, [candidate])[0]
            st.metric(
                f"If you complete '{candidate}'",
                f"{proj['projected_readiness']}%",
                delta=f"+{proj['delta']}",
            )

# ---------------------------------------------------------------- Tab 3 ----
with tab3:
    st.subheader("Recommended next resources")
    ranked = recommend(courses_df, gaps, current_mastery, goal_text, top_k=8)
    if ranked.empty:
        st.success("No outstanding gaps to recommend courses for.")
    else:
        for _, row in ranked.iterrows():
            with st.container(border=True):
                c1, c2 = st.columns([4, 1])
                with c1:
                    st.markdown(f"**{row['title']}**  ·  {row['skill']}  ·  _{row['difficulty']}_")
                    st.caption(row["url"])
                with c2:
                    st.metric("Match score", f"{row['score']:.2f}")

# ---------------------------------------------------------------- Tab 4 ----
with tab4:
    st.subheader("Take a skill quiz")
    quiz_skills = [s for s in quiz_bank.keys() if s in required]
    if not quiz_skills:
        st.info("No quiz available yet for this goal's skills.")
    else:
        skill = st.selectbox("Skill to test", quiz_skills)
        questions = quiz_bank[skill]

        with st.form("quiz_form"):
            answers = []
            confidences = []
            for i, q in enumerate(questions):
                st.markdown(f"**Q{i+1}. {q['q']}**")
                choice = st.radio(f"q{i}_choice", q["options"], key=f"choice_{skill}_{i}", label_visibility="collapsed")
                conf = st.slider(f"Confidence (1=guessing, 5=certain)", 1, 5, 3, key=f"conf_{skill}_{i}")
                answers.append(choice == q["options"][q["correct"]])
                confidences.append(conf)
                st.markdown("---")
            quiz_submit = st.form_submit_button("Submit quiz")

        if quiz_submit:
            self_reported = current_mastery.get(skill, 0.3)
            bkt = BKTEngine()
            demonstrated = bkt.update_from_quiz(skill, self_reported, answers)

            mismatch = detect_false_mastery(self_reported, demonstrated)
            quiz_answers = [
                QuizAnswer(f"q{i}", answers[i], confidences[i]) for i in range(len(answers))
            ]
            calib = calibration_report(quiz_answers)

            current_mastery[skill] = demonstrated
            st.session_state.current_mastery = current_mastery

            quality = sum(answers)  # 0-5 correct answers maps directly to SM-2 quality scale
            state = st.session_state.review_states.get(skill, ReviewState(skill=skill))
            state = sm2_update(state, quality)
            st.session_state.review_states[skill] = state

            db.upsert_skill(DB_PATH, USER_ID, skill, self_reported, demonstrated)
            for i, q in enumerate(questions):
                db.record_quiz_answer(DB_PATH, USER_ID, skill, f"q{i}", answers[i], confidences[i])

            st.session_state.last_quiz_result = {
                "skill": skill,
                "score": f"{sum(answers)}/{len(answers)}",
                "self_reported": self_reported,
                "demonstrated": demonstrated,
                "mismatch": mismatch,
                "calib": calib,
                "next_review": state.next_review,
            }

        result = st.session_state.last_quiz_result
        if result and result["skill"] == skill:
            st.markdown("### Result")
            c1, c2, c3 = st.columns(3)
            c1.metric("Score", result["score"])
            c2.metric("Mastery before", f"{result['self_reported']:.2f}")
            c3.metric("Mastery after (BKT)", f"{result['demonstrated']:.2f}")

            if result["mismatch"]["flagged"]:
                st.warning(
                    f"⚠️ Skill mismatch detected — self-reported {result['mismatch']['self_reported']:.2f} "
                    f"vs demonstrated {result['mismatch']['demonstrated']:.2f} "
                    f"(confidence: {result['mismatch']['confidence_label']}). "
                    "A revision module has been prioritized before advancing."
                )
            if result["calib"]["dunning_kruger_flag"]:
                st.error(f"🧠 Overconfidence pattern detected. {result['calib']['recommendation']}")
            else:
                st.success("Confidence and performance are reasonably well calibrated.")

            st.caption(f"Next spaced-repetition review scheduled for: {result['next_review']}")

# ---------------------------------------------------------------- Tab 5 ----
with tab5:
    st.subheader("Spaced Repetition — Review Queue")
    if not st.session_state.review_states:
        st.info("Take a quiz first — completed skills get scheduled for review here.")
    else:
        queue = build_review_queue(st.session_state.review_states, today=date.today())
        c1, c2 = st.columns(2)
        with c1:
            st.markdown("**🔴 Due now**")
            if queue["due_now"]:
                for s in queue["due_now"]:
                    st.write(f"- {s}")
            else:
                st.caption("Nothing due today.")
        with c2:
            st.markdown("**🟡 Upcoming**")
            for s in queue["upcoming"]:
                st_state = st.session_state.review_states[s]
                st.write(f"- {s} — next review {st_state.next_review}")
