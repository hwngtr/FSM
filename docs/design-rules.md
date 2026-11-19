# Interface and scene design rules

## Visual language

The game uses a risograph print style: cream paper, a small named-ink palette, visible dither, square corners, and hard offset shadows. Keep interface surfaces in that system. Do not add unrelated gradients, blur, or rounded app chrome.

The same named inks and dither treatment should connect the canvas scene to the HTML interface. Use the canvas for world art. Use semantic HTML for controls, status, and accessibility.

## HUD hierarchy

Show the player the current objective, immediate danger, and next useful action. Use short labels such as **Patrol**, **Hidden**, and **Last transition: idle → patrol**. Keep implementation identifiers such as `p_patrol` and `route_assigned` inside security telemetry.

Place the player's controls on the game view. Keep zoom controls in the lower-right corner. Keep hint text above the zoom controls, within the view width. Keep world-anchored prompts near their actors without blocking the route.

Keep the `@break-ui` stress modes in a collapsed **Debug data** drawer. The drawer must not cover game actions or hints while closed.

## Market scene

Store fixtures are authored in `web/js/market.js`. Fixture geometry, collision footprints, loot positions, and sightlines must stay consistent. Preserve doorway clearance and clear player routes when moving fixtures.

Use a compact zone label that can shrink at narrow widths. Avoid repeating the full mission instructions in the page header, game overlay, and action panel.

## Verification

Run the Python suite and all smoke/gameplay scripts listed in `AGENTS.md`. Inspect both pages at fit and close zoom, desktop and narrow widths. Check the debug drawer, zoom, hints, keyboard controls, and reduced-motion behavior.
