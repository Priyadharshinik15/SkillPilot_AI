"""
Recommendation Engine
=======================
Hybrid scoring over courses:

    score = 0.4 * skill_gap
          + 0.3 * goal_relevance      (TF-IDF cosine similarity, lightweight
                                        default; swap in Sentence-Transformers
                                        + FAISS for production semantic search)
          + 0.2 * prerequisite_readiness
          + 0.1 * difficulty_match

Kept dependency-light (pandas + scikit-learn only) so it runs instantly in
a hackathon environment without downloading embedding models.
"""

import pandas as pd
from typing import Dict, List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DIFFICULTY_RANK = {"easy": 0.3, "medium": 0.6, "hard": 0.9}


def _difficulty_match(course_difficulty: str, learner_level: float) -> float:
    """Closer learner_level to the course's expected difficulty -> higher score."""
    course_val = DIFFICULTY_RANK.get(course_difficulty, 0.6)
    return round(1 - abs(course_val - learner_level), 3)


def _goal_relevance(courses_df: pd.DataFrame, goal_text: str) -> Dict[str, float]:
    corpus = (courses_df["title"] + " " + courses_df["skill"]).tolist()
    corpus.append(goal_text)
    vec = TfidfVectorizer(stop_words="english")
    tfidf = vec.fit_transform(corpus)
    sims = cosine_similarity(tfidf[-1], tfidf[:-1]).flatten()
    return dict(zip(courses_df["course_id"], sims))


def recommend(
    courses_df: pd.DataFrame,
    gaps: List[tuple],
    current_mastery: Dict[str, float],
    goal_text: str,
    top_k: int = 10,
) -> pd.DataFrame:
    gap_map = dict(gaps)
    relevant = courses_df[courses_df["skill"].isin(gap_map.keys())].copy()
    if relevant.empty:
        return relevant

    relevance_scores = _goal_relevance(relevant, goal_text)

    rows = []
    for _, row in relevant.iterrows():
        skill = row["skill"]
        gap_score = gap_map.get(skill, 0.0)
        goal_rel = relevance_scores.get(row["course_id"], 0.0)
        # prerequisite readiness proxy: how mastered is the skill already
        # (partial mastery = more "ready" to deepen it further)
        prereq_ready = current_mastery.get(skill, 0.0)
        diff_match = _difficulty_match(row["difficulty"], current_mastery.get(skill, 0.3))

        score = (
            0.4 * gap_score
            + 0.3 * goal_rel
            + 0.2 * prereq_ready
            + 0.1 * diff_match
        )
        rows.append({**row.to_dict(), "score": round(score, 4)})

    ranked = pd.DataFrame(rows).sort_values("score", ascending=False).head(top_k)
    return ranked.reset_index(drop=True)


if __name__ == "__main__":
    courses = pd.read_csv("data/courses.csv")
    gaps = [("Machine Learning", 0.35), ("Statistics", 0.4), ("Deep Learning", 0.6)]
    mastery = {"Machine Learning": 0.45, "Statistics": 0.3, "Deep Learning": 0.1}
    result = recommend(courses, gaps, mastery, "I want to become an AI Engineer")
    print(result[["title", "skill", "score"]])
