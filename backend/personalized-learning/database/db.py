"""
SQLite persistence layer for the learning path recommender.
No ORM - plain sqlite3 to keep it dependency-light for a hackathon build.
"""

import sqlite3
import json
from contextlib import contextmanager
from typing import Dict, Optional

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    password_hash TEXT,
    name TEXT,
    goal TEXT,
    experience TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS learner_skills (
    user_id TEXT,
    skill TEXT,
    self_reported REAL,
    bkt_mastery REAL,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, skill)
);

CREATE TABLE IF NOT EXISTS quiz_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    skill TEXT,
    question_id TEXT,
    correct INTEGER,
    confidence INTEGER,
    taken_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS review_schedule (
    user_id TEXT,
    skill TEXT,
    repetitions INTEGER,
    ease_factor REAL,
    interval_days INTEGER,
    next_review TEXT,
    PRIMARY KEY (user_id, skill)
);

CREATE TABLE IF NOT EXISTS roadmap (
    user_id TEXT,
    goal TEXT,
    roadmap_json TEXT,
    generated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    role TEXT,
    content TEXT,
    action_label TEXT,
    action_path TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS adaptation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    trigger TEXT,
    before_list TEXT,
    after_list TEXT,
    reason TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS completed_projects (
    user_id TEXT,
    project_id TEXT,
    completed_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, project_id)
);
"""


@contextmanager
def get_conn(db_path: str = "database/learning.db"):
    conn = sqlite3.connect(db_path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(db_path: str = "database/learning.db"):
    with get_conn(db_path) as conn:
        conn.executescript(SCHEMA)
        # Migration: Add password_hash if it doesn't exist
        try:
            conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
        except sqlite3.OperationalError:
            pass


def upsert_user(db_path: str, user_id: str, name: str, goal: str, experience: str):
    with get_conn(db_path) as conn:
        conn.execute(
            "INSERT INTO users (user_id, name, goal, experience) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET goal=excluded.goal, experience=excluded.experience",
            (user_id, name, goal, experience),
        )


def create_user(db_path: str, user_id: str, password_hash: str, name: str, goal: str, experience: str):
    with get_conn(db_path) as conn:
        conn.execute(
            "INSERT INTO users (user_id, password_hash, name, goal, experience) VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET password_hash=excluded.password_hash, name=excluded.name, goal=excluded.goal, experience=excluded.experience",
            (user_id, password_hash, name, goal, experience),
        )


def get_user(db_path: str, user_id: str) -> Optional[dict]:
    with get_conn(db_path) as conn:
        row = conn.execute(
            "SELECT user_id, password_hash, name, goal, experience FROM users WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    return dict(row) if row else None


def upsert_skill(db_path: str, user_id: str, skill: str, self_reported: float, bkt_mastery: Optional[float] = None):
    with get_conn(db_path) as conn:
        conn.execute(
            "INSERT INTO learner_skills (user_id, skill, self_reported, bkt_mastery) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(user_id, skill) DO UPDATE SET self_reported=excluded.self_reported, "
            "bkt_mastery=COALESCE(excluded.bkt_mastery, learner_skills.bkt_mastery), "
            "updated_at=datetime('now')",
            (user_id, skill, self_reported, bkt_mastery),
        )


def record_quiz_answer(db_path: str, user_id: str, skill: str, question_id: str, correct: bool, confidence: int):
    with get_conn(db_path) as conn:
        conn.execute(
            "INSERT INTO quiz_results (user_id, skill, question_id, correct, confidence) VALUES (?, ?, ?, ?, ?)",
            (user_id, skill, question_id, int(correct), confidence),
        )


def save_roadmap(db_path: str, user_id: str, goal: str, roadmap: Dict):
    with get_conn(db_path) as conn:
        conn.execute(
            "INSERT INTO roadmap (user_id, goal, roadmap_json) VALUES (?, ?, ?)",
            (user_id, goal, json.dumps(roadmap)),
        )


def get_roadmap(db_path: str, user_id: str) -> Optional[Dict]:
    with get_conn(db_path) as conn:
        row = conn.execute(
            "SELECT roadmap_json FROM roadmap WHERE user_id = ? ORDER BY generated_at DESC LIMIT 1",
            (user_id,),
        ).fetchone()
    return json.loads(row["roadmap_json"]) if row else None


def get_learner_skills_full(db_path: str, user_id: str) -> list:
    with get_conn(db_path) as conn:
        rows = conn.execute(
            "SELECT skill, self_reported, bkt_mastery, updated_at FROM learner_skills WHERE user_id = ?",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_learner_skills(db_path: str, user_id: str) -> Dict[str, float]:
    with get_conn(db_path) as conn:
        rows = conn.execute(
            "SELECT skill, COALESCE(bkt_mastery, self_reported) AS mastery FROM learner_skills WHERE user_id = ?",
            (user_id,),
        ).fetchall()
    return {r["skill"]: r["mastery"] for r in rows}


def upsert_review_schedule(db_path: str, user_id: str, skill: str, repetitions: int, ease_factor: float, interval_days: int, next_review: str):
    with get_conn(db_path) as conn:
        conn.execute(
            "INSERT INTO review_schedule (user_id, skill, repetitions, ease_factor, interval_days, next_review) VALUES (?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(user_id, skill) DO UPDATE SET repetitions=excluded.repetitions, ease_factor=excluded.ease_factor, "
            "interval_days=excluded.interval_days, next_review=excluded.next_review",
            (user_id, skill, repetitions, ease_factor, interval_days, next_review),
        )


def get_review_schedule(db_path: str, user_id: str) -> dict:
    with get_conn(db_path) as conn:
        rows = conn.execute(
            "SELECT skill, repetitions, ease_factor, interval_days, next_review FROM review_schedule WHERE user_id = ?",
            (user_id,),
        ).fetchall()
    return {r["skill"]: dict(r) for r in rows}


def get_chat_history(db_path: str, user_id: str) -> list:
    with get_conn(db_path) as conn:
        rows = conn.execute(
            "SELECT role, content, action_label, action_path FROM chat_history WHERE user_id = ? ORDER BY id ASC",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def add_chat_message(db_path: str, user_id: str, role: str, content: str, action_label: Optional[str] = None, action_path: Optional[str] = None):
    with get_conn(db_path) as conn:
        conn.execute(
            "INSERT INTO chat_history (user_id, role, content, action_label, action_path) VALUES (?, ?, ?, ?, ?)",
            (user_id, role, content, action_label, action_path),
        )


def get_adaptation_history(db_path: str, user_id: str) -> list:
    with get_conn(db_path) as conn:
        rows = conn.execute(
            "SELECT trigger, before_list, after_list, reason, timestamp FROM adaptation_history WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["before"] = json.loads(d["before_list"])
        d["after"] = json.loads(d["after_list"])
        result.append(d)
    return result


def add_adaptation(db_path: str, user_id: str, trigger: str, before: list, after: list, reason: str):
    with get_conn(db_path) as conn:
        conn.execute(
            "INSERT INTO adaptation_history (user_id, trigger, before_list, after_list, reason) VALUES (?, ?, ?, ?, ?)",
            (user_id, trigger, json.dumps(before), json.dumps(after), reason),
        )


def complete_project(db_path: str, user_id: str, project_id: str):
    with get_conn(db_path) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO completed_projects (user_id, project_id) VALUES (?, ?)",
            (user_id, project_id),
        )


def get_completed_projects(db_path: str, user_id: str) -> list:
    with get_conn(db_path) as conn:
        rows = conn.execute(
            "SELECT project_id FROM completed_projects WHERE user_id = ?",
            (user_id,),
        ).fetchall()
    return [r["project_id"] for r in rows]


