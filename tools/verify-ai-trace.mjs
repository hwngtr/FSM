import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, '../web');
const scripts = [
  'js/data.js', 'js/guard_config.js', 'js/bt.js', 'js/heist.js', 'js/detection.js', 'js/navpath.js', 'js/market.js',
  'js/press.js', 'js/world.js', 'js/kinds.js', 'js/robot.js', 'js/scene.js', 'js/market-app.js',
];

delete globalThis.HOUSE;
delete globalThis.GUARD_CONFIG;
delete globalThis.GUARD_BT;
delete globalThis.MARKET_CONFIG;
const elements = new Map();
function makeEl(id = '') {
  return {
    id, width: 1400, height: 900, hidden: false, textContent: '', title: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {} }, toDataURL: () => 'data:image/png;base64,',
    getContext: () => new Proxy({}, { get(_, p) {
      if (p === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (p === 'createPattern') return () => ({ setTransform() {} });
      return () => {};
    } }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1400, height: 900 }),
    addEventListener() {}, setAttribute() {},
    replaceChildren(...kids) { this.childrenCount = kids.length; },
    toggleAttribute() {}, append() {},
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
  hidden: false, documentElement: { style: { setProperty() {} } }, createElement: (t) => makeEl(t),
  querySelector: (s) => { if (!elements.has(s)) elements.set(s, makeEl(s)); return elements.get(s); },
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
const check = (ok, message) => {
  if (ok) console.log('PASS:', message);
  else { console.error('FAIL:', message); failed++; }
};

D.reset();
D.freezePatrol(false);
for (let n = 0; n < 1800; n++) D.tick(1 / 60);

const trace = D.trace();
check(trace.length > 1200, `tick trace has enough samples (${trace.length})`);

const changes = [];
for (let n = 1; n < trace.length; n++) {
  if (trace[n].state !== trace[n - 1].state) changes.push(trace[n].tick);
}
let worstWindow = 0;
for (const at of changes) {
  const count = changes.filter((tick) => tick >= at && tick < at + 60).length;
  worstWindow = Math.max(worstWindow, count);
}
check(worstWindow <= 2, `no state flicker: at most 2 transitions in any 1 s window (worst=${worstWindow})`);

let stallSeconds = 0, best = 0, last = null, stallStart = 0;
for (const row of trace) {
  const g = row.guard;
  if (last && Math.hypot(g[0] - last[0], g[1] - last[1]) > 0.02) { best = 0; stallStart = row.tick; }
  else if (last) {
    const stall = (row.tick - stallStart) / 60;
    best = Math.max(best, stall);
  }
  stallSeconds = Math.max(stallSeconds, best);
  last = g;
}
check(stallSeconds < 2, `guard never stalls for 2 s (max=${stallSeconds.toFixed(2)} s)`);

if (failed) { console.error(`${failed} AI trace check(s) failed.`); process.exitCode = 1; }
else console.log('\nAll AI trace checks passed.');
