# The Heist at Dither's House — Smart NPC Behavior System (61CSE327 Project 2)

Playable isometric stealth robbery prototype and formal AI comparison implementing a **7-State Finite State Machine (FSM)**, a **1-Token Place/Transition Petri Net**, a **TLA+ Specification**, and a **Reactive Behavior Tree (BT)** across four NPC Guard personalities (**Standard**, **Aggressive**, **Cautious**, **Observant**).

---

## Quick Start

### 1. Play the Stealth Game Prototypes
Both pages work over `file://` with zero build step, or through the local server.

- **House heist (graded Project 2 build):** `web/index.html`
- **Frischemarkt shoplifting simulation:** `web/market.html`

```bash
# Open the files directly:
xdg-open /home/hwngtr/Projects/npc-stealth/web/index.html
xdg-open /home/hwngtr/Projects/npc-stealth/web/market.html
# Or serve them over HTTP, then open /index.html or /market.html:
python3 -m http.server 8765 --directory web
```

**Controls (both):**
- **WASD / Arrow Keys / Click floor tile:** Sneak through the 9-room house
- **Click gold-outlined valuable / Press `E` or `Space`:** Steal nearby loot (`$5,000` quota unlocks the Front Door in the Studio)
- **Press `Q` (or `Shift + Click`):** Toss a decoy coin to emit an acoustic ring and lure the Guard AI
- **Hold `Shift`:** Sprint (faster movement, emits footstep noise rings)
- **`Guard: FSM` / `Guard: BT` button:** Live-swap the Guard's brain between the 7-state FSM and the Reactive Behavior Tree mid-heist
- **`Trait: Standard` button:** Cycle NPC Guard personality (`Standard` → `Aggressive` → `Cautious` → `Observant`) and watch the FOV cone and alert thresholds adapt in real time
- **`AI Thief Bot` button:** Let an autonomous thief agent play against the Guard AI

### Frischemarkt Heist — Supermarket Stealth Heist

A second, self-contained level using the same riso-print engine. It is a slow stealth heist, not a grab-and-run. The floor plan follows REWE merchandising as a counter-clockwise guided path:

1. **Entrance · Obst & Gemüse · Pfand** — red arch, produce islands, trolley, Pfand machine.
2. **Frühstück, Backwaren & Trockenwaren** — 1.6 m low shelves, pasta beside sauces, bakery.
3. **Kühlregal & Frischetheken** — dairy coolers on the right wall and staffed service counters.
4. **Getränkemarkt & Wein** — beverages, wholesale pallets, and the locked spirits vitrine.
5. **Drogerie & Tiefkühl** — chest freezer and action-table goods before checkout.
6. **Kassenzone · SCO · EAS** — staffed lanes, self-checkout, impulse shelf, and a separate exit.

The screen stays calm. The twelve-zone floor plan keeps the store readable, and the HUD shows one heat spine, a five-step heist checklist, and one status line. Detailed telemetry sits behind a disclosure.

**The heist loop.** Your bag holds at most six goods. Stealing, de-tagging, cutting CCTV power and forcing the vitrine are timed actions. Hold still and stay out of sight until each one completes. Moving or being seen cancels it. Crouch with `C` to move slower, cut vision-based heat by 55%, and cool 70% faster. The plan has five objectives: cut CCTV power, force the spirits vitrine, steal €190, strip every RF tag, and leave through the EAS gate. Quota needs the high-value vitrine goods, so the vitrine is mandatory. Getting caught ends the run.

NPC navigation uses grid BFS (`web/js/navpath.js`), ported from the FSM supermarket build. The browser also exposes a bounded tick trace through `MARKET_DEBUG.trace()`. See `docs/merge-notes.md` for the full merge record.

Each department is stocked with its own goods: bread and coffee in breakfast, chilled milk and cheese in dairy, wine crates in the beverage annexe, deli counters in wet sales, and impulse shelves at checkout. The detective carries a small floating threat pip instead of a label box.

Stealing needs line of sight to the goods. A wall or shelf between you and an item blocks the action, so standing near a product on the other side of a partition does not take it.

The checkout zone and EAS exit sit at the far bottom-right corner of the 4x3 plan. The NPC readout above the detective is a compact 136x30 px tag, so it does not hide the floor.

**Collision.** Walls and every stand-on-floor object block the player. Each fixture is one solid rectangle, so there is no walkable seam between adjacent shelf tiles. Rooms are crossed only through the doorway band (local tile 4, with an epsilon for floating-point drift), and the detective and staff steer to that doorway before crossing. The player slides along walls instead of passing through them. Every stand-on-floor object is solid, including the de-tagger and small props. Only the entrance arch, EAS gate and wall signs stay walk-through. Patrol waypoints sit on clear tiles, and both NPCs sidestep around fixtures instead of wedging against them.

**One heat signal.** Every sensor feeds a single heat value. The detective's FOV adds 0.52 per second, each CCTV camera 0.17, staff 0.13, sprinting 0.05, and each RF tag 0.035. Heat decays 0.07 per second when unseen, or 0.12 while crouched. Six tiers read Calm, Curious, Suspicious, Searching, Lockdown and Exposure. Higher tiers sweep cameras faster, widen the detective's FOV and speed patrols. Exposure plus close contact ends the run. Motion zones in the back aisles add heat while you move.

**Security factors.** Three sweeping CCTV cameras relay sightings to the detective. Six of ten goods carry an RF tag, and crossing the EAS gate with a tag fires a recoverable alarm at 100% heat. Staff patrol a five-point route with a narrow vision cone. The de-tagger sits in the Security Office at the bottom right.

The page keeps the `Guard: FSM / Guard: BT` switch, four personality traits, Glance HUD tether, AI Shoplifter Bot, and the 5-mode `@break-ui` switcher. A nav link returns to the graded house build.

### 2. Run the Unit & Formal Verification Suite (Zero External Dependencies)
```bash
PYTHONPATH=src /usr/bin/python3 -m unittest discover -s tests -v
```

### 3. Run the Browser Smoke Tests & Full Market Gameplay Loop
```bash
node tools/smoke.mjs                 # house page, 5 @break-ui modes
node tools/smoke-market.mjs          # market page, 5 @break-ui modes
node tools/verify-market-heist.mjs   # heat tiers, detection sources, channels, bag, objectives
node tools/verify-market-loop.mjs    # timed steal -> RF alarm -> de-tag -> clean escape
node tools/verify-market-collision.mjs # walls, fixtures, doorways, AI patrol
node tools/verify-ai-trace.mjs       # FSM state flicker and guard stall over 1800 ticks
```

The engine contract is in `docs/engine-contract.md`. Game-dev skills from
`gamedev-skills/awesome-gamedev-agent-skills` are installed only in
`.agents/skills/` inside this repo. They cover AI, level design, input, UI,
assets and docs. Run the checks at the end of each skill when you change that
subsystem.

### 4. Re-run Headless Benchmarks & Regenerate Diagrams / Config
```bash
/usr/bin/python3 tools/codegen.py
PYTHONPATH=src /usr/bin/python3 src/npc/experiments/run.py
```

---

## Project 2 Syllabus Rubric Mapping

| Requirement | Implementation & Deliverable Location |
|---|---|
| **1. NPC Perception System** (distance, angle FOV, LOS occlusion, sound sensing, visibility/distance/alert conditions) | `src/npc/sim/perception.py` (`in_fov_cone`, `has_room_line_of_sight`, `sense_sound`, `sample_percepts`) and `web/app.js` (`hasLineOfSight` with furniture occlusion, FOV cone rendering). Tested in `tests/test_perception_and_parity.py`. |
| **2. Finite State Machine** (7 states: `idle`, `patrol`, `investigate`, `chase`, `attack`, `search`, `return`; conflict-free transitions) | `src/npc/ai/fsm.py` (`FSM_TABLE`, `FsmController`) + 1-token Petri net mutual exclusion proof (`src/npc/formal/net.py`) + TLA+ spec (`src/npc/formal/tla/Guard.tla`). |
| **3. Behavior Tree** (`Selector`, `ReactiveSelector`, `Sequence`, `Condition`, `ActionNode`, priority selection, preemption via `.abort()`) | `src/npc/ai/bt.py` (`make_guard_bt`, `BehaviourTreeController`) and `web/js/bt.js` (`GUARD_BT`). Tested in `tests/test_formal_equivalence.py`. |
| **4. Architectural Comparison** (complexity, readability, extensibility experiment, 52,800-tick performance benchmark) | `docs/comparison.md`, `src/npc/experiments/run.py`, `experiments/results.csv`, and `experiments/summary.json`. |
| **Deliverable: FSM Diagram** | `docs/diagrams/fsm.mmd`, `docs/diagrams/fsm.svg`, `docs/diagrams/fsm.png` |
| **Deliverable: Behavior Tree Diagram** | `docs/diagrams/bt.mmd`, `docs/diagrams/bt.svg`, `docs/diagrams/bt.png` |
| **Deliverable: Petri Net Diagram (Bonus)** | `docs/diagrams/petri.mmd`, `docs/diagrams/petri.svg`, `docs/diagrams/petri.png` |
| **Extension: NPC Personalities** (`Standard`, `Aggressive`, `Cautious`, `Observant`) | `src/npc/ai/profiles.py` (`GuardProfile`, `PROFILES`), codegen to `web/js/guard_config.js`, interactive `Trait` button in `web/index.html`. |

---

## Repository Layout

```
npc-stealth/
├── docs/
│   ├── architecture.md          # System architecture & boundary contracts
│   ├── comparison.md            # Full FSM vs. BT comparison report with measured tables
│   └── diagrams/                # Generated Mermaid (.mmd), SVG (.svg), and PNG (.png) diagrams
├── experiments/
│   ├── results.csv              # 240-episode (52,800-tick) benchmark raw dataset
│   └── summary.json             # Aggregated complexity, extensibility, and tick-cost metrics
├── src/npc/
│   ├── sim/
│   │   ├── contracts.py         # Vec2, Percepts, Intent, DebugView, Controller protocol
│   │   └── perception.py        # FOV cone, obstacle/doorway LOS, hearing, alert dynamics
│   ├── ai/
│   │   ├── profiles.py          # GuardProfile presets (Standard, Aggressive, Cautious, Observant)
│   │   ├── fsm.py               # 7-state FSM_TABLE and FsmController
│   │   ├── bt.py                # ReactiveSelector, Selector, Sequence, Condition, ActionNode
│   │   └── codegen.py           # Single-source generator for JS config, TLA+, and Mermaid
│   ├── formal/
│   │   ├── net.py               # Place/Transition PetriNet engine & bisimulation verifier
│   │   └── tla/Guard.tla        # Generated TLA+ specification
│   └── experiments/
│       └── run.py               # Headless benchmark & extensibility evaluator
├── tests/
│   ├── test_formal_equivalence.py
│   └── test_perception_and_parity.py
├── tools/
│   ├── codegen.py               # CLI to regenerate derived artifacts from FSM_TABLE
│   ├── smoke.mjs                # Headless Node smoke test (house pages, 5 @break-ui modes)
│   ├── smoke-market.mjs         # Headless Node smoke test (market page, 5 @break-ui modes)
│   └── verify-market-loop.mjs   # End-to-end shoplifting mechanic test
└── web/                         # Playable isometric riso-print games
    ├── index.html               # The Heist at Dither's House (graded Project 2 build)
    ├── market.html              # Frischemarkt Heist (supermarket shoplifting simulation)
    ├── market.css
    ├── style.css
    ├── app.js
    └── js/
        ├── guard_config.js      # Auto-generated from Python FSM_TABLE & PROFILES
        ├── bt.js                # Browser Behavior Tree runtime
        ├── market.js            # Supermarket fixtures, floorplan, loot, CCTV & routes
        ├── market-app.js        # Market game loop and security systems
        └── ...                  # Riso-print isometric engine modules
```

## Credits & Attribution

- Isometric riso-print rendering engine (`web/js/{press,world,kinds,robot,scene}.js`, Bayer dithering, and `Kevin Serif` / `Kevin Sans` typography) adapted from **Dither's House (`bot-house`)**.
- AI controllers (`FSM`, `BT`, `PetriNet`, `TLA+`), perception sensors, heist stealth mechanics, Glance HUD tether, and headless benchmark suite built from scratch for `61CSE327` Project 2.
