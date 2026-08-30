"""
Skill Graph Engine
===================
Builds the prerequisite DAG and provides:

  - readiness(skill)          : are prerequisites satisfied for a skill?
  - topo_order(skills)        : valid learning order respecting prerequisites
  - multi_goal_merge(goals)   : NOVELTY FEATURE - given 2+ target goals,
                                 compute the shared "spine" of prerequisite
                                 skills common to all goals, then the
                                 goal-specific branches, using an
                                 approximate Steiner tree over the DAG.
                                 This is what makes a multi-goal roadmap
                                 shorter than concatenating two separate
                                 roadmaps.
"""

import pandas as pd
import networkx as nx
from typing import Dict, List, Set
from networkx.algorithms.approximation import steiner_tree


def build_graph(prereq_csv_path: str) -> nx.DiGraph:
    df = pd.read_csv(prereq_csv_path)
    G = nx.DiGraph()
    for _, row in df.iterrows():
        G.add_edge(row["prerequisite"], row["target"])
    return G


def ancestors_required(G: nx.DiGraph, skill: str) -> Set[str]:
    """All prerequisite skills (transitively) needed before `skill`."""
    if skill not in G:
        return set()
    return nx.ancestors(G, skill)


def is_ready(G: nx.DiGraph, skill: str, mastered: Dict[str, float], threshold: float = 0.6) -> bool:
    """A skill is 'ready to learn' if every direct prerequisite is mastered
    above threshold."""
    preds = list(G.predecessors(skill)) if skill in G else []
    return all(mastered.get(p, 0.0) >= threshold for p in preds)


def topo_order(G: nx.DiGraph, skills: List[str]) -> List[str]:
    """Return `skills` filtered to those present in G, ordered so that every
    prerequisite comes before its dependents."""
    sub_nodes = set(skills)
    for s in skills:
        sub_nodes |= ancestors_required(G, s)
    sub = G.subgraph(sub_nodes)
    ordered = [n for n in nx.topological_sort(sub) if n in sub_nodes]
    return ordered


def goal_required_skills(roles_df: pd.DataFrame, goal: str) -> Dict[str, float]:
    sub = roles_df[roles_df["role"] == goal]
    return dict(zip(sub["skill"], sub["required_level"]))


def multi_goal_merge(G: nx.DiGraph, roles_df: pd.DataFrame, goals: List[str]) -> Dict:
    """
    NOVELTY: compute a single minimum-redundancy roadmap that covers
    multiple career goals at once.

    Returns:
      {
        "spine": [...],       # skills shared by ALL goals, in learning order
        "branches": {goal: [skills unique to that goal, in order]},
        "full_order": [...],  # spine + interleaved branches, valid topo order
      }
    """
    per_goal_required = {g: set(goal_required_skills(roles_df, g).keys()) for g in goals}

    # Expand each goal's required skills with their transitive prerequisites
    per_goal_full = {}
    for g, skills in per_goal_required.items():
        expanded = set(skills)
        for s in skills:
            expanded |= ancestors_required(G, s)
        per_goal_full[g] = expanded

    # Shared spine = skills needed by every goal
    spine_nodes = set.intersection(*per_goal_full.values()) if per_goal_full else set()

    # Use Steiner tree to find the minimal connecting structure for the spine
    # (falls back to the plain node set if the graph doesn't connect them)
    try:
        undirected = G.to_undirected()
        relevant = [n for n in spine_nodes if n in undirected]
        if len(relevant) >= 2:
            tree = steiner_tree(undirected, relevant)
            spine_nodes |= set(tree.nodes())
    except Exception:
        pass

    spine_order = topo_order(G, list(spine_nodes))

    branches = {}
    for g, full in per_goal_full.items():
        unique = full - spine_nodes
        branches[g] = topo_order(G, list(unique))

    # Full recommended order: spine first, then branches interleaved by goal
    full_order = list(spine_order)
    max_len = max((len(b) for b in branches.values()), default=0)
    for i in range(max_len):
        for g in goals:
            if i < len(branches[g]):
                full_order.append(branches[g][i])

    return {
        "spine": spine_order,
        "branches": branches,
        "full_order": full_order,
    }


if __name__ == "__main__":
    G = build_graph("data/prerequisites.csv")
    roles_df = pd.read_csv("data/roles.csv")
    result = multi_goal_merge(G, roles_df, ["AI Engineer", "Data Scientist"])
    print("Shared spine:", result["spine"])
    for g, path in result["branches"].items():
        print(f"{g} branch:", path)
