"""Unit tests for NPC perception (FOV, LOS, sound, alert gating) and single-source codegen parity."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from npc.ai.bt import BehaviourTreeController
from npc.ai.codegen import build_web_config_dict, render_web_config_js
from npc.ai.fsm import FSM_TABLE, FsmController, State
from npc.ai.profiles import PROFILES
from npc.sim.contracts import Vec2
from npc.sim.perception import (
    ObstacleBox,
    PerceptionMemory,
    SoundSource,
    in_fov_cone,
    sample_percepts,
    sense_sound,
)


class PerceptionAndParityTests(unittest.TestCase):
    """Test perception sensors, alert gating, personality profiles, and JS codegen parity."""

    def test_fov_distance_and_angle_boundaries(self) -> None:
        guard_pos = Vec2(5.0, 5.0)
        std = PROFILES["standard"]

        # Inside cone (dist=4.0 <= 5.4, angle=0.0 <= 0.60)
        vis_in, dist_in, ang_in = in_fov_cone(
            guard_pos, 0.0, Vec2(9.0, 5.0), profile=std, room_grid_enabled=False
        )
        self.assertTrue(vis_in)
        self.assertAlmostEqual(dist_in, 4.0)
        self.assertAlmostEqual(ang_in, 0.0)

        # Outside distance (dist=6.5 > 5.4) for Standard, but inside for Observant (fov=7.2)
        vis_std, _, _ = in_fov_cone(
            guard_pos, 0.0, Vec2(11.5, 5.0), profile=std, room_grid_enabled=False
        )
        vis_obs, _, _ = in_fov_cone(
            guard_pos, 0.0, Vec2(11.5, 5.0), profile=PROFILES["observant"], room_grid_enabled=False
        )
        self.assertFalse(vis_std)
        self.assertTrue(vis_obs)

        # Outside angle (90 deg = 1.57 rad > 0.60 rad) beyond close_proximity
        vis_side, _, _ = in_fov_cone(
            guard_pos, 0.0, Vec2(5.0, 8.0), profile=std, room_grid_enabled=False
        )
        self.assertFalse(vis_side)

    def test_obstacle_box_blocks_line_of_sight(self) -> None:
        guard_pos = Vec2(2.0, 5.0)
        target_pos = Vec2(6.0, 5.0)
        wall = ObstacleBox(3.5, 4.0, 4.5, 6.0)

        vis_clear, _, _ = in_fov_cone(guard_pos, 0.0, target_pos, room_grid_enabled=False)
        vis_blocked, _, _ = in_fov_cone(
            guard_pos, 0.0, target_pos, obstacles=(wall,), room_grid_enabled=False
        )
        self.assertTrue(vis_clear)
        self.assertFalse(vis_blocked)

    def test_percepts_redacts_player_pos_when_unseen(self) -> None:
        mem = PerceptionMemory(alert=0.12)
        p_hidden, _ = sample_percepts(
            tick=1,
            dt=1 / 60,
            guard_pos=Vec2(2.0, 2.0),
            guard_facing=0.0,
            player_pos=Vec2(20.0, 20.0),
            memory=mem,
            room_grid_enabled=False,
        )
        self.assertFalse(p_hidden.player_visible)
        self.assertIsNone(p_hidden.player_pos)

    def test_sound_sensing_and_observant_hearing_scale(self) -> None:
        guard_pos = Vec2(5.0, 5.0)
        distant_coin = SoundSource(origin=Vec2(12.2, 5.0), radius=3.5, age_ticks=3, intensity=1.0)
        # Effective radius: standard = (3.5 + 2.5) * 1.0 = 6.0 < 7.2; observant = 6.0 * 1.4 = 8.4 >= 7.2
        self.assertIsNone(sense_sound(guard_pos, distant_coin, profile=PROFILES["standard"]))
        heard_obs = sense_sound(guard_pos, distant_coin, profile=PROFILES["observant"])
        self.assertIsNotNone(heard_obs)

    def test_alert_level_gates_detection_and_search_expiry(self) -> None:
        cautious = PROFILES["cautious"]  # alert_detect_threshold = 0.40, alert_calm_threshold = 0.40
        fsm = FsmController(FSM_TABLE, initial=State.PATROL, profile=cautious)
        bt = BehaviourTreeController(profile=cautious, initial_latch="patrol")

        # 1. Fleeting glimpse with low alert (0.20 < 0.40) -> enters INVESTIGATE, not CHASE
        from tests.test_formal_equivalence import make_percepts

        glimpse = make_percepts(tick=1, visible=True, dist=3.5, alert=0.20)
        fsm.tick(glimpse, 1 / 60)
        bt.tick(glimpse, 1 / 60)
        self.assertEqual(fsm.debug().state, "investigate")
        self.assertEqual(bt.debug().state, "investigate")

        # 2. Alert rises to 0.45 (>= 0.40) -> escalates INVESTIGATE -> CHASE
        confirmed = make_percepts(tick=2, visible=True, dist=3.2, alert=0.45)
        fsm.tick(confirmed, 1 / 60)
        bt.tick(confirmed, 1 / 60)
        self.assertEqual(fsm.debug().state, "chase")
        self.assertEqual(bt.debug().state, "chase")

        # 3. Lose sight -> enters SEARCH; if search_ticks >= limit but alert=0.65 (> 0.40), stays in SEARCH
        lost = make_percepts(tick=3, visible=False, lost_sight_ticks=40, alert=0.65)
        fsm.tick(lost, 1 / 60)
        bt.tick(lost, 1 / 60)
        self.assertEqual(fsm.debug().state, "search")
        self.assertEqual(bt.debug().state, "search")

        still_hot = make_percepts(tick=4, visible=False, search_ticks=75, alert=0.65)
        fsm.tick(still_hot, 1 / 60)
        bt.tick(still_hot, 1 / 60)
        self.assertEqual(fsm.debug().state, "search")
        self.assertEqual(bt.debug().state, "search")

        # 4. Once alert cools to 0.30 (<= 0.40), search_expired fires -> RETURN
        cooled = make_percepts(tick=5, visible=False, search_ticks=75, alert=0.30)
        fsm.tick(cooled, 1 / 60)
        bt.tick(cooled, 1 / 60)
        self.assertEqual(fsm.debug().state, "return")
        self.assertEqual(bt.debug().state, "return")

    def test_web_guard_config_matches_python_single_source(self) -> None:
        repo_root = Path(__file__).resolve().parent.parent
        js_file = repo_root / "web" / "js" / "guard_config.js"
        self.assertTrue(js_file.exists())
        disk_text = js_file.read_text(encoding="utf-8")
        self.assertEqual(disk_text, render_web_config_js())

        json_part = disk_text.split("window.GUARD_CONFIG = ", 1)[1].rstrip(";\n")
        parsed = json.loads(json_part)
        self.assertEqual(parsed, build_web_config_dict())


if __name__ == "__main__":
    unittest.main()
