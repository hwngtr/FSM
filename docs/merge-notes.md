# Merge notes: FSM-main.zip

Source: `/home/hwngtr/Downloads/FSM-main.zip`, extracted to a scratch directory for review.

## Direction

This repo stays the base. The Frischemarkt UI stays the only UI. The zip's browser and desktop interfaces were not copied, because the request was to replace them with ours. Its server-driven Python simulation was not copied, because our Python layer is already the single source for the FSM, BT, Petri net, TLA+ spec, and browser config.

## Ported

| Improvement | Source in the zip | Destination here |
|---|---|---|
| Grid BFS pathfinding | `src/npc/sim/store.py`, `path()` and `neighbors()` | `web/js/navpath.js`, used by `moveToward()` in `web/js/market-app.js` |
| Nearest reachable tile fallback | same BFS, unreachable-target handling | `findPath()` falls back to the closest reached tile |
| Bounded per-tick trace | `Store.tick_log` and `/api/trace` | `MARKET_DEBUG.trace()` and `clearTrace()` in `web/js/market-app.js` |
| Doorway band matches the drawn gap | three-tile doorways in `_floor()` | `canWalk()` now uses the engine's visual gap `3.55..5.45` instead of a narrow epsilon around tile 4 |

The BFS grid uses the centre of each 9x9 tile. A move between two adjacent centres is legal only when our own `canWalk()` agrees, so walls, doorways and solid fixtures hold by construction. The old sidestep logic remains as a fallback for an unreachable goal.

## Deliberately not ported

- **Two floors and staircases.** Our layout is now twelve zones on one 4x3 floor, and the REWE guided path depends on it.
- **Direct overhead 2D view.** Our riso renderer is isometric. Adding a second projection would mean a second renderer, not a UI swap.
- **Server-driven shared simulation.** Ours runs locally with no server. The Python layer generates browser config instead.
- **Pygame desktop client.** Out of scope for the browser UI.
- **Look Around experiment patches.** They are prototypes in the zip, not enabled in its shipped game.
- **Event report bus with witnessed tiles.** Useful, but it would change our detection semantics and the heat tests. Left as a possible later change.

## Verification

All existing suites pass after the port: 11 Python tests, house smoke, market smoke, heist domain, full heist loop, and collision. The collision suite now also asserts that every stand-on-floor object is solid and that both NPCs reach every patrol waypoint without stalling.

## Later expansion (swarm design)

A four-worker design swarm proposed the larger level. Rank-all aggregation kept the 4x3 grid, nine new procedural fixture kinds, six new loot items, and the low-risk visual changes. Room ids r1 to r6 stayed put to avoid stale room references. The grid size is now derived from `house.rooms` instead of hardcoded. The audit in this merge also found and fixed a line-of-sight bug that let diagonal rooms see through two solid walls, in both `market-app.js` and `src/npc/sim/perception.py`.

## Player feedback pass

Checkout moved to the far store edge by swapping r6 and r12 origins. The NPC bubble was reduced to a 136x30 px tag. Solid fixtures now block as one rectangle, removing the seam between adjacent shelf tiles that let the player slip through products. Tile clearance was set to 0.45 so every tile centre stays reachable by BFS.

## Readout and stocking pass

The NPC readout became a floating pip with transparent background and no border. Stealing now requires `hasLineOfSight` to the target item, with the target item ignored as its own occluder. Each department gained four themed fixtures; three were moved off patrol waypoints and three off doorway approaches after the collision suite caught them. A new assertion checks that every internal doorway stays crossable.
