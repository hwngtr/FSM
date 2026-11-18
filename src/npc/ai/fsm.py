"""7-state Finite State Machine controller and single-source-of-truth transition table."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Callable

from npc.ai.profiles import DEFAULT_PATROL_ROUTE, DEFAULT_PROFILE, GuardProfile
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


# Canonical default thresholds exported from DEFAULT_PROFILE for single-source parity.
ATTACK_RANGE: float = DEFAULT_PROFILE.attack_range
LOST_SIGHT_LIMIT: int = DEFAULT_PROFILE.lost_sight_limit
SEARCH_DURATION_LIMIT: int = DEFAULT_PROFILE.search_duration_limit

# Single source of truth for runtime FSM, Petri net builder, web codegen, and TLA+ spec.
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


def eval_guard(guard_name: str, p: Percepts, profile: GuardProfile = DEFAULT_PROFILE) -> bool:
    """Evaluate a named symbolic guard predicate against `Percepts` and `GuardProfile`."""
    match guard_name:
        case "route_assigned":
            return True
        case "player_visible":
            return p.player_visible and p.alert >= profile.alert_detect_threshold
        case "heard_sound":
            has_recent_sound = p.sound is not None and p.sound.age_ticks <= profile.sound_memory_ticks
            fleeting_glimpse = p.player_visible and p.alert < profile.alert_detect_threshold
            return has_recent_sound or fleeting_glimpse
        case "arrived_and_quiet":
            return p.arrived_at_target and not p.player_visible
        case "in_attack_range":
            return p.player_visible and p.player_dist <= profile.attack_range
        case "out_of_range":
            return (p.player_visible and p.player_dist > profile.attack_range) or (
                not p.player_visible and p.lost_sight_ticks < profile.lost_sight_limit
            )
        case "lost_sight_long":
            return (not p.player_visible) and p.lost_sight_ticks >= profile.lost_sight_limit
        case "search_expired":
            return (
                (not p.player_visible)
                and p.search_ticks >= profile.search_duration_limit
                and p.alert <= profile.alert_calm_threshold
            )
        case "at_route_start":
            return p.at_route_start
        case _:
            raise KeyError(f"Unknown FSM guard predicate: {guard_name}")


GUARDS: dict[str, Callable[[Percepts], bool]] = {
    name: (lambda p, _n=name: eval_guard(_n, p, DEFAULT_PROFILE))
    for name in (
        "route_assigned",
        "player_visible",
        "heard_sound",
        "arrived_and_quiet",
        "in_attack_range",
        "out_of_range",
        "lost_sight_long",
        "search_expired",
        "at_route_start",
    )
}


class FsmController:
    """Deterministic table-driven FSM controller with waypoint patrol and profile thresholds."""

    name: str = "FSM"

    def __init__(
        self,
        rules: tuple[Rule, ...] = FSM_TABLE,
        initial: State = State.IDLE,
        profile: GuardProfile = DEFAULT_PROFILE,
        route: tuple[Vec2, ...] = DEFAULT_PATROL_ROUTE,
    ) -> None:
        self._rules = rules
        self.state: State = initial
        self.profile: GuardProfile = profile
        self.route: tuple[Vec2, ...] = route or DEFAULT_PATROL_ROUTE
        self._wp_index: int = 0
        self._last_transition: tuple[str, str, str] | None = None
        self._history: list[tuple[int, str, str, str]] = []
        self._last_alert: float = 0.0
        self._last_visible: bool = False

    def tick(self, p: Percepts, dt: float) -> Intent:
        """Evaluate guards in priority order, transition at most once, and emit Intent."""
        self._last_alert = p.alert
        self._last_visible = p.player_visible

        for rule in self._rules:
            if rule.src == self.state and eval_guard(rule.guard, p, self.profile):
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
                return Intent(Action.WAIT, speed=0.0)
            case State.PATROL:
                wp = self.route[self._wp_index]
                if p.guard_pos.distance_to(wp) < 0.65:
                    self._wp_index = (self._wp_index + 1) % len(self.route)
                    wp = self.route[self._wp_index]
                return Intent(Action.MOVE, target=wp, speed=self.profile.patrol_speed)
            case State.INVESTIGATE:
                target = p.sound.origin if p.sound else (p.last_seen_pos or self.route[0])
                return Intent(Action.MOVE, target=target, speed=self.profile.investigate_speed)
            case State.CHASE:
                target = p.player_pos or p.last_seen_pos or self.route[0]
                return Intent(Action.MOVE, target=target, speed=self.profile.chase_speed)
            case State.ATTACK:
                return Intent(Action.ATTACK, target=p.player_pos or p.last_seen_pos, speed=0.0)
            case State.SEARCH:
                return Intent(Action.SCAN, target=p.last_seen_pos or p.guard_pos, speed=0.0)
            case State.RETURN:
                return Intent(Action.MOVE, target=self.route[0], speed=self.profile.patrol_speed)

    def debug(self) -> DebugView:
        """Return frozen telemetry for the HUD."""
        return DebugView(
            controller_name=self.name,
            state=self.state.value,
            alert=self._last_alert,
            visible=self._last_visible,
            transition=self._last_transition,
            bt_stack=(),
            history=tuple(self._history),
        )
