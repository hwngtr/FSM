"""Hierarchical Behavior Tree with ReactiveSelector preemption, abort hooks, and 7-state parity."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Protocol

from npc.ai.fsm import eval_guard
from npc.ai.profiles import DEFAULT_PATROL_ROUTE, DEFAULT_PROFILE, GuardProfile
from npc.sim.contracts import Action, DebugView, Intent, Percepts, Vec2


class Status(Enum):
    """Return status of a Behavior Tree node tick."""

    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    RUNNING = "RUNNING"


@dataclass
class Blackboard:
    """Per-agent memory shared across Behavior Tree nodes."""

    percepts: Percepts
    profile: GuardProfile = DEFAULT_PROFILE
    route: tuple[Vec2, ...] = DEFAULT_PATROL_ROUTE
    latch_state: str = "patrol"
    wp_index: int = 0
    active_intent: Intent = field(default_factory=lambda: Intent(Action.WAIT))
    active_leaf: str = "idle"
    trace: list[tuple[str, str]] = field(default_factory=list)
    aborted_nodes: list[str] = field(default_factory=list)


class Node(Protocol):
    """Behavior tree node contract."""

    name: str

    def tick(self, bb: Blackboard) -> Status:
        """Evaluate this node against `bb` and record its status in `bb.trace`."""
        ...

    def abort(self, bb: Blackboard) -> None:
        """Clean up running state when preempted by a higher-priority branch."""
        ...


class Condition:
    """Leaf node that tests a boolean predicate on the Blackboard."""

    def __init__(self, name: str, predicate: Callable[[Blackboard], bool]) -> None:
        self.name = name
        self._predicate = predicate

    def tick(self, bb: Blackboard) -> Status:
        status = Status.SUCCESS if self._predicate(bb) else Status.FAILURE
        bb.trace.append((self.name, status.value))
        return status

    def abort(self, bb: Blackboard) -> None:
        return None


class ActionNode:
    """Leaf node that writes an `Intent` to the Blackboard."""

    def __init__(self, name: str, fn: Callable[[Blackboard], tuple[Status, Intent]]) -> None:
        self.name = name
        self._fn = fn
        self.is_running: bool = False

    def tick(self, bb: Blackboard) -> Status:
        status, intent = self._fn(bb)
        self.is_running = status == Status.RUNNING
        bb.active_intent = intent
        bb.active_leaf = self.name
        bb.latch_state = self.name
        bb.trace.append((self.name, status.value))
        return status

    def abort(self, bb: Blackboard) -> None:
        if self.is_running:
            self.is_running = False
            bb.aborted_nodes.append(self.name)


class Sequence:
    """Composite node that ticks children in order until one fails or runs."""

    def __init__(self, name: str, children: tuple[Node, ...]) -> None:
        self.name = name
        self.children = children
        self._running_child: Node | None = None

    def tick(self, bb: Blackboard) -> Status:
        for child in self.children:
            status = child.tick(bb)
            if status != Status.SUCCESS:
                if self._running_child is not None and self._running_child is not child:
                    self._running_child.abort(bb)
                self._running_child = child if status == Status.RUNNING else None
                bb.trace.append((self.name, status.value))
                return status
        if self._running_child is not None:
            self._running_child.abort(bb)
            self._running_child = None
        bb.trace.append((self.name, Status.SUCCESS.value))
        return Status.SUCCESS

    def abort(self, bb: Blackboard) -> None:
        if self._running_child is not None:
            self._running_child.abort(bb)
            self._running_child = None
            bb.aborted_nodes.append(self.name)


class Selector:
    """Standard fallback selector that ticks children in order until one succeeds or runs."""

    def __init__(self, name: str, children: tuple[Node, ...]) -> None:
        self.name = name
        self.children = children

    def tick(self, bb: Blackboard) -> Status:
        for child in self.children:
            status = child.tick(bb)
            if status != Status.FAILURE:
                bb.trace.append((self.name, status.value))
                return status
        bb.trace.append((self.name, Status.FAILURE.value))
        return Status.FAILURE

    def abort(self, bb: Blackboard) -> None:
        for child in self.children:
            child.abort(bb)


class ReactiveSelector:
    """Priority selector that re-evaluates from child 0 every tick and aborts preempted branches."""

    def __init__(self, name: str, children: tuple[Node, ...]) -> None:
        self.name = name
        self.children = children
        self._active_index: int | None = None

    def tick(self, bb: Blackboard) -> Status:
        for idx, child in enumerate(self.children):
            status = child.tick(bb)
            if status != Status.FAILURE:
                if self._active_index is not None and self._active_index != idx:
                    self.children[self._active_index].abort(bb)
                self._active_index = idx if status == Status.RUNNING else None
                bb.trace.append((self.name, status.value))
                return status
        if self._active_index is not None:
            self.children[self._active_index].abort(bb)
            self._active_index = None
        bb.trace.append((self.name, Status.FAILURE.value))
        return Status.FAILURE

    def abort(self, bb: Blackboard) -> None:
        if self._active_index is not None:
            self.children[self._active_index].abort(bb)
            self._active_index = None
            bb.aborted_nodes.append(self.name)


def _should_chase(bb: Blackboard) -> bool:
    p = bb.percepts
    if eval_guard("player_visible", p, bb.profile):
        return True
    if bb.latch_state in ("chase", "attack") and not eval_guard("lost_sight_long", p, bb.profile):
        return True
    return False


def _should_investigate(bb: Blackboard) -> bool:
    p = bb.percepts
    if eval_guard("heard_sound", p, bb.profile):
        return True
    if bb.latch_state == "investigate" and not eval_guard("arrived_and_quiet", p, bb.profile):
        return True
    return False


def _should_search(bb: Blackboard) -> bool:
    p = bb.percepts
    if bb.latch_state in ("chase", "attack") and eval_guard("lost_sight_long", p, bb.profile):
        return True
    if bb.latch_state == "investigate" and eval_guard("arrived_and_quiet", p, bb.profile):
        return True
    if bb.latch_state == "search" and not eval_guard("search_expired", p, bb.profile):
        return True
    return False


def _should_return(bb: Blackboard) -> bool:
    p = bb.percepts
    if bb.latch_state == "search" and eval_guard("search_expired", p, bb.profile):
        return True
    if bb.latch_state == "return" and not eval_guard("at_route_start", p, bb.profile):
        return True
    return False


def _act_patrol(bb: Blackboard) -> tuple[Status, Intent]:
    wp = bb.route[bb.wp_index % len(bb.route)]
    if bb.percepts.guard_pos.distance_to(wp) < 0.65:
        bb.wp_index = (bb.wp_index + 1) % len(bb.route)
        wp = bb.route[bb.wp_index]
    return Status.RUNNING, Intent(Action.MOVE, target=wp, speed=bb.profile.patrol_speed)


def make_guard_bt() -> Node:
    """Construct the canonical priority-ordered 7-branch guard Behavior Tree."""
    attack_seq = Sequence(
        "seq_attack",
        (
            Condition("cond_visible", lambda bb: eval_guard("player_visible", bb.percepts, bb.profile)),
            Condition("cond_in_range", lambda bb: eval_guard("in_attack_range", bb.percepts, bb.profile)),
            ActionNode(
                "attack",
                lambda bb: (
                    Status.RUNNING,
                    Intent(
                        Action.ATTACK,
                        target=bb.percepts.player_pos or bb.percepts.last_seen_pos,
                        speed=0.0,
                    ),
                ),
            ),
        ),
    )
    chase_seq = Sequence(
        "seq_chase",
        (
            Condition("cond_visible_or_pursuing", _should_chase),
            ActionNode(
                "chase",
                lambda bb: (
                    Status.RUNNING,
                    Intent(
                        Action.MOVE,
                        target=bb.percepts.player_pos or bb.percepts.last_seen_pos or bb.route[0],
                        speed=bb.profile.chase_speed,
                    ),
                ),
            ),
        ),
    )
    investigate_seq = Sequence(
        "seq_investigate",
        (
            Condition("cond_heard_sound", _should_investigate),
            ActionNode(
                "investigate",
                lambda bb: (
                    Status.RUNNING,
                    Intent(
                        Action.MOVE,
                        target=(
                            bb.percepts.sound.origin
                            if bb.percepts.sound
                            else (bb.percepts.last_seen_pos or bb.route[0])
                        ),
                        speed=bb.profile.investigate_speed,
                    ),
                ),
            ),
        ),
    )
    search_seq = Sequence(
        "seq_search",
        (
            Condition("cond_lost_or_arrived", _should_search),
            ActionNode(
                "search",
                lambda bb: (
                    Status.RUNNING,
                    Intent(
                        Action.SCAN,
                        target=bb.percepts.last_seen_pos or bb.percepts.guard_pos,
                        speed=0.0,
                    ),
                ),
            ),
        ),
    )
    return_seq = Sequence(
        "seq_return",
        (
            Condition("cond_search_expired", _should_return),
            ActionNode(
                "return",
                lambda bb: (
                    Status.RUNNING,
                    Intent(Action.MOVE, target=bb.route[0], speed=bb.profile.patrol_speed),
                ),
            ),
        ),
    )
    patrol_seq = Sequence(
        "seq_patrol",
        (
            Condition("cond_route_assigned", lambda bb: len(bb.route) > 0),
            ActionNode("patrol", _act_patrol),
        ),
    )
    idle_act = ActionNode(
        "idle",
        lambda bb: (Status.RUNNING, Intent(Action.WAIT, speed=0.0)),
    )
    return ReactiveSelector(
        "root_selector",
        (attack_seq, chase_seq, investigate_seq, search_seq, return_seq, patrol_seq, idle_act),
    )


def count_bt_nodes(node: Node) -> int:
    """Count total composite and leaf nodes in a Behavior Tree."""
    children = getattr(node, "children", ())
    return 1 + sum(count_bt_nodes(c) for c in children)


class BehaviourTreeController:
    """Controller adapter wrapping the hierarchical Behavior Tree with persistent Blackboard state."""

    name: str = "BT"

    def __init__(
        self,
        root: Node | None = None,
        profile: GuardProfile = DEFAULT_PROFILE,
        route: tuple[Vec2, ...] = DEFAULT_PATROL_ROUTE,
        initial_latch: str = "patrol",
    ) -> None:
        self.root: Node = root or make_guard_bt()
        self.profile: GuardProfile = profile
        self.route: tuple[Vec2, ...] = route
        self._latch_state: str = initial_latch
        self._wp_index: int = 0
        self._last_bb: Blackboard | None = None
        self._last_transition: tuple[str, str, str] | None = None
        self._history: list[tuple[int, str, str, str]] = []

    def tick(self, p: Percepts, dt: float) -> Intent:
        prev_state = self._latch_state
        bb = Blackboard(
            percepts=p,
            profile=self.profile,
            route=self.route,
            latch_state=self._latch_state,
            wp_index=self._wp_index,
        )
        self.root.tick(bb)
        self._latch_state = bb.latch_state
        self._wp_index = bb.wp_index
        self._last_bb = bb
        if bb.active_leaf != prev_state:
            reason = f"preempt:{bb.aborted_nodes[0]}" if bb.aborted_nodes else "bt_priority"
            self._last_transition = (prev_state, bb.active_leaf, reason)
            self._history.append((p.tick, prev_state, bb.active_leaf, reason))
            if len(self._history) > 12:
                self._history.pop(0)
        return bb.active_intent

    def debug(self) -> DebugView:
        if self._last_bb is None:
            return DebugView(self.name, self._latch_state, 0.0, False, None, (), ())
        return DebugView(
            controller_name=self.name,
            state=self._last_bb.active_leaf,
            alert=self._last_bb.percepts.alert,
            visible=self._last_bb.percepts.player_visible,
            transition=self._last_transition,
            bt_stack=tuple(self._last_bb.trace),
            history=tuple(self._history),
        )
