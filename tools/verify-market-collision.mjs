import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, '../web');
const scripts = [
  'js/data.js', 'js/guard_config.js', 'js/bt.js', 'js/heist.js', 'js/detection.js', 'js/navpath.js', 'js/market.js',
  'js/press.js', 'js/world.js', 'js/kinds.js', 'js/robot.js', 'js/scene.js',
  'js/market-app.js',
];

delete globalThis.HOUSE;
delete globalThis.GUARD_CONFIG;
delete globalThis.GUARD_BT;
delete globalThis.MARKET_CONFIG;
const elements = new Map();
function makeEl() {
  return {
    width: 1400, height: 900, hidden: false, textContent: '', title: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {} }, toDataURL: () => '',
    getContext: () => new Proxy({}, { get(_, p) {
      if (p === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (p === 'createPattern') return () => ({ setTransform() {} });
      return () => {};
    } }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1400, height: 900 }),
    addEventListener() {}, setAttribute() {}, replaceChildren() {}, toggleAttribute() {}, append() {},
  };
}
globalThis.window = globalThis;
globalThis.window.addEventListener = () => {};
globalThis.window.devicePixelRatio = 1;
globalThis.window.innerWidth = 1400;
globalThis.window.innerHeight = 900;
globalThis.location = { href: 'http://localhost/market.html?data=demo', search: '?data=demo' };
globalThis.history = { replaceState() {} };
globalThis.document = {
  documentElement: { style: { setProperty() {} } }, createElement: () => makeEl(),
  querySelector: (s) => { if (!elements.has(s)) elements.set(s, makeEl()); return elements.get(s); },
  querySelectorAll: () => [], addEventListener() {},
};
globalThis.matchMedia = () => ({ matches: false });
globalThis.ResizeObserver = class { observe() {} };
globalThis.Image = class { set src(v) {} };
globalThis.DOMMatrix = class { scaleSelf() { return this; } };
globalThis.requestAnimationFrame = () => {};
globalThis.setTimeout = () => 0;
for (const rel of scripts) (0, eval)(fs.readFileSync(path.join(webDir, rel), 'utf8'));

const D = globalThis.MARKET_DEBUG;
let failed = 0;
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); failed++; } else console.log('PASS:', msg); };

const MC = globalThis.MARKET_CONFIG;
const COLS = Math.max(...MC.house.rooms.map((r) => r.at[0])) + 1;
const ROWS = Math.max(...MC.house.rooms.map((r) => r.at[1])) + 1;

// Room boundary at global I = 9 between r1 and r2.
assert(D.canWalk(8.5, 7.0, 9.5, 7.0) === false, 'solid wall blocks crossing outside the doorway band');
assert(D.canWalk(8.5, 4.0, 9.5, 4.0) === true, 'doorway at local tile 4 allows crossing');
assert(D.canWalk(8.5, 5.5, 9.5, 5.5) === false, 'edge of doorway band (local 5.5) stays solid');

// Outer perimeter.
assert(D.canWalk(1.0, 4.0, 0.2, 4.0) === false, 'outer building wall blocks exit');
assert(D.canWalk(1.0, 2.0, COLS * 9 - 0.1, 2.0) === false, 'outer building wall blocks far side');

// Tall gondola in r2: local i 2..4, j 2 => global 11..13, 2.
assert(D.isBlockedTile(12.5, 2.5) === true, 'gondola shelf footprint is solid');
assert(D.canWalk(10.5, 2.5, 12.5, 2.5) === false, 'cannot walk into a gondola shelf');
assert(D.isBlockedTile(10.5, 2.5) === false, 'open aisle tile is walkable');
assert(D.canWalk(11.98, 2.5, 12.02, 2.5) === false, 'no walkable seam between two shelf tiles');

// The cheese island must stay clear of the straight route through the center of r3.
let cheeseAisleBlocked = false;
const dairyRoom = MC.house.rooms.find((room) => room.id === 'r3');
const aisleI = dairyRoom.at[0] * 9 + 4.5, aisleJ = dairyRoom.at[1] * 9;
for (let j = 1.5; j < 7.5; j += 0.25) {
  if (!D.canWalk(aisleI, aisleJ + j, aisleI, aisleJ + j + 0.25)) cheeseAisleBlocked = true;
}
assert(!cheeseAisleBlocked, 'center aisle through the dairy room stays clear');

// Diagonal rooms share no wall. Sight must not cross two solid walls through
// the doorway band of the wrong axis (regression from the expansion audit).
assert(D.los(5.7, 8.1, 11.7, 11.7) === false, 'diagonal rooms cannot see through two solid walls');
assert(D.los(8.5, 4.5, 9.5, 4.5) === true, 'adjacent rooms see through the doorway band');

// EAS gate and entrance arch are passable portals.
assert(D.isBlockedTile(MC.exitGatePos.I, MC.exitGatePos.J) === false, 'EAS gate walkthrough is passable');
const exitRoom = MC.house.rooms.find((r) => r.id === 'r6');
assert(exitRoom.at[0] === 3 && exitRoom.at[1] === 2 && MC.exitGatePos.I > 30, 'checkout and exit sit at the far store edge');
assert(D.isBlockedTile(1.3, 4.5) === false, 'entrance arch opening is passable');

// Live WASD movement: 'D' is diagonal in iso (-J), so start away from the doorway band
// and hold it against the solid part of the r1/r2 wall. The player must not cross I=9.
D.teleport(8.3, 2.0);
D.keys.add('KeyD');
for (let i = 0; i < 300; i++) D.tick(1 / 60);
D.keys.delete('KeyD');
const s = D.snapshot();
assert(s.I < 9.0, `player held against the wall (final I=${s.I.toFixed(2)})`);

// Exhaustive internal-wall scan: every shared wall must be solid except the drawn doorway gap (3.55..5.45).
let leaks = 0;
for (let x = 1; x < COLS; x++) for (let row = 0; row < ROWS; row++)
  for (let j = row * 9 + 0.5; j < row * 9 + 9; j += 0.5) {
    const a = D.canWalk(x * 9 - 0.1, j, x * 9 + 0.1, j);
    const b = D.canWalk(x * 9 + 0.1, j, x * 9 - 0.1, j);
    if ((a || b) && (j % 9 < 3.55 || j % 9 > 5.45)) leaks++;
  }
for (let y = 1; y < ROWS; y++) for (let col = 0; col < COLS; col++)
  for (let i = col * 9 + 0.5; i < col * 9 + 9; i += 0.5) {
    const a = D.canWalk(i, y * 9 - 0.1, i, y * 9 + 0.1);
    const b = D.canWalk(i, y * 9 + 0.1, i, y * 9 - 0.1);
    if ((a || b) && (i % 9 < 3.55 || i % 9 > 5.45)) leaks++;
  }
assert(leaks === 0, `all internal walls solid outside the doorway gap (leaks=${leaks})`);

// Every internal doorway must stay crossable even after dense themed stocking.
let sealed = 0;
for (let x = 1; x < COLS; x++) for (let row = 0; row < ROWS; row++) {
  const j = row * 9 + 4.5;
  if (!D.canWalk(x * 9 - 0.1, j, x * 9 + 0.1, j)) sealed++;
}
for (let y = 1; y < ROWS; y++) for (let col = 0; col < COLS; col++) {
  const i = col * 9 + 4.5;
  if (!D.canWalk(i, y * 9 - 0.1, i, y * 9 + 0.1)) sealed++;
}
assert(sealed === 0, `every internal doorway is crossable (sealed=${sealed})`);

// AI patrol: guard and staff must still move through doorways with collision enabled.
const before = D.snapshot();
for (let i = 0; i < 900; i++) D.tick(1 / 60);
const after = D.snapshot();
const guardTravel = Math.hypot(after.guardI - before.guardI, after.guardJ - before.guardJ);
const staffTravel = Math.hypot(after.staffI - before.staffI, after.staffJ - before.staffJ);
assert(guardTravel > 1.0, `detective patrolled through the store (moved ${guardTravel.toFixed(2)} tiles)`);
assert(staffTravel > 1.0, `staff patrolled through the store (moved ${staffTravel.toFixed(2)} tiles)`);
assert(D.canWalk(after.guardI, after.guardJ, after.guardI, after.guardJ), 'detective ended on a walkable tile');
assert(D.canWalk(after.staffI, after.staffJ, after.staffI, after.staffJ), 'staff ended on a walkable tile');

// Every stand-on-floor object is solid. Only the intended portals stay walkable.
const KIND_MAP = { ...globalThis.KINDS_DATA, ...MC.kinds };
const PORTALS = new Set(['eas-gate', 'rewe-arch', 'aisle-sign', 'store-sign']);
let ghostObjects = 0;
for (const it of MC.house.items) {
  const k = KIND_MAP[it.kind];
  if (!k || k.place === 'rug' || k.place === 'wall' || PORTALS.has(it.kind)) continue;
  const rm = MC.house.rooms.find((r) => r.id === it.room);
  const tile = globalThis.HOUSE.K.footprint(k, it)[0];
  const gi = rm.at[0] * 9 + tile[0] + 0.5, gj = rm.at[1] * 9 + tile[1] + 0.5;
  if (!D.isBlockedTile(gi, gj)) { ghostObjects++; console.error('  ghost object', it.id, gi.toFixed(2), gj.toFixed(2)); }
}
assert(ghostObjects === 0, `every fixture is solid at its footprint centre (ghosts=${ghostObjects})`);

const resolvedKinds = { ...globalThis.KINDS_DATA, ...MC.kinds };
const missingKinds = MC.house.items.filter((it) => !resolvedKinds[it.kind]);
assert(missingKinds.length === 0, `every placed fixture has a kind (${missingKinds.map((it) => it.id).join(', ') || 'none'})`);

const cameraPoints = D.cameraAlignment?.() || [];
assert(cameraPoints.length === MC.cameras.length, `every CCTV camera exposes its rendered lens point (${cameraPoints.length}/${MC.cameras.length})`);
assert(cameraPoints.every(({ lens, apex }) => Math.hypot(lens[0] - apex[0], lens[1] - apex[1]) < 0.01),
  'each CCTV fan starts at its visible lens');

const renderOrder = D.captureRenderOrder?.() || [];
const backStandIndex = renderOrder.findIndex((pass) => pass.layer === 'standing' && pass.room === 'r1');
const frontWallIndex = renderOrder.findIndex((pass) => pass.layer === 'wall' && pass.room === 'r2');
assert(backStandIndex >= 0 && frontWallIndex > backStandIndex,
  'the front room wall draws after standing fixtures in the room behind it');

// Long patrol: both NPCs must reach every waypoint and never wedge on a fixture.
D.reset();
const seenG = new Set(), seenS = new Set();
let prevG = null, prevS = null, maxStall = 0, stall = 0;
for (let i = 0; i < 5400; i++) {
  D.tick(1 / 60);
  const s = D.snapshot();
  const g = [s.guardI, s.guardJ], st = [s.staffI, s.staffJ];
  MC.guardRoute.forEach((w, n) => { if (Math.hypot(g[0] - w[0], g[1] - w[1]) < 1.0) seenG.add(n); });
  MC.staffRoute.forEach((w, n) => { if (Math.hypot(st[0] - w[0], st[1] - w[1]) < 1.0) seenS.add(n); });
  if (i % 60) continue;
  if (prevG && Math.hypot(g[0] - prevG[0], g[1] - prevG[1]) < 0.05) { stall++; maxStall = Math.max(maxStall, stall); } else stall = 0;
  prevG = g; prevS = st;
}
assert(seenG.size === MC.guardRoute.length, `detective reached every patrol waypoint (${seenG.size}/${MC.guardRoute.length}, visited ${[...seenG].sort().join(',')})`);
assert(seenS.size === MC.staffRoute.length, `staff reached every patrol waypoint (${seenS.size}/${MC.staffRoute.length})`);
assert(maxStall < 3, `detective never wedged on a fixture (max stall ${maxStall}s)`);

if (failed) process.exitCode = 1;
else console.log('\nAll collision checks passed.');
