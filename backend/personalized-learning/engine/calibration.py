"""
Confidence Calibration Engine
==============================
NOVELTY: for each quiz question, the learner also states a confidence
level (1-5) BEFORE seeing whether they were correct. Comparing stated
confidence to actual correctness gives a calibration signal that plain
score-based adaptive systems miss entirely:

  - High confidence + wrong          -> Dunning-Kruger flag (overconfident,
                                         prioritize revision even if raw
                                         score looks passable)
  - Low confidence + correct         -> mastery is real but fragile,
                                         schedule spaced review instead of
                                         advancing immediately
  - High confidence + correct        -> genuine mastery, safe to advance
  - Low confidence + wrong           -> expected gap, standard remediation
"""

from dataclasses import dataclass
from typing import List, Dict


@dataclass
class QuizAnswer:
    question_id: str
    correct: bool
    confidence: int  # 1 (guessing) - 5 (certain)


def classify_answer(ans: QuizAnswer) -> str:
    high_conf = ans.confidence >= 4
    low_conf = ans.confidence <= 2
    if high_conf and not ans.correct:
        return "overconfident"       # Dunning-Kruger flag
    if low_conf and ans.correct:
        return "fragile_mastery"     # correct but not confident -> spaced review
    if high_conf and ans.correct:
        return "genuine_mastery"
    return "expected_gap"


def calibration_report(answers: List[QuizAnswer]) -> Dict:
    labels = [classify_answer(a) for a in answers]
    counts = {label: labels.count(label) for label in set(labels)}

    # Simple calibration error: average |confidence/5 - correctness(0/1)|
    if answers:
        errors = [abs((a.confidence / 5) - (1.0 if a.correct else 0.0)) for a in answers]
        calibration_error = round(sum(errors) / len(errors), 3)
    else:
        calibration_error = 0.0

    overconfident_count = counts.get("overconfident", 0)
    dunning_kruger_flag = overconfident_count >= max(1, len(answers) // 3)

    return {
        "breakdown": counts,
        "calibration_error": calibration_error,   # 0 = perfectly calibrated
        "dunning_kruger_flag": dunning_kruger_flag,
        "recommendation": (
            "Learner shows overconfidence on this skill — prioritize a "
            "revision module before advancing, even though raw score may "
            "look acceptable."
            if dunning_kruger_flag else
            "Confidence and performance are reasonably aligned."
        ),
    }


if __name__ == "__main__":
    sample = [
        QuizAnswer("q1", True, 5),
        QuizAnswer("q2", False, 5),
        QuizAnswer("q3", False, 4),
        QuizAnswer("q4", True, 2),
        QuizAnswer("q5", False, 3),
    ]
    print(calibration_report(sample))
