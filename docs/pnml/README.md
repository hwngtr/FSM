# Guard FSM PNML exports

The four PNML files model the same guard state machine with profile-specific guard labels:

- `guard-standard.pnml`
- `guard-aggressive.pnml`
- `guard-cautious.pnml`
- `guard-observant.pnml`

Each file contains seven places, seventeen transitions, and one initial token in `IDLE`. Every transition has one input arc and one output arc. The labels use thresholds from that guard profile. The generator reads `src/npc/ai/fsm.py` and `src/npc/ai/profiles.py`.

## Verification evidence

- The Petri-net/FSM bisimulation check passes in `tests/test_formal_equivalence.py`.
- The one-token mutual-exclusion test passes in the same test file.
- FSM and behavior-tree traces agree across the modeled seven-state lifecycle.
- `experiments/summary.json` reports 100% mean trace agreement across 240 seeded episodes and 52,800 ticks, covering four profiles and two controllers.
- The TLA+ specification is generated. Model checking was not verified.

## PNML limits

PNML labels document the Python guard conditions. WoPeD's standard token game does not evaluate those conditions. In WoPeD, the arcs and markings show the state-machine structure, but firing is not profile-aware. The profile metadata and verification summary are stored in an `OpenCode` `toolspecific` block. WoPeD may ignore that custom metadata.

Regenerate the exports with:

```bash
PYTHONPATH=src /usr/bin/python3 tools/export-guard-pnml.py
```
