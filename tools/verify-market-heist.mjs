import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, '../web');
globalThis.HOUSE = {};
(0, eval)(fs.readFileSync(path.join(webDir, 'js/heist.js'), 'utf8'));
(0, eval)(fs.readFileSync(path.join(webDir, 'js/detection.js'), 'utf8'));

const H = globalThis.HOUSE.Heist, D = globalThis.HOUSE.Detect;
let failed = 0;
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); failed++; } else console.log('PASS:', msg); };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

// Alert tiers map cleanly onto the heat scale.
assert(H.tierOf(0.05) === 0, 'tier 0 at 0.05');
assert(H.tierOf(0.12) === 1, 'tier 1 at 0.12');
assert(H.tierOf(0.32) === 2, 'tier 2 at 0.32');
assert(H.tierOf(0.52) === 3, 'tier 3 at 0.52');
assert(H.tierOf(0.72) === 4, 'tier 4 at 0.72');
assert(H.tierOf(0.90) === 5, 'tier 5 at 0.90');

const st = H.createHeist({ bagCap: 3, objectives: [{ id: 'power' }, { id: 'escape' }] });
assert(st.tier === 1 && st.bagCap === 3, 'initial state');

// Heat is bounded and tier tracks it.
H.setHeat(st, 2); assert(st.heat === 1 && st.tier === 5, 'heat clamps high');
H.setHeat(st, -1); assert(st.heat === 0 && st.tier === 0, 'heat clamps low');
H.addHeat(st, 0.4); assert(near(st.heat, 0.4) && st.tier === 2, 'addHeat advances tier');

// Decay is faster while crouched and hidden.
const a = H.createHeist(), b = H.createHeist();
H.setHeat(a, 0.6); H.setHeat(b, 0.6);
H.decay(a, 1, false); H.decay(b, 1, true);
assert(b.heat < a.heat, 'crouched decay beats standing decay');

// Detection sources: vision raises heat, crouch lowers it, power cut weakens cameras.
const base = { guardSees: false, close: false, cameras: 0, staffReport: false,
  sprint: false, tags: 0, motion: false, crouched: false, camerasDisabled: false };
const seen = D.contribution({ ...base, guardSees: true }, 1);
const seenCrouch = D.contribution({ ...base, guardSees: true, crouched: true }, 1);
const cam = D.contribution({ ...base, cameras: 3 }, 1);
const camOff = D.contribution({ ...base, cameras: 3, camerasDisabled: true }, 1);
assert(seen.delta > 0, 'guard vision adds heat');
assert(seenCrouch.delta < seen.delta, 'crouch reduces vision heat');
assert(cam.delta > camOff.delta, 'power cut reduces CCTV heat');
assert(D.contribution(base, 1).delta < 0, 'heat decays when nothing detects you');
assert(D.contribution({ ...base, motion: true }, 1).delta > D.contribution(base, 1).delta,
  'motion zones add heat');
assert(D.inMotionZone([{ I: 4, J: 5, r: 1 }], 4.5, 5.2) !== null, 'motion zone hit');
assert(D.inMotionZone([{ I: 4, J: 5, r: 1 }], 8, 8) === null, 'motion zone miss');

// Timed actions run to completion and cancel cleanly.
H.startChannel(st, 'steal', 'm_x', 2);
assert(H.tickChannel(st, 0.5, false) === 'running', 'channel still running');
assert(near(st.channel.progress, 0.5), 'channel progress tracked');
assert(H.tickChannel(st, 1.6, false) === 'done', 'channel completes at hold time');
assert(st.channel === null, 'channel cleared on completion');
H.startChannel(st, 'steal', 'm_y', 2);
assert(H.tickChannel(st, 0.5, true) === 'cancelled', 'channel cancels when interrupted');

// Bag cap and objectives.
const bag = H.createHeist({ bagCap: 3, objectives: [{ id: 'power' }, { id: 'escape' }] });
assert(H.canCarry(bag) && H.putInBag(bag, 'a') && H.putInBag(bag, 'b') && H.putInBag(bag, 'c'), 'three goods fit');
assert(!H.canCarry(bag) && !H.putInBag(bag, 'd'), 'fourth good refused');
assert(!H.requiredMet(bag), 'objectives not met yet');
H.completeObjective(bag, 'power'); assert(H.requiredMet(bag), 'non-escape objectives gate the exit');
H.completeObjective(bag, 'escape'); assert(H.requiredMet(bag), 'escape objective does not block itself');

if (failed) process.exitCode = 1;
else console.log('\nAll heist-domain checks passed.');
