# Market spawn and shelf layout

- [ ] 1. Reproduce it yourself on the matching surface via the driver skill (Non-negotiables), even when a debug or instrumentation protocol says to ask the user to reproduce. Ask the user only with a stated, specific reason the control surface cannot reach the target, and only after driving it as far as it goes. If it won't reproduce directly, synthesize the trigger, tighten conditions, or instrument until it fires.
- [ ] 2. Binary-search the cause. Form the candidate hypotheses, then rule them out until one survives. Seed them with `how` over the affected subsystem and the **why** skill for regression history. Each pass, take the split that cuts the most remaining problem space, get runtime evidence, eliminate. When program state is unclear, add instrumentation or logging and read it as the code runs. Don't guess. Drive a long or stubborn hunt with Claude Code's `loop` skill. Confirm the surviving *mechanism* with runtime evidence before the step-3 architect/interrogate fan-out.
- [ ] 3. Plan the fix. If it crosses a function boundary, `architect` first. Delegate implementation to a subagent using your configured bug-fix model (default in poteto-mode's Models section) with a specific scope.
- [ ] 4. Verify on the same surface. The original repro now passes. "Inconclusive" or wrong-surface is not a pass. Flag it. Unit tests show branch behavior, not bug absence.
- [ ] 5. Stage the commits so the failing repro lands before the fix in git history. See the **tdd** skill for the failing-test-first cadence when the bug has a cheap local test path. Skip it when the test would be expensive, integration-heavy, or unclear.
- [ ] 6. Run **Opening a PR**.

## Throughput checkpoint

- Blocking first steps: reproduce the leftward spawn block and inventory all fixture overlaps from live market data.
- Independent workstreams: n/a; one market layout registry owns item positions and collision checks consume it.
- Shared mutable state: one owner edits the existing uncommitted market files; do not replace or reset prior edits.
- Smallest safe decomposition: first prove the spawn route and detect same-room fixture overlaps, then reposition the smallest conflicting set on a regular grid.

## Evidence

- Current map has 161 fixtures, including several added decorative rows with hand-placed offsets.
- User memory records a preference for 79 fixtures and a sparse, aligned layout.
