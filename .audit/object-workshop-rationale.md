# Object Workshop Design

## User goal

Browse created objects, inspect the source for their models, tweak them, and find the actual model/source link.

## Usage sketch

1. Open the Object Workshop from the market navigation.
2. Browse reusable model definitions or placed instances from the house and market.
3. Select an object to see its real canvas-rendered preview, model data, placement data, and source.
4. Change safe draft values, such as color, size, options, or orientation.
5. Preview the draft and copy the model or placement snippet for source edits.

## Data shape

```js
{
  catalog: {
    models: [{ id, origin, kind, src, line }],
    placements: [{ id, item, modelId, room, src, line }],
    modelById: Map
  },
  ui: { tab, query, selection, entry },
  appliedDraft: { kind, item }
}
```

The catalog is read-only. Draft JSON is parsed into local copies for preview. Applying edits to the source remains a user action through a copied snippet.

## Synthesis decision

Use Candidate B, a dedicated workshop page. It offers space for a searchable catalog, a large model preview, source details, and copyable edits without crowding the live game or constructing heist state. Both candidates reuse the existing `HOUSE.K.drawThing` renderer.

The independent judge scored Candidate B 18/25 and Candidate A 15/25. It identified placed-instance browsing as a gap in both candidates. The synthesis closes that gap by indexing both reusable kinds and placed items from the house and market.

## Scope

- Inspect model definitions and placed instances.
- Render previews through the existing shared canvas model renderer.
- Show model code, source path, source line, and a direct source-file link.
- Permit edits to model and placement JSON drafts, render them through the shared renderer, and provide copyable snippets. Do not write back to game data.
- Do not edit heist logic, collision, or live gameplay state.
- State clearly that the market objects are procedural shape data, not external mesh files.
- Keep the draft editor as plain JSON. Do not add shape-list controls for adding, deleting, or reordering primitives in v1.

## Rejected alternatives

- Candidate A, a drawer in the live market page. It keeps the preview close to gameplay, but adds another complex surface to an already dense page.
- A full primitive-shape editor. It adds scope and risks malformed shape data or unintended painter-order changes.

The JSON draft can edit shape arrays. It uses the shared renderer for previews and does not write changes back to game data. This is an accepted deviation from the initial read-only shape-list sketch because the user asked to inspect and tweak model code.

## AI iteration follow-up

The workshop now supports a provider-neutral, manual AI round trip. The user writes improvement goals, copies a prompt containing the selected model JSON and renderer limits, pastes the prompt into an AI assistant, then pastes the returned JSON into the existing draft and previews it. The page does not call an AI service or handle credentials.

The local checker reports malformed primitive data, unknown colors, empty models, and basic bounds that exceed the declared size. A clean result is not proof of visual realism. Human visual review remains required. This keeps an AI provider out of the static page and keeps source data immutable until the user copies a reviewed model into `market.js`.

AI model drafts now pass a model-specific identity gate before preview or copy. `web/js/model-constraints.js` owns the constraints by model ID. The shopping cart must retain a shallow basket base, an open four-sided metal rail frame, a handle, and four near-floor wheels at the footprint corners. Failed drafts show the missing requirements and preserve the last accepted preview. The prompt includes the same requirements.

Market models can be written to source with the browser File System Access API. The user selects `web/js/market.js`, reviews a confirmation, and the workshop replaces only the selected model value after re-reading that file. `web/js/model-source.js` owns the balanced-object replacement. This avoids a local server endpoint with broad write access. Browsers without the API keep the copy-and-paste path.

## Verification

Open the workshop in the browser at desktop and narrow widths. Verify catalog search, model and placement selection, live preview, draft changes, copy actions, and source links. Run the project smoke and fixture collision checks.
