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
const MC = globalThis.MARKET_CONFIG;
let failed = 0;
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); failed++; } else console.log('PASS:', msg); };
const done = (id) => D.snapshot().objectives.find((o) => o.id === id)?.done === true;
const teleportToItem = (id) => {
  const it = MC.house.items.find((x) => x.id === id);
  const rm = MC.house.rooms.find((r) => r.id === it.room);
  const k = MC.kinds[it.kind];
  const w = k.size[0], d = k.size[1];
  const li = it.at.i + (it.at.face === 'ne' || it.at.face === 'sw' ? w / 2 : d / 2);
  const lj = it.at.j + (it.at.face === 'ne' || it.at.face === 'sw' ? d / 2 : w / 2);
  D.teleport(rm.at[0] * 9 + li, rm.at[1] * 9 + lj);
};
const runChannel = (setup, label, limit = 900) => {
  D.setHeat(0.05); // isolate the mechanic from RF-tag heat accumulation
  D.setGuard(1, 16); D.setStaff(1, 16); // keep patrols away from every timed action
  setup();
  assert(!!D.snapshot().channel, `${label}: timed action started`);
  let n = 0;
  while (D.snapshot().channel && n++ < limit) D.tick(1 / 60);
  assert(!D.snapshot().channel, `${label}: timed action completed in ${n} ticks`);
  return D.snapshot();
};

D.setGuard(1, 16); D.setStaff(1, 16); D.freezePatrol(true); // park and hold patrols away
D.setHeat(0.05);
console.log('Initial:', JSON.stringify(D.snapshot()));

// Movement interrupts a timed action.
teleportToItem('m_gondola1'); D.steal();
assert(!!D.snapshot().channel, 'steal channel started');
D.keys.add('KeyD'); D.tick(1 / 60); D.keys.delete('KeyD');
assert(D.snapshot().channel === null, 'moving interrupts the steal channel');
assert(D.snapshot().stolenValue === 0, 'interrupted steal takes no goods');

// A nearby good behind a solid wall cannot be stolen through it.
D.setHeat(0.05);
D.teleport(9.5, 10.9); D.steal();
assert(D.snapshot().channel === null, 'no steal channel through a solid wall');
assert(D.snapshot().stolenValue === 0, 'goods behind a wall stay put');
D.setHeat(0.05);

// 1. Disable CCTV power (timed action + objective).
let s = runChannel(() => { D.teleport(MC.panelPos.I, MC.panelPos.J); D.steal(); }, 'CCTV power panel');
assert(s.camerasDisabled === true, 'CCTV power disabled');
assert(done('power'), 'power objective complete');

// 2. Force the spirits vitrine, then steal the high-value tagged malt.
s = runChannel(() => { teleportToItem('m_spirits'); D.steal(); }, 'vitrine');
assert(s.vitrineOpen === true, 'spirits vitrine opened');
assert(done('vitrine'), 'vitrine objective complete');

s = runChannel(() => { teleportToItem('m_spirits'); D.steal(); }, 'steal malt');
assert(s.stolenIds.includes('m_spirits'), 'stole the 18yr Single Malt');
assert(s.tags.includes('m_spirits'), 'RF tag active on stolen spirits');
assert(s.stolenValue === 68, 'haul equals €68');
assert(s.bag === 1, 'bag holds one good');

// 3. EAS gate alarms on an active tag. The run continues.
D.teleport(MC.exitGatePos.I, MC.exitGatePos.J);
D.tick();
s = D.snapshot();
assert(s.outcome === null, 'EAS alarm is recoverable (run continues)');
assert(s.heat >= 0.99, 'EAS alarm spikes heat to 100%');
assert(elements.get('#banner-title')?.textContent.includes('Security Tag'), 'alarm banner shown');
D.setHeat(0.05);

// 4. Fill the bag with the next two tagged goods. Third slot is the cap.
s = runChannel(() => { teleportToItem('m_aktion1'); D.steal(); }, 'steal drill');
s = runChannel(() => { teleportToItem('m_pallet1'); D.steal(); }, 'steal champagne');
assert(s.bag === 3, 'bag has three goods');
assert(s.stolenValue === 180, 'haul equals €180');
assert(!done('quota'), `quota €${MC.quota} not met by €180`);

// 5. Fill all six slots, then a seventh good is refused.
s = runChannel(() => { teleportToItem('m_chill1'); D.steal(); }, 'steal ribeye');
s = runChannel(() => { teleportToItem('m_chill2'); D.steal(); }, 'steal salmon');
s = runChannel(() => { teleportToItem('m_cheese'); D.steal(); }, 'steal cheese');
assert(s.bag === 6, 'bag holds six goods');
assert(s.stolenValue >= MC.quota, `quota met: €${s.stolenValue} >= €${MC.quota}`);
assert(done('quota'), 'quota objective complete');
teleportToItem('m_gondola1'); D.steal();
assert(D.snapshot().bag === 6, 'bag cap blocks a seventh good');

// 6. De-tag at the security office (timed action).
s = runChannel(() => { D.teleport(MC.detaggerPos.I, MC.detaggerPos.J); D.steal(); }, 'de-tag');
assert(s.tags.length === 0, 'RF tags removed at de-tagger');
assert(done('detag'), 'de-tag objective complete');

// 7. Clean escape.
D.teleport(MC.exitGatePos.I, MC.exitGatePos.J);
D.tick();
s = D.snapshot();
assert(s.outcome === 'escaped', 'clean getaway succeeds after all objectives');
assert(done('escape'), 'escape objective complete');

// Tick trace from the FSM build is exposed for scenario checks.
const tr = D.trace();
assert(tr.length > 100, `tick trace records the run (${tr.length} entries)`);
assert(['tick', 'state', 'heat', 'tier', 'visible', 'channel', 'outcome'].every((k) => k in tr[0]), 'trace rows carry the expected fields');

if (failed) process.exitCode = 1;
else console.log('\nAll heist-loop checks passed.');
