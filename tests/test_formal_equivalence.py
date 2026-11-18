"""Unit tests proving FSM <-> PetriNet bisimulation, mutual exclusion, and 7-state BT equivalence."""

from __future__ import annotations

import unittest

from npc.ai.bt import BehaviourTreeController
from npc.ai.fsm import FSM_TABLE, FsmController, State
from npc.formal.net import (
    build_petri_net,
    reachable_fsm_states,
    render_tla_module,
    verify_bisimulation,
)
from npc.sim.contracts import Action, Percepts, SoundEvent, Vec2


def make_percepts(
    *,
    tick: int = 1,
    visible: bool = False,
    dist: float = 5.0,
    sound: SoundEvent | None = None,
    alert: float | None = None,
    arrived_at_target: bool = False,
    at_route_start: bool = False,
    lost_sight_ticks: int = 0,
    search_ticks: int = 0,
) -> Percepts:
    resolved_alert = alert if alert is not None else (0.55 if visible else 0.12)
    return Percepts(
        tick=tick,
        guard_pos=Vec2(13.5, 4.5),
        guard_facing=0.0,
        player_visible=visible,
        player_pos=Vec2(13.5 + dist, 4.5) if visible else None,
        player_dist=dist,
        player_angle=0.0,
        sound=sound,
        alert=resolved_alert,
        last_seen_pos=Vec2(13.5 + dist, 4.5),
        at_route_start=at_route_start,
        arrived_at_target=arrived_at_target,
        lost_sight_ticks=lost_sight_ticks,
        search_ticks=search_ticks,
    )


class FormalEquivalenceTests(unittest.TestCase):
    """Verify formal Petri net invariants and FSM <-> BT behavioral equivalence."""

    def test_petri_net_and_fsm_bisimulation(self) -> None:
        net = build_petri_net(FSM_TABLE)
        self.assertTrue(verify_bisimulation(FSM_TABLE, net))
        self.assertEqual(reachable_fsm_states(FSM_TABLE), {s.value for s in State})

    def test_petri_net_mutual_exclusion_invariant(self) -> None:
        net = build_petri_net(FSM_TABLE, initial=State.PATROL)
        self.assertEqual(net.total_tokens(), 1)
        self.assertEqual(net.active_place(), "patrol")

        enabled = net.enabled_transitions({"heard_sound"})
        self.assertEqual(len(enabled), 1)
        net.fire(enabled[0])
        self.assertEqual(net.total_tokens(), 1)
        self.assertEqual(net.active_place(), "investigate")

    def test_bt_preempts_and_aborts_lower_priority_branch(self) -> None:
        bt = BehaviourTreeController()

        # Tick 1: quiet patrol
        intent_1 = bt.tick(make_percepts(tick=1, visible=False), dt=1 / 60)
        self.assertEqual(intent_1.action, Action.MOVE)
        self.assertEqual(bt.debug().state, "patrol")

        # Tick 2: sound heard -> investigate preempts patrol and records abort
        intent_2 = bt.tick(
            make_percepts(tick=2, visible=False, sound=SoundEvent(Vec2(4.0, 4.0), age_ticks=2)),
            dt=1 / 60,
        )
        self.assertEqual(intent_2.action, Action.MOVE)
        self.assertEqual(bt.debug().state, "investigate")
        self.assertIsNotNone(bt.debug().transition)
        self.assertIn("preempt:", bt.debug().transition[2])

        # Tick 3: player steps into attack range -> attack preempts investigate
        intent_3 = bt.tick(make_percepts(tick=3, visible=True, dist=0.8), dt=1 / 60)
        self.assertEqual(intent_3.action, Action.ATTACK)
        self.assertEqual(bt.debug().state, "attack")

    def test_fsm_and_bt_agree_across_all_seven_states(self) -> None:
        fsm = FsmController(FSM_TABLE, initial=State.PATROL)
        bt = BehaviourTreeController(initial_latch="patrol")

        lifecycle = [
            (make_percepts(tick=1, visible=False), "patrol", Action.MOVE),
            (
                make_percepts(tick=2, visible=False, sound=SoundEvent(Vec2(6.0, 6.0), age_ticks=4)),
                "investigate",
                Action.MOVE,
            ),
            (make_percepts(tick=3, visible=True, dist=3.2), "chase", Action.MOVE),
            (make_percepts(tick=4, visible=True, dist=0.9), "attack", Action.ATTACK),
            (make_percepts(tick=5, visible=True, dist=2.8), "chase", Action.MOVE),
            (make_percepts(tick=6, visible=False, lost_sight_ticks=50), "search", Action.SCAN),
            (
                make_percepts(tick=7, visible=False, search_ticks=95, alert=0.20, at_route_start=False),
                "return",
                Action.MOVE,
            ),
            (make_percepts(tick=8, visible=False, at_route_start=True), "patrol", Action.MOVE),
        ]

        for percepts, expected_state, expected_action in lifecycle:
            fsm_intent = fsm.tick(percepts, 1 / 60)
            bt_intent = bt.tick(percepts, 1 / 60)
            self.assertEqual(fsm.debug().state, expected_state)
            self.assertEqual(bt.debug().state, expected_state)
            self.assertEqual(fsm_intent.action, expected_action)
            self.assertEqual(bt_intent.action, expected_action)

    def test_tla_codegen_contains_all_states(self) -> None:
        tla = render_tla_module(FSM_TABLE)
        for s in State:
            self.assertIn(f'"{s.value}"', tla)


if __name__ == "__main__":
    unittest.main()
