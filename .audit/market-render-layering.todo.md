# Market render layering and CCTV anchor fix

- Reproduce the layering and camera-origin defects in the running market page.
- Trace draw order and camera world-to-screen coordinates to the root cause.
- Ground the renderer architecture and state its module responsibilities.
- Sketch at least two wall-layering and camera-anchor designs.
- Compare the designs against small API and visual-order criteria.
- Add a failing behavior check for wall occlusion and camera anchoring.
- Apply the smallest fix supported by the repro.
- Verify both defects on the rendered market page and run relevant checks.
- Preserve unrelated uncommitted work and do not commit.

## Scope

- Market scene wall and fixture draw order.
- CCTV vision fan origin and camera housing placement.
- Automated verification for the two visible behaviors.

## Checklist

- [ ] Reproduce in the running market page.
- [ ] Establish the root causes in the renderer.
- [ ] Compare candidate render-layer designs.
- [ ] Add behavior checks that fail before the fix.
- [ ] Fix layering and camera anchoring.
- [ ] Recheck the page, logs, and relevant test suite.
