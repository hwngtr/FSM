import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, '../web');

const scripts = [
  'js/data.js',
  'js/guard_config.js',
  'js/bt.js',
  'js/press.js',
  'js/world.js',
  'js/kinds.js',
  'js/robot.js',
  'js/scene.js',
  'app.js',
];

for (const mode of ['demo', 'worst', 'empty', 'one', 'huge']) {
  delete globalThis.HOUSE;
  delete globalThis.GUARD_CONFIG;
  delete globalThis.GUARD_BT;
  let drawImageCalls = 0;
  const elements = new Map();
  const listeners = new Map();

  function makeEl(id = '') {
    return {
      id,
      width: 1000,
      height: 800,
      hidden: false,
      textContent: '',
      title: '',
      style: {},
      dataset: { breakMode: mode },
      classList: { add() {}, remove() {}, toggle() {} },
      toDataURL: () => 'data:image/png;base64,',
      getContext: () =>
        new Proxy(
          {},
          {
            get(_, prop) {
              if (prop === 'drawImage') return () => { drawImageCalls++; };
              if (prop === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
              if (prop === 'createPattern') return () => ({ setTransform() {} });
              return () => {};
            },
          },
        ),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }),
      addEventListener: (ev, cb) => { listeners.set(`${id}:${ev}`, cb); },
      setAttribute: () => {},
      replaceChildren: function (...kids) { this.childrenCount = kids.length; },
      toggleAttribute: () => {},
      append: () => {},
    };
  }

  globalThis.window = globalThis;
  globalThis.window.addEventListener = () => {};
  globalThis.window.devicePixelRatio = 1;
  globalThis.window.innerWidth = 1280;
  globalThis.window.innerHeight = 800;
  globalThis.location = { href: `http://localhost/index.html?data=${mode}`, search: `?data=${mode}` };
  globalThis.history = { replaceState() {} };
  globalThis.document = {
    hidden: false,
    documentElement: { style: { setProperty() {} } },
    createElement: (tag) => makeEl(tag),
    querySelector: (sel) => {
      if (!elements.has(sel)) elements.set(sel, makeEl(sel));
      return elements.get(sel);
    },
    querySelectorAll: () => [],
    addEventListener: () => {},
  };
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.Image = class { set src(v) {} };
  globalThis.DOMMatrix = class { scaleSelf() { return this; } };
  let rafCb = null;
  globalThis.requestAnimationFrame = (cb) => { rafCb = cb; };

  for (const rel of scripts) {
    const code = fs.readFileSync(path.join(webDir, rel), 'utf8');
    (0, eval)(code);
  }
  if (rafCb) rafCb(32);

  // In demo mode, also test switching to BT and cycling personalities
  if (mode === 'demo') {
    const archClick = listeners.get('#arch-switch-btn:click');
    const profClick = listeners.get('#profile-switch-btn:click');
    if (archClick) archClick();
    if (profClick) profClick();
    if (rafCb) rafCb(64);
  }

  console.log(
    `Mode [${mode.padEnd(5)}] -> drawBlits=${drawImageCalls}, ` +
      `archBadge="${elements.get('#panel-arch-badge').textContent}", ` +
      `btPill="${elements.get('#bt-active-pill').textContent}", ` +
      `feedRendered=${elements.get('#feed').childrenCount}`,
  );
}
