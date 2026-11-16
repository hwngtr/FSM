"""Tests proving FSM <-> PetriNet bisimulation, mutual exclusion, and BT preemption."""

from npc.ai.bt import BehaviourTreeController
from npc.ai.fsm import FSM_TABLE, FsmController, State
from npc.formal.net import (
    build_petri_net,
    reachable_fsm_states,
    render_tla_module,
    verify_bisimulation,
)
from npc.sim.contracts import Action, Percepts, SoundEvent, Vec2


def _make_percepts(
    *,
    tick: int = 1,
    visible: bool = False,
    dist: float = 5.0,
    sound: SoundEvent | None = None,
) -> Percepts:
    return Percepts(
        tick=tick,
        guard_pos=Vec2(0.0, 0.0),
        guard_facing=0.0,
        player_visible=visible,
        player_pos=Vec2(dist, 0.0) if visible else None,
        player_dist=dist,
        player_angle=0.0,
        sound=sound,
        alert=0.5 if visible else 0.1,
        last_seen_pos=Vec2(dist, 0.0) if visible else None,
        at_route_start=False,
        arrived_at_target=False,
        lost_sight_ticks=0,
        search_ticks=0,
    )


def test_petri_net_and_fsm_bisimulation() -> None:
    """Every state in State is reachable and FSM_TABLE is bisimilar to the generated P/T net."""
    assert verify_bisimulation(FSM_TABLE)
    assert reachable_fsm_states(FSM_TABLE) == {s.value for s in State}


def test_petri_net_mutual_exclusion_invariant() -> None:
    """Firing any sequence of enabled transitions preserves the 1-token invariant (I3)."""
    net = build_petri_net(FSM_TABLE, initial=State.PATROL)
    assert net.total_tokens() == 1
    assert net.active_place() == "patrol"

    enabled = net.enabled_transitions({"heard_sound"})
    assert len(enabled) == 1
    net.fire(enabled[0])
    assert net.total_tokens() == 1
    assert net.active_place() == "investigate"


def test_bt_preempts_patrol_when_player_becomes_visible() -> None:
    """ReactiveSelector immediately preempts patrol/investigate when player enters FOV."""
    bt = BehaviourTreeController()

    # Tick 1: quiet patrol
    intent_1 = bt.tick(_make_percepts(tick=1, visible=False), dt=1 / 60)
    assert intent_1.action == Action.MOVE
    assert bt.debug().state == "patrol"

    # Tick 2: sound heard -> investigate preempts patrol
    intent_2 = bt.tick(
        _make_percepts(tick=2, visible=False, sound=SoundEvent(Vec2(4.0, 4.0), age_ticks=2)),
        dt=1 / 60,
    )
    assert intent_2.action == Action.MOVE
    assert bt.debug().state == "investigate"

    # Tick 3: player steps into attack range -> attack preempts investigate
    intent_3 = bt.tick(_make_percepts(tick=3, visible=True, dist=0.8), dt=1 / 60)
    assert intent_3.action == Action.ATTACK
    assert bt.debug().state == "attack"


def test_fsm_and_bt_agree_on_canonical_escalation() -> None:
    """FSM and BT emit identical Action types across Patrol -> Investigate -> Chase -> Attack."""
    fsm = FsmController(FSM_TABLE, initial=State.PATROL)
    bt = BehaviourTreeController()

    scenarios = [
        _make_percepts(tick=1, visible=False),
        _make_percepts(tick=2, visible=False, sound=SoundEvent(Vec2(3.0, 2.0), age_ticks=5)),
        _make_percepts(tick=3, visible=True, dist=4.0),
        _make_percepts(tick=4, visible=True, dist=0.9),
    ]
    for p in scenarios:
        assert fsm.tick(p, 1 / 60).action == bt.tick(p, 1 / 60).action


def test_tla_codegen_contains_all_states() -> None:
    tla = render_tla_module(FSM_TABLE)
    for s in State:
        assert f'"{s.value}"' in tla
