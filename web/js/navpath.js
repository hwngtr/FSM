// Grid BFS navigation, ported from the FSM supermarket simulation.
// The grid is the centre of each 9x9 tile. A move between two tile centres is
// legal only when the game's own canWalk() agrees, so walls, doorways and solid
// fixtures are respected by construction.
(function (HS) {
'use strict';

const tileKey = (x, y) => x + ',' + y;
const centre = (t) => [t[0] + 0.5, t[1] + 0.5];

function findPath(canWalk, cols, rows, fromI, fromJ, toI, toJ) {
  const start = [Math.floor(fromI), Math.floor(fromJ)];
  const goal = [Math.floor(toI), Math.floor(toJ)];
  const startKey = tileKey(start[0], start[1]);
  let goalKey = tileKey(goal[0], goal[1]);
  if (startKey === goalKey) return [goal];

  const queue = [start];
  const prev = new Map([[startKey, null]]);
  let best = null, bestDist = Infinity, head = 0;
  while (head < queue.length) {
    const at = queue[head++];
    const [ai, aj] = centre(at);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = at[0] + dx, ny = at[1] + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const key = tileKey(nx, ny);
      if (prev.has(key)) continue;
      if (!canWalk(ai, aj, nx + 0.5, ny + 0.5)) continue;
      prev.set(key, at);
      queue.push([nx, ny]);
      const dist = Math.hypot(nx + 0.5 - toI, ny + 0.5 - toJ);
      if (dist < bestDist) { bestDist = dist; best = [nx, ny]; }
    }
  }
  if (!prev.has(goalKey)) {
    if (!best) return null;
    goalKey = tileKey(best[0], best[1]);
  }
  const path = [];
  let cur = goalKey.split(',').map(Number);
  while (cur) {
    path.push(cur);
    cur = prev.get(tileKey(cur[0], cur[1]));
  }
  return path.reverse();
}

function follow(e, canWalk, move, cols, rows, goalI, goalJ, stepLen) {
  const goalKey = Math.floor(goalI) + ',' + Math.floor(goalJ);
  if (!e.nav || e.nav.goal !== goalKey) {
    const path = findPath(canWalk, cols, rows, e.I, e.J, goalI, goalJ);
    e.nav = { goal: goalKey, path: path || [], idx: 0, failed: !path };
  }
  const nav = e.nav;
  if (nav.failed || nav.idx >= nav.path.length) {
    e.nav = null;
    return false;
  }
  const [wx, wy] = centre(nav.path[nav.idx]);
  const di = wx - e.I, dj = wy - e.J, d = Math.hypot(di, dj);
  if (d < 0.2) {
    nav.idx++;
    return nav.idx < nav.path.length;
  }
  return move(e, di / d, dj / d, Math.min(stepLen, d));
}

HS.NavPath = { findPath, follow, centre };
})(globalThis.HOUSE || (globalThis.HOUSE = {}));
