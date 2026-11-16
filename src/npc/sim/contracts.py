"""Core simulation value objects: Vec2, Percepts, Intent, DebugView, and Controller protocol."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol


class Action(StrEnum):
    """Discrete motor command emitted by an NPC controller."""

    MOVE = "move"
    ATTACK = "attack"
    SCAN = "scan"
    WAIT = "wait"
    INTERACT = "interact"


@dataclass(frozen=True)
class Vec2:
    """2D world coordinate or vector."""

    x: float
    y: float

    def distance_to(self, other: Vec2) -> float:
        """Return Euclidean distance between two points."""
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5


@dataclass(frozen=True)
class SoundEvent:
    """Auditory stimulus perceived by a guard."""

    origin: Vec2
    age_ticks: int
    intensity: float = 1.0


@dataclass(frozen=True)
class Percepts:
    """Redacted sensor snapshot passed to a Controller on each tick.

    `player_pos` is guaranteed to be `None` whenever `player_visible` is `False`.
    """

    tick: int
    guard_pos: Vec2
    guard_facing: float
    player_visible: bool
    player_pos: Vec2 | None
    player_dist: float
    player_angle: float
    sound: SoundEvent | None
    alert: float
    last_seen_pos: Vec2 | None
    at_route_start: bool
    arrived_at_target: bool
    lost_sight_ticks: int
    search_ticks: int
    hp: int = 100


@dataclass(frozen=True)
class Intent:
    """Immutable command returned by a Controller."""

    action: Action
    target: Vec2 | None = None
    speed: float = 1.0


@dataclass(frozen=True)
class DebugView:
    """Read-only telemetry snapshot consumed by the HUD overlay."""

    controller_name: str
    state: str
    alert: float
    visible: bool
    transition: tuple[str, str, str] | None
    bt_stack: tuple[tuple[str, str], ...]
    history: tuple[tuple[int, str, str, str], ...]


class Controller(Protocol):
    """Single seam between the deterministic world and any AI architecture."""

    name: str

    def tick(self, p: Percepts, dt: float) -> Intent:
        """Advance decision logic by one tick and return an Intent."""
        ...

    def debug(self) -> DebugView:
        """Return a read-only telemetry view for the HUD and experiment logger."""
        ...
