"""
What-If Simulator
===================
NOVELTY: before committing to a roadmap node, the learner can see the
projected readiness jump if they completed it. Cheap to compute - just
re-run readiness_score with a hypothetical mastery=1.0 on one skill - but
high demo value ("interactive" instead of "static list").
"""

from typing import Dict, List
from .skill_gap import readiness_score


def what_if(
    current: Dict[str, float],
    required: Dict[str, float],
    candidate_skills: List[str],
    hypothetical_mastery: float = 1.0,
) -> List[Dict]:
    baseline = readiness_score(current, required)
    results = []
    for skill in candidate_skills:
        hypo = dict(current)
        hypo[skill] = hypothetical_mastery
        projected = readiness_score(hypo, required)
        results.append({
            "skill": skill,
            "current_readiness": baseline,
            "projected_readiness": projected,
            "delta": round(projected - baseline, 1),
        })
    results.sort(key=lambda r: -r["delta"])
    return results


if __name__ == "__main__":
    current = {"Python": 0.9, "Machine Learning": 0.55, "Statistics": 0.3, "Deep Learning": 0.1}
    required = {"Python": 0.8, "Machine Learning": 0.8, "Statistics": 0.7, "Deep Learning": 0.7, "MLOps": 0.5}
    print(what_if(current, required, ["Deep Learning", "MLOps", "Statistics"]))
