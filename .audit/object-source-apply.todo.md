# Apply accepted model drafts to source

### Feature

**You own the design. Plan, review, verify.** Delegate implementation. Stay in the lead.

1. `how` over the affected subsystem. [x]
2. `architect` for parallel design exploration. (skip: a local browser file picker keeps the write narrowly scoped without adding a server; no independent model panel is configured in this runtime.)
3. Write the throughput checkpoint as four todo items. A dimension that genuinely does not apply (single file, no fan-out) keeps its item with `n/a: <reason>` rather than being dropped:
   - **Blocking first steps.** Gates run before fan-out.
   - **Independent workstreams.** Disjoint files, services, or layers parallelize. Shared writes serialize.
   - **Shared mutable state.** Default to splitting the target (the **separate-before-serializing-shared-state** principle skill). Serialize only for real invariants.
   - **Smallest safe decomposition.** If one worker is best, name why.
4. Delegate code-writing to a subagent using your configured feature model (default in poteto-mode's Models section) with a specific scope. (skip: the shared draft state and existing uncommitted work make one owner safer.)
5. Verify on the matching surface. "Inconclusive" or wrong-surface is not a pass. Flag it. [x]
6. Rebase into small, ordered commits. Stack follow-ups. (skip: no commit requested.)
7. If the design is contested, `interrogate` before shipping. (skip: no competing design evidence surfaced.)
8. Run **Opening a PR**. (skip: no PR requested.)

## Throughput checkpoint
- **Blocking first steps:** Confirm accepted-draft state and exact model source syntax. Preserve all current user changes.
- **Independent workstreams:** n/a. Source selection, parsing, replacement, and confirmation form one write operation.
- **Shared mutable state:** Read the selected file fresh before replacement. Write only one recognized object value after user confirmation.
- **Smallest safe decomposition:** One owner. File picker permission and browser draft state are coupled.

## Data shape
`SourceApply = { modelId, acceptedModel, selectedFileHandle }`
`SourceReplacement = { originalText, updatedText, matchedValueRange }`
Only market model drafts with zero model-constraint errors can enter the write path.

## Verification
- `node tools/test-model-source.mjs` passes. It verifies that the selected model value changes and neighboring source stays intact.
- Browser shows the write action for a market model, blocks it while the draft has unapplied edits, and confirms the File System Access API exists in Chromium.
- Actual source writes were not triggered. They require the user to select a file and approve a confirmation dialog.
