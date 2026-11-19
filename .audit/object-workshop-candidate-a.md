# Object Workshop — Candidate A: "Fixture Inspector" inside the market page

Design sketch for a workshop where the user browses every object in the market,
inspects its procedural 3D model code, tweaks it, and follows a link to the true
source. Candidate A = an inspector panel added to `web/market.html`, not a
separate page. Read-only proposal; no code changed.

## What exists today (observed facts)

- `web/js/market.js` holds `MARKET_KINDS`: ~30 fixture kinds, each pure data —
  `size [w,d]`, `height`, `place`, `colors {slot: swatchName}`, and `shapes`
  (arrays like `{ box: [u,v,z,w,d,h], color: 'frame' }`). Plus `MARKET_HOUSE`
  (12 rooms, ~90 placed items) and `MARKET_LOOT`. It writes
  `globalThis.MARKET_CONFIG` at the end.
- `web/js/kinds.js` is the renderer: `HS.K.drawThing(H, stream, kind, item,
  images)` paints each shape via `PRIM` (box, cyl, cone, ball, pole, panel,
  plant, books, flat, glow, lines, dot). `resolve()` substitutes `$name`
  options and `$w/$d` size tokens. `screenBox()` gives the sprite bounds.
- `web/js/market-app.js` caches sprites: `spriteOf()` renders each item once
  per zoom ratio into an offscreen canvas (`printed()`), keyed by
  `ratio + kind + JSON(at)`. This is the proven preview path to reuse.
- `web/js/data.js` (the original house data) items carry `store`, `url`,
  `source`, and `image` fields. **Market items do not**: market fixtures are
  100% procedural, defined only in `market.js`. The only external visual
  source in the engine is `shape.image` (panel artwork), loaded in
  `loadImages()`; market kinds never use it.
- `web/market.html` + `web/market.css` use a side `<aside class="panel">` with
  riso-card styling (`--card`, `--ink`, dashed dividers, box-shadow cards) and
  a `break-ui-drawer` details element — a ready pattern for a workshop drawer.

## Module boundary (candidate A)

One new file, one touch point; nothing existing moves.

| Unit | Responsibility |
|---|---|
| `web/js/workshop.js` (new) | All workshop logic: catalog build, inspector state, tweak editing, preview render, source links. Reads `globalThis.MARKET_CONFIG` and `HOUSE.K`; writes only its own DOM. |
| `web/market.html` | Load `workshop.js` after `market-app.js`; one new `<details class="workshop-drawer">` in the panel. |
| `web/market.css` | ~60 lines of workshop styles reusing riso card classes. |
| `web/js/market.js`, `kinds.js`, `market-app.js` | **Untouched.** The workshop must not mutate live game state. |

Why inside market.html instead of a separate page: `MARKET_CONFIG`, `HOUSE.K`,
and the sprite-cache technique are all already in scope here; a separate page
would re-load every script and duplicate the `printed()`/`spriteOf` plumbing
(see "vs. separate catalog" below).

## State shape

```js
const WS = {
  mode: 'kinds' | 'placed',      // browse definitions or placed instances
  selected: { kindId, itemId? },
  draft: {                       // per-kind overlay, deep-merged over the kind
    colors: { slot: swatchName },  // only changed slots
    size: [w, d], height,        // optional overrides
    shapes: null,                // read-only in v1; shape arrays display only
  },
  dirtyKinds: Set,               // kinds with an active draft
  faces: ['ne','nw','se','sw'],  // orientation cycling for the preview
  sourceFilter: 'all' | 'procedural' | 'external',
};
```

Rules:

- **Never write into `MARKET_CONFIG`.** Drafts live in a separate overlay;
  rendering resolves `draft` over `kind` with a small local copy of the
  merge logic (kind defaults → draft). A "reset" button drops the overlay.
- No persistence in v1 (no localStorage, no game mutation) — the tweak panel
  exports the draft as JSON the user can paste into `market.js`. This keeps
  the workshop safe while the game runs.
- Selection state is URL-addressable: `market.html#k=gondola-shelf` scrolls
  the catalog and re-opens the inspector on reload.

## Preview path

Reuse the exact market-app pipeline, isolated in the workshop:

1. Build a pseudo-item `{ id: 'ws-<kind>', kind, at: { i:0, j:0, face },
   size: draft.size || kind.size, colors: { ...kind.colors, ...draft.colors } }`.
2. Draw it into a fixed preview canvas via `HOUSE.K.drawThing(P.mkHand(ctx,
   {seed:1}), stream, kind, pseudoItem, {})` — the same call `spriteOf()` uses
   (market-app.js:215). Face cycling changes `at.face` and re-renders, so the
   user sees all four orientations.
3. Render on demand only (input change, face change), never per frame; one
   `requestAnimationFrame` debounce. At DPR ≥ 2 use the same `ratioNow()`
   logic so previews match in-game sprites exactly.
4. Re-render on `media(prefers-reduced-motion)` and on zoom (cheap: sprites
   are one canvas each; redraw is the only cost).

## Tweak controls (highest value first)

1. **Color slot editor** — the big win. Every kind lists its color slots
   (`frame`, `spine`, `priceStrip`, …) as swatch pickers over the 30 named
   inks in `HOUSE.K.SWATCH`. Picking names, never raw inks, matches the
   engine's own rule (kinds.js header comment).
2. **Size + height sliders** — clamped to sane ranges (0.3–4 tiles); preview
   shows the footprint immediately. Warns (does not block) when size grows
   beyond the kind's `reach` padding.
3. **Option editor for `$name` tokens** — `resolve()` substitutes
   `options[name]`; where a kind uses options, show a select. Market kinds
   barely use them; house kinds (`plant style`, `rug pattern`) do, so this
   also readies the tool for the house game.
4. **Shape list inspector** — every shape rendered as one row:
   `#3 box [0.04,0.42,0.14 → 2.72,0.08,1.34] spine`, hover highlights (a
   translucent redraw with that shape emphasized) and shows the line number in
   `market.js`. Editing shape arrays is *display-only* in v1; the row has a
   "copy shape JSON" affordance instead of live mutation, because `drawThing`
   paints painter's-order semantics that naive reordering breaks
   (`backToFront` only runs on flip).

## Source links: procedural vs. external (the required distinction)

Two classes, shown as a badge per kind, never mixed up:

- **Procedural (all ~30 market kinds).** No `url`, no `image`. The true
  source *is* the data in `web/js/market.js`. Link behavior: a
  `market.js:<line>` anchor rendered as a copyable path plus a
  `vscode://file/<abs-path>:<line>` deep link, built only from a static line
  map (or found by regex on load — cheap, ~800 lines). No network fetch, no
  eval, no `href` to user-controlled text.
- **External (art/panel shapes only).** A kind is external iff any shape has
  `image` or the item carries `url`/`source` (as in `data.js`). Then the
  inspector shows the resolved `<img>` thumbnail and the origin URL. Safe
  linking: render the URL as an `<a rel="noopener noreferrer nofollow"
  target="_blank">`, sanitize scheme to `https:` only, never inject the raw
  string into HTML — textContent + href assignment, matching the escaping
  discipline the feed already needs (see the XSS fixtures in
  `MARKET_FIXTURES.worst`).
- If a kind has neither, show "self-contained procedural fixture" instead of
  an empty link — a missing link must not look broken.

## Responsive UI

- Desktop: the existing right panel gains a `<details class="workshop-drawer">`
  below the feed; the preview canvas (max 260px) sits above the color grid.
- Tablet/phone: the drawer becomes full-width; preview canvas uses
  `aspect-ratio: 4/3` with `width: 100%`; swatches wrap in a grid
  (`repeat(auto-fill, minmax(44px, 1fr))`); the shape list scrolls
  internally at `max-height: 40vh`. No hover-only interactions — highlight
  also fires on `focus`/tap. Matches the coarse-pointer care already in
  market-app (`COARSE` flag).
- `prefers-reduced-motion`: no preview animations, face changes snap.

## Why candidate A beats a separate catalog page

1. **Zero duplication of the render stack.** A catalog page must re-include
   data.js, guard_config, bt, heist, kinds, press, world… and reimplement
   `printed()`/`spriteOf`/`ratioNow`. Candidate A calls them where they live.
   (A leaner catalog could load only `market.js`+`kinds.js`+press/world, but
   even that re-duplicates the sprite-cache and DPR logic.)
2. **Same page as the game the objects belong to.** A tweak's real test is
   "does it read well at zoom 0.18 among neighbours?" — the user can look at
   the store two meters away from the tweak, then export the draft.
3. **Single URL, single deep-link scheme.** `#k=<kind>` anchors work for both
   inspector state and source jumps; a second page splits state.
4. **Costs one file and one drawer**, not a new route, not a second
   stylesheet beyond ~60 lines.
   Trade-off, stated honestly: the game bundle grows by ~8–10 KB and the
   workshop shares the page's console/perf budget. A future split is cheap
   because all logic is already in one file with no game-state writes.

## Out of scope (explicit)

- Saving tweaks into the game, editing `MARKET_HOUSE` placements, or adding
  new kinds/shapes. Shape-array mutation. Any network call. Any change to
  `market.js`, `kinds.js`, `market-app.js`.
