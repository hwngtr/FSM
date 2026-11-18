# NPC Behavior System Architecture (Project 2)

## Problem

We need a playable stealth robbery prototype where a guard NPC patrols a 5-room circuit, detects the player via distance/angle FOV and line-of-sight occlusion, investigates sounds, chases, attacks, searches, and returns to its patrol route under two classical AI architectures — a **7-state Finite State Machine (FSM)** and a **hierarchical Reactive Behavior Tree (BT)** — plus a **1-token Place/Transition Petri net + TLA+ formal layer** and a **measured comparison report**. Two constraints shape the design:

1. **Fairness and headless measurability.** Both controllers must consume the exact same redacted `Percepts` value object and emit the exact same `Intent` command so headless benchmarks (`src/npc/experiments/run.py`) measure only controller decision cost and verify state-trace equivalence.
2. **Zero formal or cross-language drift.** The Python core (`FSM_TABLE`, `PROFILES`), the executable Petri net (`src/npc/formal/net.py`), the TLA+ model (`src/npc/formal/tla/Guard.tla`), the Mermaid diagrams (`docs/diagrams/*.mmd`), and the browser game config (`web/js/guard_config.js`) all derive from a single source of truth via `tools/codegen.py`.

## Usage (Caller's View)

Headless perception + controller loop (`src/npc/experiments/run.py`):

```python
from npc.ai.bt import BehaviourTreeController
from npc.ai.fsm import FSM_TABLE, FsmController, State
from npc.ai.profiles import PROFILES
from npc.sim.contracts import Vec2
from npc.sim.perception import PerceptionMemory, sample_percepts

profile = PROFILES["observant"]
fsm = FsmController(FSM_TABLE, initial=State.PATROL, profile=profile)
bt = BehaviourTreeController(profile=profile, initial_latch="patrol")
memory = PerceptionMemory(alert=0.12)

percepts, memory = sample_percepts(
    tick=1,
    dt=1 / 60,
    guard_pos=Vec2(13.5, 4.5),
    guard_facing=0.0,
    player_pos=Vec2(17.0, 4.5),
    memory=memory,
    profile=profile,
    room_grid_enabled=False,
)
fsm_intent = fsm.tick(percepts, dt=1 / 60)
bt_intent = bt.tick(percepts, dt=1 / 60)
assert fsm.debug().state == bt.debug().state
```

Formal verification and single-source artifact generation (`tools/codegen.py` and `tests/test_formal_equivalence.py`):

```python
from npc.ai.fsm import FSM_TABLE
from npc.formal.net import build_petri_net, render_tla_module, verify_bisimulation

net = build_petri_net(FSM_TABLE)
assert verify_bisimulation(FSM_TABLE, net)
tla_source = render_tla_module(FSM_TABLE)
```

## Shape

Data flows strictly one way per tick:

```
World -> sample_percepts(world, memory, profile) -> Percepts (frozen, redacted)
      -> Controller.tick(percepts, dt)           -> Intent (frozen)
      -> World.apply(intent, dt)
      -> Controller.debug()                      -> DebugView (frozen) -> Glance HUD
```

Load-bearing decisions:

1. **Redacted perception boundary (`Percepts.player_pos: Vec2 | None`).** `sample_percepts` in `src/npc/sim/perception.py` sets `player_pos = None` whenever `player_visible` is `False`. Neither the FSM nor the BT can read unperceived player coordinates.
2. **Alert level as a load-bearing transition gate.** `Percepts.alert` accumulates on visual/auditory contact and decays when quiet. `eval_guard("player_visible", ...)` requires `alert >= profile.alert_detect_threshold` (while a fleeting low-alert glimpse triggers `heard_sound -> investigate`), and `eval_guard("search_expired", ...)` requires `alert <= profile.alert_calm_threshold` before the guard abandons a search.
3. **Declarative `FSM_TABLE` and `PROFILES` as single source of truth.** `src/npc/ai/codegen.py` generates `web/js/guard_config.js`, `src/npc/formal/tla/Guard.tla`, and `docs/diagrams/{fsm,bt,petri}.mmd`. `tests/test_perception_and_parity.py` fails if the browser bundle drifts from Python.
4. **Structural preemption with `.abort()` in `ReactiveSelector`.** Both `src/npc/ai/bt.py` and `web/js/bt.js` implement `ReactiveSelector`, `Selector`, `Sequence`, `Condition`, and `ActionNode`. When a higher-priority branch succeeds or runs, `ReactiveSelector` invokes `.abort(bb)` on the previously running lower-priority branch and records the preemption in `DebugView`.
