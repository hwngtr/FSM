# NPC behavior system architecture (Project 2)

## Problem

We need a playable 2D stealth prototype where a guard NPC patrols, investigates sounds, chases, searches, and attacks a player under two distinct AI architectures — a 7-state Finite State Machine (FSM) and a hierarchical Behavior Tree (BT) — plus a formal verification layer (Place/Transition Petri net + TLA+ model) and a measurable comparison report. Two constraints make the shape non-obvious:

1. **Fairness and headless speed.** If the world loop couples to `pygame` or if the FSM and BT use different perception/movement code, any performance or behavioral comparison in the report is invalid.
2. **Formal drift.** If the runtime FSM, the Petri net, the TLA+ specification, and the report's state diagram are maintained by hand in four files, they will diverge by week 2.

## Usage (caller's view)

Interactive game loop (`src/npc/main.py`):

```python
from npc.ai.bt import make_guard_bt
from npc.ai.fsm import FSM_TABLE, FsmController
from npc.render.hud import HudOverlay
from npc.sim.entities import Guard, Player
from npc.sim.world import World

world = World.from_preset("warehouse")
guard = Guard(spawn=(12.0, 4.0), facing=0.0, controller=FsmController(FSM_TABLE))
player = Player(spawn=(2.0, 2.0))
world.bind(guard=guard, player=player)

for _ in range(600):
    world.step(dt=1 / 60)
    view = guard.controller.debug()
    # hud.draw(surface, view, world)
```

Headless evaluation and formal verification (`src/npc/experiments/run.py` and `tests/test_bisimulation.py`):

```python
from npc.ai.fsm import FSM_TABLE
from npc.formal.net import build_petri_net, verify_bisimulation
from npc.formal.tla import render_tla_module

net = build_petri_net(FSM_TABLE)
assert verify_bisimulation(FSM_TABLE, net)
tla_source = render_tla_module(FSM_TABLE)
```

## Shape

Data flows strictly one way per tick (`per boundary-discipline` and `per foundational-thinking`):

```
World -> Perception.sample(world) -> Percepts (frozen)
      -> Controller.tick(percepts, dt) -> Intent (frozen)
      -> World.apply(intent, dt)
      -> Controller.debug() -> DebugView (frozen) -> HUD
```

Load-bearing decisions:

1. **Redacted perception boundary (`Percepts.player_pos: Vec2 | None`).** `Perception.sample` sets `player_pos = None` whenever `player_visible` is `False` (`per type-system-discipline`). Neither the FSM nor the BT can accidentally cheat by reading raw world coordinates.
2. **Declarative `FSM_TABLE: tuple[Rule, ...]` as single source of truth.** The runtime `FsmController`, the executable `PetriNet` token game (`src/npc/formal/net.py`), the PNML exporter for WoPeD Next, the Mermaid state diagram, and the TLA+ transition relation (`src/npc/formal/tla.py`) all derive from `FSM_TABLE` (`per build-the-lever`).
3. **Structural preemption via `ReactiveSelector`.** The Behavior Tree re-ticks from the root each frame; when a higher-priority branch changes from `FAILURE` to `RUNNING` or `SUCCESS`, it calls `abort()` on the previously running lower-priority branch.
4. **Shallow, deep interface (`Controller` protocol).** Callers see two methods: `tick(Percepts, dt) -> Intent` and `debug() -> DebugView`. Guard transition prioritization, blackboard memory decay, and Petri net marking updates stay hidden inside `ai/`.

## Synthesis decision

- **Base chosen:** Candidate B's pure-simulation vs. adapter split (`sim/`, `ai/`, `formal/`, `render/`, `experiments/`) combined with Candidate A's single `Controller` protocol.
- **Adapted:** Declarative `FSM_TABLE` rule tuple from the formal-first sketch so Petri net generation and TLA+ codegen require zero AST parsing.
- **Rejected:** Global pub/sub event bus (destroys tick determinism) and a shared `BaseAgent` inheritance hierarchy between FSM and BT (blurs the structural difference the report measures).

## Tradeoffs accepted

- We accept re-evaluating `ReactiveSelector` from the root every tick in exchange for zero-boilerplate interruption handling (`chase` immediately preempts `patrol` without transition arcs).
- We accept discrete symbolic guard predicates (`player_visible`, `heard_sound`, `in_attack_range`, etc.) in `FSM_TABLE` in exchange for an exact 1-to-1 bijection with Petri net transitions and TLA+ actions.

## Alternatives considered

- **Hand-written state methods (`class PatrolState: def update(...)`).** Rejected: hides the transition graph inside imperative `if/else` blocks, making automatic Petri net construction, PNML export, and bisimulation proofs impossible.
- **Encoding the Behavior Tree as a Petri net.** Rejected: BT tick return statuses (`SUCCESS`, `FAILURE`, `RUNNING`) require colored tokens and hierarchical reset arcs, adding ~400 lines of net plumbing that obscure the course's FSM-vs-BT comparison.

## Implementation reconciliation

- Initial scaffold and verified formal core (`sim/`, `ai/fsm.py`, `ai/bt.py`, `formal/net.py`, `formal/tla.py`, and `tests/test_formal_equivalence.py`) match the usage contract above without deviation.

## Open questions and risks

- Which HUD variant from `prototypes/hud-picker.html` (`Glance`, `Console`, or `Inspect`) should be promoted to the default overlay in `src/npc/render/hud.py`, or should `Tab` cycle between `Glance` and `Inspect`?
- Should NPC personality presets (`Aggressive`, `Cautious`, `Observant` — the brief's optional extension) parameterize `PerceptionConfig` thresholds only, or also swap the BT subtree?

## Next implementation step

Verify the HUD prototype picker in the browser (`prototypes/hud-picker.html`) and run `pytest` on the scaffolded `sim/`, `ai/`, and `formal/` modules to confirm FSM-to-Petri-net bisimulation.
