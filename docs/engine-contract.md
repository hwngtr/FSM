# Engine contract

This project uses a custom 2D renderer in plain browser JavaScript. There is no engine manifest. The game-dev router keeps this engine and binds discipline skills to the symbols below.

| Contract | Evidence |
|---|---|
| Build and run | Static files under `web/`. No bundler or `package.json`. Serve with `python3 -m http.server 8765 --directory web`. Test entry point: `tools/smoke-market.mjs` and the gameplay verification scripts. Python suite: `PYTHONPATH=src python3 -m unittest discover -s tests -q`. |
| Lifecycle | `init()` in `web/js/market-app.js` builds `rooms`, `sprites`, `hidden` and `MARKET_DEBUG`, then starts `frame()`. `D.reset()` clears heist state. |
| Time and input | `frame(now)` calls `tick(now)` with `dt` capped at 0.05 s. Gameplay reads key codes in `market-app.js`. |
| State and assets | Fixture definitions live in `MARKET_KINDS` (`web/js/market.js`) and `KINDS_DATA` (`web/js/data.js`). Stable ids key sprites, hidden items and loot. |
| Relevant subsystems | Collision and line of sight: `isBlockedTile`, `canWalk`, `hasLineOfSight` in `market-app.js` and `MARKET_DEBUG`. Navigation: `HOUSE.NavPath.findPath` in `web/js/navpath.js`. Heist rules: `web/js/heist.js`. |

Unknown or not applicable: no engine vendor API, no gamepad or touch device layer, and no raster sprite pipeline. The `create-game-assets` raster QA scripts need PNG files, while this game draws fixtures from shape lists at runtime.
