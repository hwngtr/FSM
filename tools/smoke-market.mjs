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

for (const mode of ['demo', 'worst', 'empty', 'one', 'huge']) {
  delete globalThis.HOUSE;
  delete globalThis.GUARD_CONFIG;
  delete globalThis.GUARD_BT;
  delete globalThis.MARKET_CONFIG;
  let drawImageCalls = 0;
  const elements = new Map();
  const listeners = new Map();

  function makeEl(id = '') {
    return {
      id, width: 1400, height: 900, hidden: false, textContent: '', title: '', style: {},
      dataset: { breakMode: mode },
      classList: { add() {}, remove() {}, toggle() {} },
      toDataURL: () => 'data:image/png;base64,',
      getContext: () => new Proxy({}, { get(_, p) {
        if (p === 'drawImage') return () => { drawImageCalls++; };
        if (p === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
        if (p === 'createPattern') return () => ({ setTransform() {} });
        return () => {};
      } }),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1400, height: 900 }),
      addEventListener: (ev, cb) => { listeners.set(`${id}:${ev}`, cb); },
      setAttribute: () => {},
      replaceChildren: function (...kids) { this.childrenCount = kids.length; },
      toggleAttribute: () => {}, append: () => {},
    };
  }

  globalThis.window = globalThis;
  globalThis.window.addEventListener = () => {};
  globalThis.window.devicePixelRatio = 1;
  globalThis.window.innerWidth = 1400;
  globalThis.window.innerHeight = 900;
  globalThis.location = { href: `http://localhost/market.html?data=${mode}`, search: `?data=${mode}` };
  globalThis.history = { replaceState() {} };
  globalThis.document = {
    hidden: false, documentElement: { style: { setProperty() {} } },
    createElement: (tag) => makeEl(tag),
    querySelector: (sel) => { if (!elements.has(sel)) elements.set(sel, makeEl(sel)); return elements.get(sel); },
    querySelectorAll: () => [], addEventListener: () => {},
  };
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.Image = class { set src(v) {} };
  globalThis.DOMMatrix = class { scaleSelf() { return this; } };
  let rafCb = null;
  globalThis.requestAnimationFrame = (cb) => { rafCb = cb; };
  globalThis.setTimeout = (fn) => { /* skip animation timers in headless */ return 0; };

  for (const rel of scripts) (0, eval)(fs.readFileSync(path.join(webDir, rel), 'utf8'));
  if (rafCb) rafCb(32);

  if (mode === 'demo') {
    // Simulate 240 ticks (one CCTV sweep cycle) plus arch + trait switches
    for (let i = 0; i < 240; i++) if (rafCb) rafCb(32 + i * 16);
    const archClick = listeners.get('#arch-switch-btn:click');
    const profClick = listeners.get('#profile-switch-btn:click');
    if (archClick) archClick();
    if (profClick) profClick();
    if (rafCb) rafCb(8000);
  }

  console.log(
    `Mode [${mode.padEnd(5)}] -> drawBlits=${drawImageCalls}, ` +
      `badge="${elements.get('#panel-arch-badge').textContent}", ` +
      `tags="${elements.get('#tag-count').textContent}", ` +
      `alert="${elements.get('#alert-numbers').textContent}", ` +
      `feed=${elements.get('#feed').childrenCount}`,
  );
}
