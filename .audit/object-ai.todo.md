# Object AI improvement workflow

1. `how` over the affected subsystem. [x]
2. `architect` for parallel design exploration.
   skip: this OpenCode runtime did not provide the configured multi-model architect panel. I chose a provider-neutral copy/paste round trip because the project is a static page with no AI backend or configured credentials.
3. Write the throughput checkpoint as four todo items. A dimension that genuinely does not apply (single file, no fan-out) keeps its item with `n/a: <reason>` rather than being dropped:
   - **Blocking first steps.** Gates run before fan-out.
   - **Independent workstreams.** Disjoint files, services, or layers parallelize. Shared writes serialize.
   - **Shared mutable state.** Default to splitting the target (the **separate-before-serializing-shared-state** principle skill). Serialize only for real invariants.
   - **Smallest safe decomposition.** If one worker is best, name why.
4. Delegate code-writing to a subagent using your configured feature model (default in poteto-mode's Models section) with a specific scope.
   skip: the shared draft/preview state spans the only implementation slice; local uncommitted changes are the baseline and must remain intact.
5. Verify on the matching surface. "Inconclusive" or wrong-surface is not a pass. Flag it. [x]
6. Rebase into small, ordered commits. Stack follow-ups.
7. If the design is contested, `interrogate` before shipping.
8. Run **Opening a PR**.

## Throughput checkpoint
- **Blocking first steps:** Inspect current workshop data flow, model renderer, and available server/runtime. Keep existing uncommitted changes intact.
- **Independent workstreams:** n/a. Prompt export, AI response import, and geometry diagnostics share the selected draft lifecycle; split ownership would serialize on workshop state.
- **Shared mutable state:** Keep source catalog immutable. Prompt context and AI output are text; only explicit apply changes the local draft. No API key or AI response is persisted.
- **Smallest safe decomposition:** One implementation owner is safest because the feature crosses workshop HTML, CSS, and JS with shared draft/preview state.

## Data shape
`ImprovementRequest = { model: JSON, goals: string }`
`ImprovementResponse = JSON model draft` (untrusted until parsed, checked, previewed, and explicitly copied)
`ModelDiagnostics = { errors: string[], warnings: string[] }`

## Design decision
Use provider-neutral prompt copy and response paste, not a direct API connection. This keeps provider choice with the user, works with any AI, does not expose credentials in this static site, and preserves a human approval step. Run deterministic structural and geometry diagnostics locally, but label them as checks rather than proof of visual realism.

## Verification
- Browser: selected `shopping-cart`, copied a goal-specific prompt, ran clean checks, imported and previewed edited JSON, confirmed the catalog source stayed unchanged, and confirmed malformed primitive data was flagged.
- Browser console: no errors.
- Narrow viewport: 386px iframe, single-column layout, no horizontal overflow.
- Project Python suite, smoke checks, heist, loop, collision, and AI trace passed.
- `node --check web/js/workshop.js` and `git diff --check` passed.
