# Project guide

## Design rules

- Keep both game pages on the shared riso-print system in `web/style.css`: paper, named inks, square corners, hard shadows, and patterned fills.
- Keep the canvas for the world and semantic HTML for controls, status, and accessibility.
- Keep player-facing HUD labels short and human-readable. Put FSM, Petri net, and trace detail in the telemetry disclosure.
- Anchor overlays to the game view. Keep fixed controls clear of zoom buttons, hints, and world prompts at narrow widths.
- Keep market fixtures in `web/js/market.js` data. Collision, sightline, loot, and placement checks must agree with those fixture bounds.
- Keep stress fixtures available through the collapsed Debug data drawer. Do not remove the `@break-ui` modes.
- Do not move Project 2 deliverables or merge unrelated Project 5 or PufferLib work into this repository.

## Verification

Run these checks after changing gameplay or interface code:

```bash
PYTHONPATH=src /usr/bin/python3 -m unittest discover -s tests -v
node tools/smoke.mjs
node tools/smoke-market.mjs
node tools/verify-market-heist.mjs
node tools/verify-market-loop.mjs
node tools/verify-market-collision.mjs
node tools/verify-ai-trace.mjs
```

For visual changes, inspect both `web/index.html` and `web/market.html` at desktop and narrow viewport sizes. Check fit and close zoom, keyboard controls, and reduced motion.

## Generated files

`src/npc/ai/profiles.py` and the source model modules are authoritative. `tools/codegen.py` generates browser configuration and formal/diagram artifacts. Do not hand-edit generated files to change model behavior; update the source and regenerate instead.
