# REWE market redesign

## Problem

The market already has a 12-room route and fixtures for the departments in the REWE brief. Its fixture shapes use generic blocks, and `draw()` paints each room's walls before it paints any standing fixture. CCTV fans start at floor height, while their housings use a raised screen position. The redesign must improve product recognition without changing the room route, loot, collision, line of sight, or AI.

The project rules require the shared risograph system. The work keeps that style and changes the market scene, not the HUD or controls.

## Caller view

`MARKET_CONFIG` remains the market's entry point. Rooms, fixture kinds, product labels, cameras, and loot remain in `web/js/market.js`.

`market-app.js` continues to render rooms from the same config. It draws cached floor canvases first, then floor overlays, then each room's walls, camera housings, standing fixtures, and characters in back-to-front room order.

Each CCTV camera uses one screen-space lens point for both the fan apex and the visible lens.

## Chosen design

Keep the existing room and item data model. Enrich the fixture shapes and color palettes already owned by `MARKET_KINDS`. Use common REWE catalog examples such as apples, bananas, lemons, carrots, tomatoes, milk, yogurt, pasta, coffee, bread, and checkout sweets. Do not reproduce package artwork.

Keep room names as the department labels. They already feed the player-facing zone strip. Do not add a second zone registry or re-key rooms.

Split shell drawing into floor and wall functions in `world.js`. Keep `drawShell()` as the compatibility function that draws both. Add floor-base and wall-base functions in `scene.js`. Keep `drawBase()` and `drawRoom()` for the house page.

Cache floors and walls separately. Draw every floor first so later room canvases cannot erase earlier fixtures. Draw floor overlays next. Then, for each room in the existing back-to-front order, draw its wall cache, camera housing, standing fixtures, and characters. A later room's wall then covers a fixture from the room behind it.

Keep camera geometry in `market-app.js`. One `cameraLens(c)` helper returns the screen point used by both `visionFan()` and the housing lens. The detection rays continue to use the existing floor tile coordinates.

Keep a completeness check for placed fixture kinds. `server-rack` already resolves through the shared `KINDS_DATA` registry, so the market does not need a duplicate definition.

## Why this design

Candidate A proposed a product catalog and planogram generator. It would derive many product shapes, but it adds a product DSL and generator to a fixture library that already uses explicit shape arrays. That extra layer does not help the current 12-room layout enough to justify its cost.

Candidate B proposed splitting cached walls from floors and enriching existing fixture kinds. That directly fixes wall occlusion and keeps the current collision geometry. Use that renderer design, but do not add its second zone registry. Existing room names already provide the player-facing labels.

A flat global painter's list loses the current room-order boundary and needs one depth scale for both rooms and fixtures. It also requires splitting wall geometry into many independently sorted pieces. Reject it for this task.

## Tradeoffs

- The wall split adds one cached canvas and one blit per visible room. Both layers remain cached by device ratio.
- Fixture widths, heights, footprints, and placement stay fixed. Product art changes only the shapes and colors.
- CCTV fans remain floor overlays. The later wall and fixture passes can occlude them, while the camera housing is drawn at the same lens point after its wall.
- The shared `server-rack` definition already resolves all four market placements. Keep the market kind registry free of a duplicate.

## Product references

The official REWE assortment pages list REWE Bio and REWE Regional produce, milk, pasta, chocolate, and coffee. Examples include Bio bananas, lemons, carrots, tomatoes, H-milk, fusilli, and spaghetti. The scene uses these as category and package cues.

- [REWE Bio product range](https://www.rewe.de/marken/eigenmarken/bio/rewe-bio-produkte)
- [REWE milk assortment](https://shop.rewe.de/c/h-milch)
- [REWE pasta assortment](https://shop.rewe.de/c/nudeln)
- [REWE chocolate assortment](https://shop.rewe.de/c/schokolade)
- [REWE brand range](https://www.rewe.de/marken)

## Implementation reconciliation

The data shape did not change. `MARKET_KINDS` still owns fixture appearance, and each item keeps its original id, kind, position, price, and room. Existing produce, gondola, and cart data now use wood and REWE-like colors. Product names call out bananas, carrots, lemons, tomatoes, yogurt, milk, pasta, coffee, and sweets.

`server-rack` is defined by the shared `KINDS_DATA` registry. Do not duplicate it in `MARKET_KINDS`; the market kind-resolution check confirms every placed fixture resolves.

`world.js` exposes floor-only and wall-only shell drawing. `scene.js` keeps the full-base functions for the house page and adds matching split functions for market caches. `market-app.js` draws all cached floors first, then overlays, then each room's walls, camera housings, and standing objects. A single `cameraLens()` result drives both the fan apex and housing lens.

The collision verifier checks placed kind coverage, camera point agreement, and room pass ordering. Existing room topology, fixture sizes, heights, positions, and gameplay data remain unchanged.

## Verification

Run `tools/verify-market-rewe.mjs`, the market smoke, heist, loop, collision, and AI checks, plus the Python test suite. Inspect the real market page at desktop and narrow widths. Confirm no browser console errors.
