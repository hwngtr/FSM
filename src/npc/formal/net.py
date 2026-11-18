"""Place/Transition Petri net generator, token game engine, and TLA+ specification builder."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass

from npc.ai.fsm import FSM_TABLE, Rule, State


@dataclass(frozen=True)
class PnTransition:
    """Petri net transition derived 1-to-1 from an `FSM_TABLE` Rule."""

    id: str
    input_place: str
    output_place: str
    guard: str


class PetriNet:
    """Executable Place/Transition net representing the guard FSM.

    State places carry at most 1 token (safe 1-bounded marked graph / state machine net).
    """

    def __init__(self, places: tuple[str, ...], transitions: tuple[PnTransition, ...], initial: str) -> None:
        if initial not in places:
            raise ValueError(f"Initial place '{initial}' is not in places {places}.")
        self.places = places
        self.transitions = transitions
        self.marking: dict[str, int] = {p: (1 if p == initial else 0) for p in places}

    def total_tokens(self) -> int:
        """Return total tokens across all state places (invariant: always 1)."""
        return sum(self.marking.values())

    def active_place(self) -> str:
        """Return the unique place holding the token."""
        for place, count in self.marking.items():
            if count == 1:
                return place
        raise RuntimeError(f"Mutual exclusion violated: marking={self.marking}")

    def enabled_transitions(self, active_guards: set[str]) -> list[PnTransition]:
        """Return transitions enabled by both token marking and active guard predicates."""
        return [
            t
            for t in self.transitions
            if self.marking.get(t.input_place, 0) >= 1 and t.guard in active_guards
        ]

    def fire(self, transition: PnTransition) -> None:
        """Consume 1 token from input_place and produce 1 token in output_place."""
        if self.marking[transition.input_place] < 1:
            raise ValueError(f"Transition {transition.id} is not enabled in marking {self.marking}.")
        self.marking[transition.input_place] -= 1
        self.marking[transition.output_place] += 1


def build_petri_net(rules: tuple[Rule, ...] = FSM_TABLE, initial: State = State.IDLE) -> PetriNet:
    """Build an executable Place/Transition Petri net mechanically from `FSM_TABLE`."""
    places = tuple(s.value for s in State)
    transitions = tuple(
        PnTransition(
            id=f"t_{idx}_{r.src.value}_to_{r.dst.value}",
            input_place=r.src.value,
            output_place=r.dst.value,
            guard=r.guard,
        )
        for idx, r in enumerate(rules)
    )
    return PetriNet(places=places, transitions=transitions, initial=initial.value)


def reachable_fsm_states(rules: tuple[Rule, ...] = FSM_TABLE, initial: State = State.IDLE) -> set[str]:
    """Compute all states reachable in `FSM_TABLE` via BFS."""
    visited: set[str] = {initial.value}
    queue: deque[str] = deque([initial.value])
    while queue:
        cur = queue.popleft()
        for r in rules:
            if r.src.value == cur and r.dst.value not in visited:
                visited.add(r.dst.value)
                queue.append(r.dst.value)
    return visited


def verify_bisimulation(rules: tuple[Rule, ...] = FSM_TABLE, net: PetriNet | None = None) -> bool:
    """Verify that the FSM transition table and generated PetriNet have identical transition relations."""
    net = net or build_petri_net(rules)
    all_guards = {r.guard for r in rules}

    for state in State:
        # Reset marking to `state`
        for p in net.places:
            net.marking[p] = 1 if p == state.value else 0
        assert net.total_tokens() == 1

        fsm_edges = {(r.src.value, r.dst.value, r.guard) for r in rules if r.src == state}
        net_edges = {
            (t.input_place, t.output_place, t.guard)
            for t in net.enabled_transitions(all_guards)
        }
        if fsm_edges != net_edges:
            return False

    return reachable_fsm_states(rules) == {s.value for s in State}


def render_tla_module(rules: tuple[Rule, ...] = FSM_TABLE) -> str:
    """Generate a complete TLA+ specification (`Guard.tla`) from `FSM_TABLE`."""
    states_set = ", ".join(f'"{s.value}"' for s in State)
    actions_lines: list[str] = []
    for idx, r in enumerate(rules):
        actions_lines.append(
            f'Step_{idx}_{r.src.value}_{r.dst.value} ==\n'
            f'    /\\ state = "{r.src.value}"\n'
            f'    /\\ state\' = "{r.dst.value}"\n'
            f'    /\\ last_guard\' = "{r.guard}"'
        )
    next_disjuncts = " \\/ ".join(
        f"Step_{idx}_{r.src.value}_{r.dst.value}" for idx, r in enumerate(rules)
    )
    body = "\n\n".join(actions_lines)
    return f"""---- MODULE Guard ----
VARIABLES state, last_guard

States == {{{states_set}}}

TypeOK ==
    /\\ state \\in States

Init ==
    /\\ state = "idle"
    /\\ last_guard = "init"

{body}

Next ==
    {next_disjuncts}

Spec == Init /\\ [][Next]_<<state, last_guard>>
====
"""
