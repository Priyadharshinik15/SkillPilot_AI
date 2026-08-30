"""
Skill Gap Engine
================
Compares a learner's current mastery against a goal's required levels
and produces a prioritized gap list.
"""

from typing import Dict, List, Tuple


def compute_gaps(current: Dict[str, float], required: Dict[str, float]) -> List[Tuple[str, float]]:
    """Returns [(skill, gap), ...] sorted by descending gap. Only skills
    with a positive gap (current < required) are included."""
    gaps = []
    for skill, req_level in required.items():
        cur_level = current.get(skill, 0.0)
        gap = max(req_level - cur_level, 0.0)
        if gap > 0:
            gaps.append((skill, round(gap, 3)))
    gaps.sort(key=lambda x: -x[1])
    return gaps


def readiness_score(current: Dict[str, float], required: Dict[str, float]) -> float:
    """Overall career readiness as a 0-100 percentage: average of
    min(current/required, 1) across all required skills."""
    if not required:
        return 0.0
    ratios = []
    for skill, req_level in required.items():
        cur_level = current.get(skill, 0.0)
        ratios.append(min(cur_level / req_level, 1.0) if req_level > 0 else 1.0)
    return round(100 * sum(ratios) / len(ratios), 1)
