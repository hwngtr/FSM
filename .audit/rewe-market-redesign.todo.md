# REWE market scene redesign

- [x] Ground the current market scene and existing uncommitted changes.
- [x] Define the visual target and observable completion checks.
- [x] Compare scene and product-data designs before implementation.
- [x] Add focused checks for kind coverage, wall order, and fan/lens alignment.
- [x] Refine market fixture colors and product labels.
- [x] Split floor and wall caches; use one camera lens point for fans and lenses.
- [ ] Verify narrow market view. Browser screenshot is unavailable in this session.
- [x] Verify game behavior and desktop market page.
- [x] Preserve unrelated changes and do not commit.

## Scope

- Redesign the market world and fixture assortment to reflect the REWE brief.
- Keep existing controls, HUD, collision, AI, loot, and accessibility behavior.
- Keep the shared risograph visual system required by `AGENTS.md`.
- Include correct wall occlusion and one shared camera/fan anchor.

## Completion predicate

- Market data contains recognizable produce, grocery, chilled, bakery, service-counter, checkout, and entrance fixtures.
- The market renders with the required shared risograph system and stable frame loop.
- A foreground wall covers a nearby fixture, and the CCTV fan apex matches the visible lens point.
- Existing smoke, heist, AI, collision, and Python tests pass.
- Desktop and narrow market views render without browser console errors.

## Throughput checkpoint

- Blocking first steps: inspect existing fixture data, room layout, renderer composition, and baseline checks.
- Independent workstreams: product appearance in `market.js`; renderer and regression checks in the existing checkout.
- Shared mutable state: renderer files stayed in the main checkout; fixture edits were made in an isolated worktree and reviewed before transfer.
- Smallest safe decomposition: keep the existing item model; edit appearance data and split the renderer's existing room base into floor and wall layers.

## Workflow

1. Ground: inspect project instructions, market layout, fixture data, draw order, and baseline status.
2. Sketch: compare one coherent REWE scene-data model with a broader fixture-by-fixture rewrite.
3. Verify harness: add small deterministic checks for wall occlusion and lens/fan agreement.
4. Implement in units: fixture data, renderer layering, then camera anchor, verifying each unit.
5. Verify: run project checks and inspect the actual page at desktop and narrow sizes.

## Baseline evidence

- `node tools/smoke-market.mjs` passes before changes.
- `node tools/verify-market-collision.mjs` passes before changes.
- `http://localhost:8765/market.html?data=demo` loads with no browser console errors.
- The browser snapshot shows existing REWE department labels and controls remain semantic HTML.

## Results

- `node tools/verify-market-collision.mjs` passes, including fixture-kind coverage, wall pass ordering, and all six camera fan/lens checks.
- `node tools/smoke-market.mjs`, `node tools/smoke.mjs`, the market heist/loop and AI trace checks, and all 11 Python tests pass.
- The market page loads at desktop width with no console errors. The browser screenshot tool could not capture the tab, so visual pixel inspection and narrow-width inspection remain unverified.
- No commit was made. Existing unrelated checkout and Project 5/PufferLib changes remain untouched.
