"""Hierarchical Behavior Tree with ReactiveSelector interruption and shared Blackboard."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Protocol

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
    active_intent: Intent = field(default_factory=lambda: Intent(Action.WAIT))
    active_leaf: str = "idle"
    trace: list[tuple[str, str]] = field(default_factory=list)


class Node(Protocol):
    """Behavior tree node contract."""

    name: str

    def tick(self, bb: Blackboard) -> Status:
        """Evaluate this node against `bb` and record its status in `bb.trace`."""
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


class ActionNode:
    """Leaf node that writes an `Intent` to the Blackboard."""

    def __init__(self, name: str, fn: Callable[[Blackboard], tuple[Status, Intent]]) -> None:
        self.name = name
        self._fn = fn

    def tick(self, bb: Blackboard) -> Status:
        status, intent = self._fn(bb)
        bb.active_intent = intent
        bb.active_leaf = self.name
        bb.trace.append((self.name, status.value))
        return status


class Sequence:
    """Composite node that ticks children in order until one fails or runs."""

    def __init__(self, name: str, children: tuple[Node, ...]) -> None:
        self.name = name
        self.children = children

    def tick(self, bb: Blackboard) -> Status:
        for child in self.children:
            status = child.tick(bb)
            if status != Status.SUCCESS:
                bb.trace.append((self.name, status.value))
                return status
        bb.trace.append((self.name, Status.SUCCESS.value))
        return Status.SUCCESS


class ReactiveSelector:
    """Priority selector that re-evaluates from child 0 every tick.

    When a higher-priority branch returns RUNNING or SUCCESS, lower-priority
    branches are preempted automatically (satisfying the interruption requirement).
    """

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


def make_guard_bt() -> Node:
    """Construct the canonical priority-ordered guard Behavior Tree."""
    attack_seq = Sequence(
        "seq_attack",
        (
            Condition("cond_visible", lambda bb: bb.percepts.player_visible),
            Condition("cond_in_range", lambda bb: bb.percepts.player_dist <= 1.2),
            ActionNode(
                "attack",
                lambda bb: (Status.RUNNING, Intent(Action.ATTACK, target=bb.percepts.player_pos, speed=0.0)),
            ),
        ),
    )
    chase_seq = Sequence(
        "seq_chase",
        (
            Condition("cond_visible", lambda bb: bb.percepts.player_visible),
            ActionNode(
                "chase",
                lambda bb: (Status.RUNNING, Intent(Action.MOVE, target=bb.percepts.player_pos, speed=1.75)),
            ),
        ),
    )
    investigate_seq = Sequence(
        "seq_investigate",
        (
            Condition(
                "cond_heard_sound",
                lambda bb: bb.percepts.sound is not None and bb.percepts.sound.age_ticks <= 30,
            ),
            ActionNode(
                "investigate",
                lambda bb: (
                    Status.RUNNING,
                    Intent(
                        Action.MOVE,
                        target=bb.percepts.sound.origin if bb.percepts.sound else None,
                        speed=1.25,
                    ),
                ),
            ),
        ),
    )
    patrol_act = ActionNode(
        "patrol",
        lambda bb: (Status.RUNNING, Intent(Action.MOVE, target=Vec2(10.0, 5.0), speed=1.0)),
    )
    return ReactiveSelector("root_selector", (attack_seq, chase_seq, investigate_seq, patrol_act))


class BehaviourTreeController:
    """Controller adapter wrapping the hierarchical Behavior Tree."""

    name: str = "BT"

    def __init__(self, root: Node | None = None) -> None:
        self.root: Node = root or make_guard_bt()
        self._last_bb: Blackboard | None = None

    def tick(self, p: Percepts, dt: float) -> Intent:
        bb = Blackboard(percepts=p)
        self.root.tick(bb)
        self._last_bb = bb
        return bb.active_intent

    def debug(self) -> DebugView:
        if self._last_bb is None:
            return DebugView(self.name, "idle", 0.0, False, None, (), ())
        return DebugView(
            controller_name=self.name,
            state=self._last_bb.active_leaf,
            alert=self._last_bb.percepts.alert,
            visible=self._last_bb.percepts.player_visible,
            transition=None,
            bt_stack=tuple(self._last_bb.trace),
            history=(),
        )
