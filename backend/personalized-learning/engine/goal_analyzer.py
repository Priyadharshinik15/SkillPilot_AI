"""
Goal Analyzer
=============
Turns a free-text learner statement into a structured profile:

    {
        "goal": "AI Engineer",
        "skills": {"Python": 0.7, "Machine Learning": 0.4},
        "experience": "beginner|intermediate|advanced"
    }

Two modes:
  1. Rule-based (default, offline, deterministic) - keyword matching
     against the skills master list + simple heuristics for experience.
  2. LLM-assisted (optional) - if GROQ_API_KEY is set (via .env or env var),
     calls Groq (llama3-8b-8192) to do the same extraction with better
     natural-language understanding.
     Falls back to rule-based on any failure so the demo never breaks.
"""

import os
import re
import json
from typing import Dict, List, Optional

from dotenv import load_dotenv

# Load .env from the project root (personalized-learning/)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

EXPERIENCE_MAP = {
    "beginner": 0.25,
    "basic": 0.35,
    "some": 0.4,
    "intermediate": 0.55,
    "comfortable": 0.6,
    "advanced": 0.8,
    "expert": 0.9,
    "proficient": 0.75,
}

KNOWN_GOALS = [
    "AI Engineer",
    "Data Scientist",
    "Full Stack Developer",
    "Cybersecurity Specialist",
    "Cloud DevOps Engineer",
    "UI/UX Designer",
    "Product Manager",
    "Blockchain Engineer"
]


def _load_skill_list(skills_csv_path: str) -> List[str]:
    import pandas as pd
    df = pd.read_csv(skills_csv_path)
    return df["skill"].tolist()


def _detect_goal(text: str) -> Optional[str]:
    text_l = text.lower()
    for goal in KNOWN_GOALS:
        if goal.lower() in text_l:
            return goal
    if "ai" in text_l or "machine learning" in text_l or "deep learning" in text_l:
        return "AI Engineer"
    if "data scien" in text_l or "data analyst" in text_l or "statistics" in text_l:
        return "Data Scientist"
    if "full stack" in text_l or "web dev" in text_l or "frontend" in text_l or "backend" in text_l:
        return "Full Stack Developer"
    if "cyber" in text_l or "security" in text_l or "ethical hack" in text_l or "penetration" in text_l or "soc" in text_l:
        return "Cybersecurity Specialist"
    if "cloud" in text_l or "devops" in text_l or "kubernetes" in text_l or "docker" in text_l or "terraform" in text_l:
        return "Cloud DevOps Engineer"
    if "ui" in text_l or "ux" in text_l or "design" in text_l or "figma" in text_l:
        return "UI/UX Designer"
    if "product" in text_l or "agile" in text_l or "scrum" in text_l or "project" in text_l:
        return "Product Manager"
    if "blockchain" in text_l or "web3" in text_l or "solidity" in text_l or "cryptography" in text_l:
        return "Blockchain Engineer"
    return None


def _detect_experience_level(text: str) -> str:
    text_l = text.lower()
    for word, _ in sorted(EXPERIENCE_MAP.items(), key=lambda x: -len(x[0])):
        if word in text_l:
            if EXPERIENCE_MAP[word] >= 0.7:
                return "advanced"
            if EXPERIENCE_MAP[word] >= 0.5:
                return "intermediate"
            return "beginner"
    return "beginner"


def _rule_based_extract(text: str, skill_list: List[str]) -> Dict:
    text_l = text.lower()
    goal = _detect_goal(text)
    experience = _detect_experience_level(text)
    base_level = {
        "beginner": 0.3,
        "intermediate": 0.55,
        "advanced": 0.75,
    }[experience]

    found_skills = {}
    for skill in skill_list:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_l):
            # "basic X" or "know X" -> base_level; "strong/advanced X" -> boosted
            local_window = text_l
            boost = 0.0
            idx = local_window.find(skill.lower())
            context = local_window[max(0, idx - 20): idx]
            if any(w in context for w in ["strong", "advanced", "expert", "good"]):
                boost = 0.2
            elif any(w in context for w in ["basic", "little", "some", "beginner"]):
                boost = -0.1
            found_skills[skill] = round(max(0.05, min(0.95, base_level + boost)), 2)

    return {
        "goal": goal or "Unspecified",
        "skills": found_skills,
        "experience": experience,
    }


def _llm_extract(text: str, skill_list: List[str]) -> Optional[Dict]:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        prompt = f"""Extract a structured learner profile from this text.
Known skills vocabulary: {', '.join(skill_list)}
Known goals: {', '.join(KNOWN_GOALS)}

Text: "{text}"

Return ONLY valid JSON in this exact shape, nothing else:
{{"goal": "<one of the known goals or best guess>", "skills": {{"<skill>": <0-1 float mastery estimate>}}, "experience": "beginner|intermediate|advanced"}}
"""
        resp = client.chat.completions.create(
            model="llama3-8b-8192",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.choices[0].message.content.strip()
        raw = re.sub(r"^```json|```$", "", raw).strip()
        return json.loads(raw)
    except Exception:
        return None


def analyze_goal(text: str, skills_csv_path: str = "data/skills.csv") -> Dict:
    """Main entry point. Tries LLM extraction first (if configured), falls
    back to deterministic rule-based extraction."""
    skill_list = _load_skill_list(skills_csv_path)
    result = _llm_extract(text, skill_list)
    if result is None:
        result = _rule_based_extract(text, skill_list)
    return result


if __name__ == "__main__":
    demo_text = "I want to become an AI Engineer. I know Python well and have basic machine learning."
    print(json.dumps(analyze_goal(demo_text, "data/skills.csv"), indent=2))
