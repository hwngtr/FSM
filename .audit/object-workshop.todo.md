# Object workshop

- [x] 1. `how` over the affected subsystem.
- [x] 2. `architect` for parallel design exploration.
- [x] 3. Write the throughput checkpoint as four todo items. A dimension that genuinely does not apply (single file, no fan-out) keeps its item with `n/a: <reason>` rather than being dropped:
  - **Blocking first steps.** Gates run before fan-out.
  - **Independent workstreams.** Disjoint files, services, or layers parallelize. Shared writes serialize.
  - **Shared mutable state.** Default to splitting the target (the **separate-before-serializing-shared-state** principle skill). Serialize only for real invariants.
  - **Smallest safe decomposition.** If one worker is best, name why.
- [x] 4. Delegate code-writing to a subagent using your configured feature model (default in poteto-mode's Models section) with a specific scope.
- [x] 5. Verify on the matching surface. "Inconclusive" or wrong-surface is not a pass. Flag it.
- [ ] 6. Rebase into small, ordered commits. Stack follow-ups. (skip: user requested a local feature; no commit or PR was requested.)
- [ ] 7. If the design is contested, `interrogate` before shipping. (skip: the independent judge agreed with Candidate B; no design dispute remained.)
- [ ] 8. Run **Opening a PR**. (skip: no commit or PR was requested.)

## Throughput checkpoint

- Blocking first steps: map the model schema and rendering API before choosing preview behavior.
- Independent workstreams: n/a; one browser feature spans one page, one renderer, and its stylesheet.
- Shared mutable state: serialize edits to the existing dirty market page and renderer; keep new UI behavior in one isolated module.
- Smallest safe decomposition: one owner integrates a self-contained inspector module, with a narrow render-preview API and no gameplay-state edits.

## Grounding

- `web/js/market.js` owns placed fixture data and procedural model definitions (`kinds`, `items`, primitive `shapes`).
- `web/js/kinds.js` interprets primitive shape data and draws it through the existing canvas renderer.
- `web/js/market-app.js` owns runtime rendering and caches one sprite per placed fixture.
- `web/market.html` and `web/market.css` own the market page structure and styling.
- There are no external mesh files in the market renderer. The current “3D models” are procedural shape definitions in `market.js`.
- The object workshop should inspect those definitions and provide a direct source link. It should not mutate heist state or claim to save source changes. Tweak controls should produce a copyable placement/model snippet.

## Design selection

- Candidate A: in-game drawer with searchable placed-item list, real canvas preview, definition/source link, and copyable tweak snippet.
- Candidate B: separate object-catalog page with definition cards and an editable code pane.
- Selected: Candidate B, with Candidate A's simpler first-version editing limits.
- Candidate A: inspector drawer embedded in the live market.
- Candidate B: dedicated editor page using the same shared model renderer.
- Reason: the judge scored B 18/25 and A 15/25. B provides more room for the catalog, code, and preview, and keeps changes out of the active heist page.
- Grafts: browse both model definitions and placed instances; reuse `HOUSE.K.drawThing`; show source path/line and a code link; store changes as drafts and copyable snippets only.
- Rejected: A's in-page drawer because the live market panel is already dense. B's initial full shape editor because it expands scope beyond the requested first workshop.
- Accepted deviation: the editable JSON draft can change shape arrays. We omitted add/delete/reorder controls and source persistence, but preserve the user's ability to tweak model code and preview it.
- Shared constraints: do not mutate heist state or collision data; clearly label procedural models and image-backed art; provide a source link and copyable edits.

## Verification

- Python tests: 11 passed.
- Project smoke, market smoke, heist, loop, collision, and AI-trace checks passed.
- `node --check` passed for both workshop scripts.
- Temporary catalog check passed: 104 models, 161 placements, no missing kinds, every source needle found.
- Browser check passed at desktop width and a 386px iframe viewport. Models and placed tabs rendered, draft edits changed the preview, malformed JSON showed an error without clearing the last preview, and source/product links appeared.
- Market and house pages both exposed a workshop link. Browser console reported no errors.
- `git diff --check` passed.
- BLOCKED: independent comment review. The reviewer could not run because OpenCode Models credits were unavailable. No reviewer findings were returned.
