"""NPC Guard personality profiles and canonical patrol route configuration."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from npc.sim.contracts import Vec2

DEFAULT_PATROL_ROUTE: tuple[Vec2, ...] = (
    Vec2(13.5, 4.5),   # r2: living room (route start)
    Vec2(13.5, 13.5),  # r4: office
    Vec2(4.5, 13.5),   # r3: kitchen
    Vec2(5.5, 4.5),    # r1: studio
    Vec2(21.5, 21.5),  # r9: music room
)


@dataclass(frozen=True)
class GuardProfile:
    """Parameterized perception and decision thresholds for an NPC Guard personality."""

    id: str
    label: str
    summary: str
    fov_distance: float = 5.4
    fov_half_angle: float = 0.60
    close_proximity: float = 1.25
    hearing_scale: float = 1.00
    sound_memory_ticks: int = 30
    attack_range: float = 1.38
    lost_sight_limit: int = 45
    search_duration_limit: int = 90
    alert_detect_threshold: float = 0.25
    alert_calm_threshold: float = 0.35
    alert_gain_rate: float = 0.85
    alert_decay_rate: float = 0.14
    patrol_speed: float = 0.82
    investigate_speed: float = 1.05
    chase_speed: float = 1.24

    def to_dict(self) -> dict[str, Any]:
        """Serialize profile to a JSON-compatible dictionary."""
        return asdict(self)


PROFILES: dict[str, GuardProfile] = {
    "standard": GuardProfile(
        id="standard",
        label="Standard",
        summary="Balanced patrol guard (5.4t FOV, 69° cone, 1.38t tackle).",
    ),
    "aggressive": GuardProfile(
        id="aggressive",
        label="Aggressive",
        summary="Fast pursuit, hair-trigger alert (0.15), wide 1.85t tackle, persistent chase.",
        fov_distance=5.2,
        fov_half_angle=0.58,
        close_proximity=1.45,
        hearing_scale=1.05,
        sound_memory_ticks=36,
        attack_range=1.85,
        lost_sight_limit=65,
        search_duration_limit=115,
        alert_detect_threshold=0.15,
        alert_calm_threshold=0.25,
        alert_gain_rate=1.20,
        alert_decay_rate=0.09,
        patrol_speed=0.92,
        investigate_speed=1.18,
        chase_speed=1.42,
    ),
    "cautious": GuardProfile(
        id="cautious",
        label="Cautious",
        summary="Verifies noises before committing (0.40 alert gate), shorter chase, careful search.",
        fov_distance=4.8,
        fov_half_angle=0.52,
        close_proximity=1.15,
        hearing_scale=1.15,
        sound_memory_ticks=40,
        attack_range=1.20,
        lost_sight_limit=32,
        search_duration_limit=60,
        alert_detect_threshold=0.40,
        alert_calm_threshold=0.40,
        alert_gain_rate=0.65,
        alert_decay_rate=0.20,
        patrol_speed=0.76,
        investigate_speed=0.95,
        chase_speed=1.12,
    ),
    "observant": GuardProfile(
        id="observant",
        label="Observant",
        summary="Long 7.2t eagle-eye vision, wide 96° FOV cone, 1.40x acute hearing.",
        fov_distance=7.2,
        fov_half_angle=0.84,
        close_proximity=1.60,
        hearing_scale=1.40,
        sound_memory_ticks=45,
        attack_range=1.38,
        lost_sight_limit=55,
        search_duration_limit=105,
        alert_detect_threshold=0.18,
        alert_calm_threshold=0.30,
        alert_gain_rate=1.10,
        alert_decay_rate=0.11,
        patrol_speed=0.84,
        investigate_speed=1.10,
        chase_speed=1.26,
    ),
}

DEFAULT_PROFILE: GuardProfile = PROFILES["standard"]
