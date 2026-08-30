"""
Spaced Repetition Scheduler - SM-2 algorithm
==============================================
NOVELTY: turns "knowledge decay" from a decorative decaying progress bar
into an actionable review queue, using the same algorithm behind Anki.

Each mastered skill gets an ease factor, an interval (days until next
review), and a repetition count. After each review, quality (0-5) updates
all three, and we compute the next review date.
"""

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Dict


@dataclass
class ReviewState:
    skill: str
    repetitions: int = 0
    ease_factor: float = 2.5
    interval_days: int = 0
    last_reviewed: date = field(default_factory=date.today)
    next_review: date = field(default_factory=date.today)


def sm2_update(state: ReviewState, quality: int, today: date = None) -> ReviewState:
    """quality: 0-5 self/quiz-assessed recall quality (5 = perfect recall,
    <3 = failed, resets repetitions)."""
    today = today or date.today()
    quality = max(0, min(5, quality))

    if quality < 3:
        state.repetitions = 0
        state.interval_days = 1
    else:
        if state.repetitions == 0:
            state.interval_days = 1
        elif state.repetitions == 1:
            state.interval_days = 6
        else:
            state.interval_days = round(state.interval_days * state.ease_factor)
        state.repetitions += 1

    state.ease_factor = max(
        1.3,
        state.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    )
    state.last_reviewed = today
    state.next_review = today + timedelta(days=state.interval_days)
    return state


def build_review_queue(states: Dict[str, ReviewState], today: date = None) -> Dict[str, list]:
    """Split skills into 'due_now' and 'upcoming' for the dashboard."""
    today = today or date.today()
    due_now, upcoming = [], []
    for skill, st in states.items():
        (due_now if st.next_review <= today else upcoming).append(skill)
    due_now.sort(key=lambda s: states[s].next_review)
    upcoming.sort(key=lambda s: states[s].next_review)
    return {"due_now": due_now, "upcoming": upcoming}


if __name__ == "__main__":
    st = ReviewState(skill="Statistics")
    for q in [5, 4, 2, 5]:
        st = sm2_update(st, q)
        print(f"quality={q} -> interval={st.interval_days}d, next_review={st.next_review}, ease={round(st.ease_factor,2)}")
