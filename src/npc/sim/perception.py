"""NPC perception system: FOV distance/angle cone, line-of-sight occlusion, hearing, and alert dynamics."""

from __future__ import annotations

import math
from dataclasses import dataclass, replace

from npc.ai.profiles import DEFAULT_PROFILE, GuardProfile
from npc.sim.contracts import Percepts, SoundEvent, Vec2

ROOM_SIZE: float = 9.0


@dataclass(frozen=True)
class ObstacleBox:
    """Axis-aligned obstacle or wall box `(x0, y0, x1, y1)` that blocks line of sight."""

    x0: float
    y0: float
    x1: float
    y1: float

    def intersects_segment(self, a: Vec2, b: Vec2, samples: int = 16) -> bool:
        """Return True if segment `a -> b` passes through this box."""
        for step in range(1, samples):
            u = step / samples
            px = a.x + (b.x - a.x) * u
            py = a.y + (b.y - a.y) * u
            if self.x0 <= px <= self.x1 and self.y0 <= py <= self.y1:
                return True
        return False


@dataclass(frozen=True)
class SoundSource:
    """World-emitted sound wave before guard auditory filtering."""

    origin: Vec2
    radius: float
    age_ticks: int = 0
    intensity: float = 1.0


@dataclass(frozen=True)
class PerceptionMemory:
    """Persistent sensor memory carried by a guard across ticks."""

    alert: float = 0.12
    last_seen_pos: Vec2 | None = None
    lost_sight_ticks: int = 0
    search_ticks: int = 0


def normalize_angle(rad: float) -> float:
    """Wrap angle in radians into `[-pi, pi]`."""
    return (rad + math.pi) % (2.0 * math.pi) - math.pi


def relative_bearing(guard_pos: Vec2, guard_facing: float, target_pos: Vec2) -> float:
    """Return signed angular offset in `[-pi, pi]` from `guard_facing` to `target_pos`."""
    dx = target_pos.x - guard_pos.x
    dy = target_pos.y - guard_pos.y
    world_angle = math.atan2(dy, dx)
    return normalize_angle(world_angle - guard_facing)


def has_room_line_of_sight(
    guard_pos: Vec2,
    target_pos: Vec2,
    obstacles: tuple[ObstacleBox, ...] = (),
    room_grid_enabled: bool = True,
) -> bool:
    """Check whether the guard has unobstructed line of sight to `target_pos`.

    Combines explicit obstacle boxes with the 9x9 room-and-doorway topology used
    in the isometric house.
    """
    for box in obstacles:
        if box.intersects_segment(guard_pos, target_pos):
            return False

    if not room_grid_enabled:
        return True

    gx_room = math.floor(guard_pos.x / ROOM_SIZE)
    gy_room = math.floor(guard_pos.y / ROOM_SIZE)
    tx_room = math.floor(target_pos.x / ROOM_SIZE)
    ty_room = math.floor(target_pos.y / ROOM_SIZE)
    if gx_room == tx_room and gy_room == ty_room:
        return True
    if abs(gx_room - tx_room) + abs(gy_room - ty_room) != 1:
        return False

    local_gx = guard_pos.x % ROOM_SIZE
    local_gy = guard_pos.y % ROOM_SIZE
    local_tx = target_pos.x % ROOM_SIZE
    local_ty = target_pos.y % ROOM_SIZE
    in_band = lambda v: 2.6 < v < 6.4
    # Only the band on the axis of the shared wall is open. The other band
    # must not grant sight across two walls at a diagonal corner.
    if gx_room != tx_room:
        return in_band(local_gy) and in_band(local_ty)
    return in_band(local_gx) and in_band(local_tx)


def in_fov_cone(
    guard_pos: Vec2,
    guard_facing: float,
    target_pos: Vec2,
    profile: GuardProfile = DEFAULT_PROFILE,
    obstacles: tuple[ObstacleBox, ...] = (),
    room_grid_enabled: bool = True,
) -> tuple[bool, float, float]:
    """Evaluate distance, signed bearing, and visibility for `target_pos`.

    Returns `(visible, distance, rel_angle)`.
    """
    dist = guard_pos.distance_to(target_pos)
    rel_angle = relative_bearing(guard_pos, guard_facing, target_pos)
    within_cone = dist <= profile.fov_distance and abs(rel_angle) <= profile.fov_half_angle
    within_proximity = dist <= profile.close_proximity
    if not (within_cone or within_proximity):
        return False, dist, rel_angle

    los = has_room_line_of_sight(
        guard_pos,
        target_pos,
        obstacles=obstacles,
        room_grid_enabled=room_grid_enabled,
    )
    return los, dist, rel_angle


def sense_sound(
    guard_pos: Vec2,
    sound_source: SoundSource | None,
    profile: GuardProfile = DEFAULT_PROFILE,
) -> SoundEvent | None:
    """Filter a world `SoundSource` through the guard's hearing radius and memory limit."""
    if sound_source is None:
        return None
    if sound_source.age_ticks > profile.sound_memory_ticks:
        return None
    effective_radius = (sound_source.radius + 2.5) * profile.hearing_scale
    dist = guard_pos.distance_to(sound_source.origin)
    if dist > effective_radius:
        return None
    attenuation = max(0.2, 1.0 - (dist / max(0.1, effective_radius)))
    return SoundEvent(
        origin=sound_source.origin,
        age_ticks=sound_source.age_ticks,
        intensity=round(sound_source.intensity * attenuation, 3),
    )


def sample_percepts(
    *,
    tick: int,
    dt: float,
    guard_pos: Vec2,
    guard_facing: float,
    player_pos: Vec2,
    memory: PerceptionMemory,
    profile: GuardProfile = DEFAULT_PROFILE,
    sound_source: SoundSource | None = None,
    current_state: str = "patrol",
    target_pos: Vec2 | None = None,
    route_start: Vec2 = Vec2(13.5, 4.5),
    obstacles: tuple[ObstacleBox, ...] = (),
    room_grid_enabled: bool = True,
) -> tuple[Percepts, PerceptionMemory]:
    """Sample world state into a redacted `Percepts` snapshot and updated `PerceptionMemory`.

    Enforces boundary redaction: `Percepts.player_pos` is `None` whenever `player_visible` is `False`.
    """
    visible, dist, rel_angle = in_fov_cone(
        guard_pos,
        guard_facing,
        player_pos,
        profile=profile,
        obstacles=obstacles,
        room_grid_enabled=room_grid_enabled,
    )
    sensed_sound = sense_sound(guard_pos, sound_source, profile=profile)

    alert = memory.alert
    last_seen = memory.last_seen_pos
    lost_sight_ticks = memory.lost_sight_ticks
    search_ticks = memory.search_ticks

    if visible:
        last_seen = player_pos
        lost_sight_ticks = 0
        search_ticks = 0
        proximity_boost = 1.35 if dist <= profile.close_proximity * 1.5 else 1.0
        alert = min(1.0, max(alert, profile.alert_detect_threshold) + dt * profile.alert_gain_rate * proximity_boost)
    else:
        lost_sight_ticks += 1
        if current_state == "search":
            search_ticks += 1
        else:
            search_ticks = 0

        if sensed_sound is not None:
            last_seen = sensed_sound.origin
            sound_floor = min(0.85, max(0.42, profile.alert_detect_threshold + 0.22 * sensed_sound.intensity))
            alert = max(alert, sound_floor)
        else:
            alert = max(0.08, alert - dt * profile.alert_decay_rate)

    arrived_at_target = (
        guard_pos.distance_to(target_pos) <= 0.80 if target_pos is not None else False
    )
    at_route_start = guard_pos.distance_to(route_start) <= 0.85

    new_memory = replace(
        memory,
        alert=round(alert, 4),
        last_seen_pos=last_seen,
        lost_sight_ticks=lost_sight_ticks,
        search_ticks=search_ticks,
    )

    percepts = Percepts(
        tick=tick,
        guard_pos=guard_pos,
        guard_facing=guard_facing,
        player_visible=visible,
        player_pos=player_pos if visible else None,
        player_dist=dist,
        player_angle=rel_angle,
        sound=sensed_sound,
        alert=new_memory.alert,
        last_seen_pos=last_seen,
        at_route_start=at_route_start,
        arrived_at_target=arrived_at_target,
        lost_sight_ticks=lost_sight_ticks,
        search_ticks=search_ticks,
    )
    return percepts, new_memory
