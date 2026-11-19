# Object Workshop: Judgment of Candidates A and B

Read-only judgment. No code changed.

## Facts I checked in the repo

- `web/js/market.js` (849 lines) has **zero** `image` or `url` fields. All ~30 market kinds are procedural. The `MARKET_KINDS` and `MARKET_HOUSE` objects are indented, so they sit inside a wrapper. The file sets `globalThis.MARKET_CONFIG` at line 822.
- `web/js/data.js` holds the house items. The `art` kind uses `"image":"item"` (line 607). Placed art items carry `url`, `store`, `artist`, and `image` (e.g. `art/aic-108583.png`).
- `web/js/kinds.js` line 91 resolves `s.image === 'item'` against `c.item.image`, so the image path is real.
- `web/js/market-app.js` lines 183-215 hold `ratioNow`, `printed`, and `spriteOf`, the sprite-cache pipeline that candidate A proposes to reuse.
- `web/market.html` loads `js/market.js?v=7`, then `js/kinds.js`. Candidate A's line-number map must tolerate the cache-buster and the wrapper indentation.

## Scores (1 to 5)

| Criterion | A: inspector in market page | B: separate catalog route |
|---|---|---|
| 1. Placed instances and reusable definitions | **2.** Mentions a `placed` mode in state, but no design for listing or editing the ~90 `MARKET_HOUSE` placements. Mostly kinds. | **3.** The catalog is built from kinds plus items, with `anyItem` provenance. Still does not specify how placed market items are listed. Better than A, not complete. |
| 2. Procedural code and source links, concrete and honest | **3.** Honest: a `market.js:<line>` anchor plus a `vscode://` link, and "self-contained procedural fixture" instead of an empty link. Line map comes from a regex and is fragile. | **4.** Honest classifier (`procedural`, `procedural-options`, `image-backed`) and an explicit "no mesh files" statement. Has an in-tool source viewer and "copy path". Provenance by text-matching `'name':` misses unquoted keys like the ones in `market.js`. |
| 3. Useful edits, faithful preview, copyable changes | **3.** Color, size, height, and options are useful. Shape editing is display-only, which is safe. Preview reuses the exact `spriteOf` path, so it is faithful. Export is a paste-able JSON draft. | **4.** Full overlay plus shape editing, face rotation, and snippet or full-kind copy. Preview uses the same `drawThing`. Risk: shape mutation is large, and the painter's-order concern A raised applies. |
| 4. No coupling to or mutation of heist gameplay | **3.** Makes no writes, but lives on the game page, so it shares the live heist bundle and the HUD budget. | **4.** Separate page loads only the shared renderer and data. No game state is constructed. Still loads `kinds.js`, `press.js`, `world.js`, which is acceptable. |
| 5. Fit with UI and renderer, maintenance cost | **4.** One new file, one drawer, about 60 lines of CSS. Cheap. | **2-3.** New HTML, CSS, `model-index.js`, `workshop.js`, a viewport helper, and a shape editor. Duplicates navigation, which the earlier rejection named. Higher cost, but still reuses `HS.K.drawThing`. |

Totals: **A = 15/25 (about 3.0). B = 18/25 (about 3.6).**

## Recommendation

**Base: Candidate B.** It covers the criteria better: an honest provenance model, a source viewer, and the stronger decoupling. Its page-level isolation also matches the "do not mutate heist gameplay" rule.

**Grafts from A:**
1. Keep shape-array editing display-only for v1. Ship "copy shape JSON" first, and add live mutation only after painter's-order tests pass.
2. Reuse A's `spriteOf` cache-key logic (`ratio + kind + JSON(at)`) for thumbnails in the catalog. Do not write a second cache.
3. Use A's `vscode://file/...:<line>` deep link plus a copyable path, in addition to B's viewer.
4. Use A's URL-hash state (`#k=<kind>`) for deep links into the catalog.
5. Use A's wording for procedural items with no link: "self-contained procedural fixture".

**Corrections to B before building:**
- Its `image-backed` example is the house `art` kind. Market kinds never use `image`, so the classifier correctly tags every market kind as procedural. Say so in the catalog, and do not imply market art exists.
- Replace the `'name':` text-match with a regex that also accepts unquoted keys, or compute line numbers at build time from a static map.
- Fetching `js/market.js` as text fails under `file://`. Either document that the workshop needs an HTTP server, or fall back to the filename only.
- Handle the `?v=7` cache-buster when matching sources.

## Risks

- **B scope creep:** the full shape editor is the largest cost. Ship in stages: browse, source, colors and size, then snippets, then shapes.
- **Placed instances:** neither design fully specifies how to browse the ~90 `MARKET_HOUSE` placements. This is the main gap. Add a "placed" tab to B, reading `MARKET_HOUSE` as data, with no writes.
- **Image-backed art:** the artist's `url` must stay behind the scheme allowlist and a confirm step, as B says.
- **Preview fidelity:** a synthetic `id` keeps seeded primitives stable (`plant`, `books`, `abstract`). Test that the preview matches the in-game sprite at the same zoom.
- **Duplication:** B's viewport helper and A's sprite cache must not both exist. Pick one.
