"""
Adaptive Engine - Bayesian Knowledge Tracing (BKT)
====================================================
NOVELTY: instead of hand-decrementing a mastery float when a quiz answer
is wrong, we maintain a real probabilistic estimate P(knows skill) and
update it with Bayes' rule after every observation. This is the same
family of model used in production ed-tech systems (Khan Academy, ALEKS).

Parameters (per skill, can be tuned):
  p_learn  - probability of transitioning from "doesn't know" to "knows"
             after one learning opportunity
  p_slip   - probability of a slip: knows it but answers wrong
  p_guess  - probability of a guess: doesn't know it but answers right
"""

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class BKTParams:
    p_learn: float = 0.3
    p_slip: float = 0.1
    p_guess: float = 0.2


class BKTEngine:
    def __init__(self, default_params: BKTParams = None):
        self.default_params = default_params or BKTParams()
        self.params: Dict[str, BKTParams] = {}

    def set_params(self, skill: str, params: BKTParams):
        self.params[skill] = params

    def _get_params(self, skill: str) -> BKTParams:
        return self.params.get(skill, self.default_params)

    def _bayes_posterior(self, p: BKTParams, p_know: float, correct: bool) -> float:
        """Pure Bayesian posterior from one observation (no learning transition)."""
        if correct:
            numerator = p_know * (1 - p.p_slip)
            denominator = numerator + (1 - p_know) * p.p_guess
        else:
            numerator = p_know * p.p_slip
            denominator = numerator + (1 - p_know) * (1 - p.p_guess)
        return numerator / denominator if denominator > 0 else p_know

    def update(self, skill: str, p_know: float, correct: bool) -> float:
        """Use this for a PRACTICE/study event: Bayesian posterior from the
        observation, plus a learning-transition bump (the act of practicing
        can itself move someone from 'doesn't know' to 'knows')."""
        p = self._get_params(skill)
        posterior = self._bayes_posterior(p, p_know, correct)
        p_know_new = posterior + (1 - posterior) * p.p_learn
        return round(min(max(p_know_new, 0.0), 0.99), 4)

    def update_from_quiz(self, skill: str, p_know: float, answers: List[bool]) -> float:
        """Use this for an ASSESSMENT event: sequential Bayesian updates only
        (no learning-transition bump), since a quiz measures existing
        knowledge rather than teaching new knowledge. A learner who answers
        mostly wrong will see their mastery estimate drop, not rise."""
        p = self._get_params(skill)
        for correct in answers:
            p_know = self._bayes_posterior(p, p_know, correct)
        return round(min(max(p_know, 0.0), 0.99), 4)


def detect_false_mastery(self_reported: float, demonstrated: float, threshold: float = 0.25) -> Dict:
    """Flags a mismatch between what the learner claims and what the
    quiz/BKT posterior shows."""
    gap = self_reported - demonstrated
    flagged = gap >= threshold
    confidence_label = "LOW" if flagged else ("MEDIUM" if abs(gap) > 0.1 else "HIGH")
    return {
        "flagged": flagged,
        "self_reported": self_reported,
        "demonstrated": demonstrated,
        "gap": round(gap, 3),
        "confidence_label": confidence_label,
    }


if __name__ == "__main__":
    engine = BKTEngine()
    p = 0.55  # self-reported ML mastery
    # learner gets 2/5 on the ML quiz
    answers = [True, False, False, False, True]
    updated = engine.update_from_quiz("Machine Learning", p, answers)
    print(f"ML mastery before: {p}, after quiz: {updated}")
    print(detect_false_mastery(self_reported=p, demonstrated=updated))
