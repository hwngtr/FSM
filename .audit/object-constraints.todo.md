# Preserve model identity during AI edits

1. Reproduce the loss of model identity on the workshop surface. [x]
   Before the fix, replacing the cart with one blue box returned “No structural or basic geometry issues found.”
2. Define model-specific invariants as data, not scattered checks.
3. Add a failing regression case for a cart reduced to a box. [x]
4. Block apply when identity constraints fail, and preserve the last good preview. [x]
5. Verify the cart and existing workshop behavior in the browser. [x]

## Verification
- `node tools/test-model-constraints.mjs` passes for the baseline cart, a one-box substitution, a closed frame, a deep basket, and missing corner coverage.
- Browser applies the baseline cart, blocks the one-box substitution with specific errors, and keeps the prior 232×212 preview.
- Browser confirms the accepted baseline applies and the console has no errors.

## Data shape
`ModelConstraint = { requiredColors, features, wheelLayout, promptRules }`
`ConstraintResult = { errors: string[] }`

## Throughput checkpoint
- **Blocking first steps:** reproduce with the live workshop; preserve current uncommitted files.
- **Independent workstreams:** n/a. Constraint data, validation, apply gate, and prompt rules form one model contract.
- **Shared mutable state:** constraints inspect a draft copy; they never mutate catalog or game data.
- **Smallest safe decomposition:** keep validation pure and gate only model draft application; one owner avoids racing over the shared workshop preview.
