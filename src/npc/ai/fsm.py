"""7-state Finite State Machine controller and single-source-of-truth transition table."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Callable

from npc.sim.contracts import Action, DebugView, Intent, Percepts, Vec2


class State(StrEnum):
    """Canonical 7 NPC guard states required by Project 2."""

    IDLE = "idle"
    PATROL = "patrol"
    INVESTIGATE = "investigate"
    CHASE = "chase"
    ATTACK = "attack"
    SEARCH = "search"
    RETURN = "return"


@dataclass(frozen=True)
class Rule:
    """Priority-ordered transition rule `(src, dst, guard_name)`."""

    src: State
    dst: State
    guard: str


ATTACK_RANGE: float = 1.2
LOST_SIGHT_LIMIT: int = 45
SEARCH_DURATION_LIMIT: int = 90

# Single source of truth for runtime FSM, Petri net builder, PNML export, and TLA+ spec.
FSM_TABLE: tuple[Rule, ...] = (
    Rule(State.IDLE, State.CHASE, "player_visible"),
    Rule(State.IDLE, State.INVESTIGATE, "heard_sound"),
    Rule(State.IDLE, State.PATROL, "route_assigned"),
    Rule(State.PATROL, State.CHASE, "player_visible"),
    Rule(State.PATROL, State.INVESTIGATE, "heard_sound"),
    Rule(State.INVESTIGATE, State.CHASE, "player_visible"),
    Rule(State.INVESTIGATE, State.SEARCH, "arrived_and_quiet"),
    Rule(State.CHASE, State.ATTACK, "in_attack_range"),
    Rule(State.CHASE, State.SEARCH, "lost_sight_long"),
    Rule(State.ATTACK, State.CHASE, "out_of_range"),
    Rule(State.ATTACK, State.SEARCH, "lost_sight_long"),
    Rule(State.SEARCH, State.CHASE, "player_visible"),
    Rule(State.SEARCH, State.INVESTIGATE, "heard_sound"),
    Rule(State.SEARCH, State.RETURN, "search_expired"),
    Rule(State.RETURN, State.CHASE, "player_visible"),
    Rule(State.RETURN, State.INVESTIGATE, "heard_sound"),
    Rule(State.RETURN, State.PATROL, "at_route_start"),
)

GUARDS: dict[str, Callable[[Percepts], bool]] = {
    "route_assigned": lambda p: True,
    "player_visible": lambda p: p.player_visible,
    "heard_sound": lambda p: p.sound is not None and p.sound.age_ticks <= 30,
    "arrived_and_quiet": lambda p: p.arrived_at_target and not p.player_visible,
    "in_attack_range": lambda p: p.player_visible and p.player_dist <= ATTACK_RANGE,
    "out_of_range": lambda p: p.player_visible and p.player_dist > ATTACK_RANGE,
    "lost_sight_long": lambda p: (not p.player_visible) and p.lost_sight_ticks >= LOST_SIGHT_LIMIT,
    "search_expired": lambda p: (not p.player_visible) and p.search_ticks >= SEARCH_DURATION_LIMIT,
    "at_route_start": lambda p: p.at_route_start,
}


class FsmController:
    """Deterministic table-driven FSM controller."""

    name: str = "FSM"

    def __init__(self, rules: tuple[Rule, ...] = FSM_TABLE, initial: State = State.IDLE) -> None:
        self._rules = rules
        self.state: State = initial
        self._last_transition: tuple[str, str, str] | None = None
        self._history: list[tuple[int, str, str, str]] = []

    def tick(self, p: Percepts, dt: float) -> Intent:
        """Evaluate guards in priority order, transition at most once, and emit Intent."""
        for rule in self._rules:
            if rule.src == self.state and GUARDS[rule.guard](p):
                if rule.dst != self.state:
                    self._last_transition = (self.state.value, rule.dst.value, rule.guard)
                    self._history.append((p.tick, self.state.value, rule.dst.value, rule.guard))
                    if len(self._history) > 12:
                        self._history.pop(0)
                    self.state = rule.dst
                break

        return self._intent_for_state(p)

    def _intent_for_state(self, p: Percepts) -> Intent:
        match self.state:
            case State.IDLE:
                return Intent(Action.WAIT)
            case State.PATROL:
                return Intent(Action.MOVE, target=Vec2(10.0, 5.0), speed=1.0)
            case State.INVESTIGATE:
                target = p.sound.origin if p.sound else p.last_seen_pos
                return Intent(Action.MOVE, target=target, speed=1.25)
            case State.CHASE:
                return Intent(Action.MOVE, target=p.player_pos or p.last_seen_pos, speed=1.75)
            case State.ATTACK:
                return Intent(Action.ATTACK, target=p.player_pos, speed=0.0)
            case State.SEARCH:
                return Intent(Action.SCAN, target=p.last_seen_pos, speed=0.8)
            case State.RETURN:
                return Intent(Action.MOVE, target=Vec2(0.0, 0.0), speed=1.0)

    def debug(self) -> DebugView:
        """Return frozen telemetry for the HUD."""
        return DebugView(
            controller_name=self.name,
            state=self.state.value,
            alert=0.0,
            visible=False,
            transition=self._last_transition,
            bt_stack=(),
            history=tuple(self._history),
        )
