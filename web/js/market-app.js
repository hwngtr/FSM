'use strict';
// Frischemarkt Heist — a Lidl/REWE-style supermarket shoplifting stealth prototype.
// Reuses the riso-print engine and the same single-source 7-state FSM / Reactive BT Guard AI.
// Extra factors: sweeping CCTV cameras, EAS exit gate with RF security tags, a de-tagger station,
// and staff (Filialmitarbeiter) who report suspicious shoppers to the store detective.
(() => {
const HS = globalThis.HOUSE, { P, W, K, S, B } = HS;
const MC = globalThis.MARKET_CONFIG;
const COLS = Math.max(...MC.house.rooms.map((r) => r.at[0])) + 1;
const ROWS = Math.max(...MC.house.rooms.map((r) => r.at[1])) + 1;
const HST = HS.Heist, DET = HS.Detect;
const $ = (q, el = document) => el.querySelector(q);
const view = $('#view'), stage = $('#stage'), ctx = stage.getContext('2d');

const ZOOMS = [0.18, 0.21, 0.25, 0.33, 0.42, 0.5, 0.56, 0.62, 0.75, 0.875, 1, 1.25, 1.5, 2, 2.5, 3];
const MAX_RATIO = 3, SPEED = 3.1, N = W.ROOM;
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;

const nfInt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nfOne = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pluralEn = new Intl.PluralRules('en-US');
const clampNum = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };
const money = (n) => { const v = Number(n); return Number.isFinite(v) ? '€' + nfInt.format(Math.round(v)) : '€0'; };
const middleTruncate = (s, max = 24) => { const t = String(s ?? ''); if (t.length <= max) return t; const k = Math.max(4, Math.floor((max - 1) / 2)); return t.slice(0, k) + '…' + t.slice(t.length - k); };

let house = null, kinds = {}, images = {}, dpr = 1, vw = 0, vh = 0, zi = 7, lastT = 0, clock = 0;
let heist = null;
let patrolFrozen = false; // test hook: hold guard and staff still for deterministic mechanic tests
const traceLog = []; // bounded per-tick record, ported from the FSM supermarket tick log
const rooms = new Map(), sprites = new Map(), hidden = new Set();
const cam = { x: 0, y: 0, z: ZOOMS[zi] };
let fitZi = 0, tween = null, userCam = false, hover = null, feedShown = 20, roomOrder = null;
let breakDataMode = 'demo';
let shownHouse = { rooms: [] }, cellMap = new Map();

const CFG = globalThis.GUARD_CONFIG;
const PROFILES = CFG.profiles;
const PROFILE_ORDER = ['standard', 'aggressive', 'cautious', 'observant'];
const LOOT = MC.lootTargets;
const QUOTA = MC.quota;
const EXIT = MC.exitGatePos;
const DETAGGER = MC.detaggerPos;
const ENTRANCE = MC.entrancePos;
const PANEL = MC.panelPos || { I: 23.0, J: 14.0 };
const MOTION_ZONES = MC.motionZones || [];
const ZONES = MC.house.rooms.map((r) => ({ I0: r.at[0] * N, J0: r.at[1] * N,
  I1: (r.at[0] + 1) * N, J1: (r.at[1] + 1) * N, name: r.name }));
let lastZone = null;
function updateZoneStrip() {
  const z = ZONES.find((z) => thief.I >= z.I0 && thief.I < z.I1 && thief.J >= z.J0 && thief.J < z.J1);
  if (!z || z === lastZone) return;
  lastZone = z;
  const el = $('#zone-strip'); if (!el) return;
  setText('#zone-name', z.name);
  el.hidden = false; el.classList.remove('is-fading');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('is-fading'), 2600);
}

const kindOf = (it) => kinds[it.kind];

const STATE_CSS = {
  idle: '#56628a', patrol: '#008c8a', investigate: '#ffd428', chase: '#ee6852',
  attack: '#a8402d', search: '#ee6852', return: '#008c8a',
};
const STATE_INK = {
  idle: 'blue', patrol: 'teal', investigate: 'sun', chase: 'coral',
  attack: 'coral', search: 'sun', return: 'teal',
};

const thief = {
  I: ENTRANCE.I, J: ENTRANCE.J, face: 'se', act: 'idle', roll: 0,
  carry: false, hp: 100, stolenValue: 0, stolenIds: new Set(), taggedIds: new Set(),
  autoPlay: false, outcome: null, targetI: null, targetJ: null, pendingStealId: null,
};
const guard = { I: 13.5, J: 4.5, angle: 1.5, face: 'sw', act: 'roll', mood: '', roll: 0 };
const staff = { I: 21.5, J: 4.5, angle: 1.2, face: 'se', act: 'roll', roll: 0, wp: 0, alert: 0 };
const cameras = MC.cameras.map((c) => ({ ...c, angle: c.baseAngle, sees: false, seenAt: -999, pingCooldown: 0 }));

const ai = {
  arch: 'FSM', profileId: CFG.defaultProfile || 'standard', state: 'patrol', alert: 0.12,
  firings: 0, wpIndex: 0, lastSeenPos: null, lastTransition: { src: 'idle', dst: 'patrol', guard: 'route_assigned', tick: 1 },
  btActivePath: 'Petri marking: p_patrol = 1 (∑ tokens = 1)', btTree: null,
  easAlarm: 0, feedLog: [], soundWave: null,
  percepts: {
    tick: 0, player_visible: false, player_dist: 10, player_angle: 0, heard_sound: false,
    sound_age_ticks: 999, alert: 0.12, arrived_at_target: false, at_route_start: false,
    lost_sight_ticks: 0, search_ticks: 0,
  },
};
const keysDown = new Set();
const activeProfile = () => PROFILES[ai.profileId] || PROFILES.standard;

// @break-ui fixtures — same 5-mode stress switcher as the house game, adapted to supermarket data.
const MARKET_FIXTURES = {
  worst: {
    state: 'investigate_secondary_cctv_anomaly_in_north_corridor',
    arch: 'ReactiveSelector_PriorityPreemption_With_Blackboard_v12.4.0-rc3',
    src: 'patrol_outer_perimeter_waypoint_04',
    dst: 'investigate_secondary_cctv_anomaly_in_north_corridor',
    rule: 'player_visible_through_north_corridor_window_with_partial_occlusion',
    alert: 1.42, hp: -42.5, dist: 0.3, firings: 1284901,
    lootText: '12 / 10', tagText: '99 active RF tag(s)',
    promptText: 'Steal Christopher Alexander Montgomery III’s Biedermeier Writing Desk — FINAL (revised) v12 [approved] (€12,345,679)',
    fovText: 'CCTV ALARM',
    feed: [
      { time: '2025-12-31T23:59:59.999-08:00', arch: 'FSM · Petri Net · Benachrichtigungen', isLoot: true,
        tag: 'customer-feedback-from-enterprise-onboarding-guard-predicate-v12',
        title: 'Stole Aleksandra Wiśniewska-Kowalczyk & Đặng Thị Ngọc Hân’s Masterpiece — FINAL (revised) v12 [approved].pdf',
        sub: 'from Paramètres de confidentialité et de sécurité (Room #1,284)', badge: '+€12,345,679',
        metaText: 'verified by bartholomew.fitzgerald@northwind-industries-holdings.example.com',
        quote: 'Multi-paragraph shoplifting thought with Vietnamese diacritics (Đặng Thị Ngọc Hân), CJK (王秀英), RTL (نور الهدى عبد الرحمن), and ZWJ emoji (👩🏽‍💻 Priya 🦊 Fox) that keeps going to test clamping and quote wrapping.',
        note: 'https://example.com/workspaces/frischemarkt/heist/9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f?tab=telemetry&filter=unresolved_invariants' },
      { time: 'In 3 days', arch: 'Reactive BT', isLoot: false, tag: '<script>alert("xss")</script> &amp; **bold**',
        title: 'PATROL → CHASE <img src=x onerror=alert(1)>', sub: '(p_chase = 1)', badge: '100%',
        metaText: 'dist = 0.3 tiles · alert = 100%', quote: 'Testing HTML escaping in title, tag, and badge fields.',
        note: 'IMG_20250914_183022_HDR_portrait_edited_edited_unbreakable_filename.HEIC' },
    ],
  },
  empty: {
    state: 'idle', arch: 'FSM', src: 'idle', dst: 'idle', rule: 'none',
    alert: 0, hp: 0, dist: 0, firings: 0, lootText: '0 / 0', tagText: '0 active RF tag(s)',
    promptText: '', fovText: 'Hidden', feed: [],
  },
  one: {
    state: 'patrol', arch: 'FSM', src: 'idle', dst: 'patrol', rule: 'route_assigned',
    alert: 0.01, hp: 1, dist: 1.0, firings: 1, lootText: '1 / 1', tagText: '1 active RF tag(s)',
    promptText: 'Steal 1 item (€1)', fovText: 'Hidden',
    feed: [{ time: '1 min ago', arch: '1 controller', isLoot: true, tag: '1 switch',
      title: 'Stole 1 item', sub: 'from 1 shelf', badge: '+€1', metaText: '1 loot stolen · 1 switch recorded',
      quote: 'Testing singular pluralization ("1 switch", "1 item", "€1").', note: '1 of 1 item collected.' }],
  },
  huge: (() => {
    const rows = [];
    for (let i = 1000; i >= 1; i--) rows.push({
      time: `Tick ${nfInt.format(i * 12)}`, arch: i % 2 ? 'FSM · Petri Net' : 'Reactive BT',
      isLoot: i % 5 === 0, tag: i % 5 === 0 ? 'noise 3.4t' : 'player_visible',
      title: i % 5 === 0 ? `Stole Valuation Lot #${nfInt.format(i)}` : `PATROL → CHASE (#${nfInt.format(i)})`,
      sub: `(p_chase = 1 · row ${nfInt.format(i)} of 1,000)`,
      badge: i % 5 === 0 ? `+€${nfInt.format(i * 15)}` : 'chase',
      metaText: `Paginated stress row ${nfInt.format(i)} of 1,000`,
      quote: `Guard evaluated transition rule #${nfInt.format(i)} in 0.02ms.`,
      note: `Petri marking invariant I3 held across ${nfInt.format(i)} transitions.`,
    });
    return { state: 'chase', arch: 'FSM · 1,000 rows', src: 'patrol', dst: 'chase', rule: 'player_visible',
      alert: 0.88, hp: 75, dist: 2.4, firings: 1000, lootText: '8 / 10', tagText: '3 active RF tag(s)',
      promptText: '', fovText: 'SPOTTED', feed: rows };
  })(),
};

// ---------------- geometry & rendering helpers ----------------
function index() {
  const keep = new Map(rooms);
  rooms.clear();
  shownHouse = { rooms: house.rooms };
  cellMap = S.cells(shownHouse);
  for (const rm of house.rooms) {
    const [ox, oy] = W.roomOrigin(rm.at);
    const items = S.itemsIn(house, rm.id).filter((it) => kindOf(it));
    const old = keep.get(rm.id);
    const ver = JSON.stringify(rm) + JSON.stringify(S.edgesOf(shownHouse, rm)) + items
      .filter((it) => S.layerOf(kindOf(it)) !== 'stand')
      .map((it) => it.id + it.kind + JSON.stringify(it.at) + (hidden.has(it.id) ? 'h' : '') + (images[it.image] ? 'i' : '')).join('|');
    rooms.set(rm.id, { rm, ox, oy, b: W.roomBounds(rm), items, base: old && old.ver === ver ? old.base : null, ver });
  }
  roomOrder = null;
}
function loadImages() {
  for (const it of house.items) if (it.image && !(it.image in images)) {
    images[it.image] = null;
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { images[it.image] = im; sprites.delete(it.id); index(); };
    im.src = it.image;
  }
}
const ratioNow = () => { const z = cam.z * dpr; return z <= 1 ? 1 : Math.min(MAX_RATIO, Math.ceil(z - 0.01)); };
function printed(w, h, ratio, x0, y0, draw) {
  const cv = HS.env.makeCanvas(Math.max(1, Math.ceil(w * ratio)), Math.max(1, Math.ceil(h * ratio)));
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.setTransform(ratio, 0, 0, ratio, -x0 * ratio, -y0 * ratio);
  draw(c);
  return cv;
}
function baseOf(R) {
  const ratio = ratioNow();
  if (!R.base || R.base.ratio !== ratio) {
    const b = R.b, skip = (it) => hidden.has(it.id);
    R.base = { ratio, cv: printed(b.x1 - b.x0, b.y1 - b.y0, ratio, b.x0, b.y0,
      (c) => S.drawBase(P.mkHand(c, { seed: 1 }), shownHouse, R.rm, R.items, kinds, images, { skip })) };
  }
  return R.base;
}
function spriteOf(it) {
  const ratio = ratioNow(), key = ratio + it.kind + ':' + JSON.stringify(it.at) + (images[it.image] ? 'i' : ''), have = sprites.get(it.id);
  if (have && have.key === key) return have;
  const k = kindOf(it), bx = K.screenBox(k, it);
  const s = { ratio, key, x0: bx.x0, y0: bx.y0, w: bx.x1 - bx.x0, h: bx.y1 - bx.y0, hi: null };
  s.cv = printed(s.w, s.h, ratio, bx.x0, bx.y0, (c) => K.drawThing(P.mkHand(c, { seed: 1 }), P.streamOf('item', it.id), k, it, images));
  sprites.set(it.id, s);
  return s;
}
function hiOf(s, o, k) {
  // the four offset copies are baked once into the halo canvas, so a loot
  // highlight costs one blit per frame instead of four
  const pad = Math.max(1, Math.round(o / k));
  const key = o + '@' + pad;
  if (s.hi && s.hi.key === key) return s.hi;
  const cv = HS.env.makeCanvas(s.cv.width + 2 * pad, s.cv.height + 2 * pad), c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  for (const [dx, dy] of [[pad, 0], [-pad, 0], [0, pad], [0, -pad]]) c.drawImage(s.cv, pad + dx, pad + dy);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = '#ffd428';
  c.fillRect(0, 0, cv.width, cv.height);
  return (s.hi = { key, cv, pad });
}

const zr = () => cam.z * dpr;
const devX = (wx) => (wx - cam.x) * zr() + stage.width / 2;
const devY = (wy) => (wy - cam.y) * zr() + stage.height / 2;
const toWorld = (px, py) => [(px * dpr - stage.width / 2) / zr() + cam.x, (py * dpr - stage.height / 2) / zr() + cam.y];
function worldToTile(wx, wy) { return [(wx / 32 + wy / 16) / 2, (wy / 16 - wx / 32) / 2]; }
function worldBounds() {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const R of rooms.values()) { x0 = Math.min(x0, R.ox + R.b.x0); y0 = Math.min(y0, R.oy + R.b.y0); x1 = Math.max(x1, R.ox + R.b.x1); y1 = Math.max(y1, R.oy + R.b.y1); }
  return { x0, y0, x1, y1 };
}
function fitTo(b, animate) {
  const pad = vw < 600 ? 14 : 34;
  const fits = (z) => (b.x1 - b.x0) * z <= vw - pad * 2 && (b.y1 - b.y0) * z <= vh - pad * 2 - 30;
  let k = 0;
  for (let n = 0; n < ZOOMS.length - 3; n++) if (fits(ZOOMS[n])) k = n;
  fitZi = k;
  moveTo({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 + 8, zi: k }, animate);
}
function moveTo(to, animate) {
  if (to.zi !== undefined && to.zi !== zi) { zi = to.zi; cam.z = ZOOMS[zi]; forgetOtherSizes(); }
  if (!animate || REDUCE) { cam.x = to.x; cam.y = to.y; tween = null; return; }
  tween = { x0: cam.x, y0: cam.y, x1: to.x, y1: to.y, t0: clock, d: 0.7 };
}
function forgetOtherSizes() {
  const r = ratioNow();
  for (const [id, sp] of sprites) if (sp.ratio !== r) sprites.delete(id);
  for (const R of rooms.values()) if (R.base && R.base.ratio !== r) R.base = null;
}
function zoomBy(step, px, py) {
  const n = Math.max(0, Math.min(ZOOMS.length - 1, zi + step));
  if (n === zi) return;
  const [wx, wy] = px === undefined ? [cam.x, cam.y] : toWorld(px, py);
  const z0 = cam.z;
  zi = n; cam.z = ZOOMS[n]; tween = null; userCam = true;
  cam.x = wx - (wx - cam.x) * z0 / cam.z;
  cam.y = wy - (wy - cam.y) * z0 / cam.z;
  forgetOtherSizes();
}
function roomInView(R) {
  const w = stage.width / zr() / 2, h = stage.height / zr() / 2;
  return R.ox + R.b.x1 > cam.x - w && R.ox + R.b.x0 < cam.x + w && R.oy + R.b.y1 > cam.y - h && R.oy + R.b.y0 < cam.y + h;
}
function resize() {
  const r = view.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
  vw = r.width || window.innerWidth; vh = r.height || window.innerHeight;
  stage.width = Math.round(vw * d); stage.height = Math.round(vh * d);
  if (d !== dpr) { dpr = d; sprites.clear(); for (const R of rooms.values()) R.base = null; }
  if (!userCam && house) fitTo(worldBounds(), false);
}

const roomAt = (I, J) => cellMap.get(S.key(Math.floor(I / N), Math.floor(J / N)));
const faceTo = (di, dj) => Math.abs(di) > Math.abs(dj) ? (di > 0 ? 'se' : 'nw') : (dj > 0 ? 'sw' : 'ne');
function itemTilePos(it) {
  const k = kindOf(it);
  if (!k) return [4.5, 4.5];
  const [w, d] = it.size || k.size || [1, 1], a = it.at, rm = house.rooms.find((r) => r.id === it.room);
  if (!rm) return [4.5, 4.5];
  const li = a.i + (a.face === 'ne' || a.face === 'sw' ? w / 2 : d / 2);
  const lj = a.j + (a.face === 'ne' || a.face === 'sw' ? d / 2 : w / 2);
  return [rm.at[0] * N + Math.min(8.2, Math.max(0.8, li)), rm.at[1] * N + Math.min(8.2, Math.max(0.8, lj))];
}
function nearestLoot(fromI = thief.I, fromJ = thief.J) {
  let best = null, bd = Infinity;
  for (const [id, meta] of LOOT.entries()) {
    if (thief.stolenIds.has(id)) continue;
    const it = house.items.find((x) => x.id === id);
    if (!it) continue;
    const [ti, tj] = itemTilePos(it), d = Math.hypot(ti - fromI, tj - fromJ);
    if (d < bd) { bd = d; best = { id, it, meta, ti, tj, dist: d }; }
  }
  return best;
}
function emitSound(I, J, maxR, label) {
  ai.soundWave = { I, J, r: 0.25, maxR: maxR || 5.5, age: 0, label };
  if (heist) HST.addHeat(heist, DET.RATES.soundSpike);
}
function pushFeed(entry) {
  ai.feedLog.unshift(entry);
  if (ai.feedLog.length > 60) ai.feedLog.pop();
  if (breakDataMode === 'demo') renderFeed();
}

function hasLineOfSight(aI, aJ, bI, bJ, ignoreId = null) {
  const rA = roomAt(aI, aJ), rB = roomAt(bI, bJ);
  if (!rA || !rB) return false;
  if (rA.id !== rB.id) {
    const ax = Math.floor(aI / N), ay = Math.floor(aJ / N);
    const bx = Math.floor(bI / N), by = Math.floor(bJ / N);
    if (Math.abs(ax - bx) + Math.abs(ay - by) !== 1) return false;
    const aiL = aI % N, ajL = aJ % N, biL = bI % N, bjL = bJ % N;
    const inBand = (v) => v > 2.6 && v < 6.4;
    // Only the band along the shared wall is open. A band on the other axis
    // must not grant sight through two solid walls at a diagonal corner.
    const open = ax !== bx ? (inBand(ajL) && inBand(bjL)) : (inBand(aiL) && inBand(biL));
    if (!open) return false;
  }
  // Tall gondola spines, chillers, liquor & pallet stacks block sight.
  for (const R of rooms.values()) {
    for (const it of R.items) {
      if (it.id === ignoreId) continue;
      const k = kindOf(it);
      if (!k || S.layerOf(k) !== 'stand' || (k.height || 0) < 1.4) continue;
      const [ci, cj] = itemTilePos(it);
      const [w, d] = k.size || [1, 1];
      for (let s = 1; s <= 6; s++) {
        const u = s / 7;
        const pi = aI + (bI - aI) * u, pj = aJ + (bJ - aJ) * u;
        if (pi > ci - 0.2 && pi < ci + w * 0.7 && pj > cj - 0.2 && pj < cj + d * 0.7) return false;
      }
    }
  }
  return true;
}

function evalGuard(name, p, prof = activeProfile()) {
  switch (name) {
    case 'route_assigned': return true;
    case 'player_visible': return p.player_visible && p.alert >= prof.alert_detect_threshold;
    case 'heard_sound':
      return (p.heard_sound && p.sound_age_ticks <= prof.sound_memory_ticks) ||
        (p.player_visible && p.alert < prof.alert_detect_threshold);
    case 'arrived_and_quiet': return p.arrived_at_target && !p.player_visible;
    case 'in_attack_range': return p.player_visible && p.player_dist <= prof.attack_range;
    case 'out_of_range':
      return (p.player_visible && p.player_dist > prof.attack_range) ||
        (!p.player_visible && p.lost_sight_ticks < prof.lost_sight_limit);
    case 'lost_sight_long': return !p.player_visible && p.lost_sight_ticks >= prof.lost_sight_limit;
    case 'search_expired':
      return !p.player_visible && p.search_ticks >= prof.search_duration_limit && p.alert <= prof.alert_calm_threshold;
    case 'at_route_start': return p.at_route_start;
    default: return false;
  }
}
ai.btTree = globalThis.GUARD_BT.makeGuardBehaviorTree(evalGuard);

function recordTransition(src, dst, reason) {
  if (src === dst) return;
  ai.state = dst; ai.firings += 1;
  ai.lastTransition = { src, dst, guard: reason, tick: ai.percepts.tick };
  const quotes = {
    patrol: 'Token moved to p_patrol. Detective resuming the 6-zone store patrol.',
    investigate: 'CCTV / staff report drew the Detective to the last known shopper position.',
    chase: 'SHOPPER SPOTTED! Detective preempted patrol to pursue the suspected shoplifter!',
    attack: 'Detective closed in and detained the shoplifter.',
    search: 'Suspect broke line of sight — Detective scanning last known coordinates.',
    return: 'Search expired and alert cooled; Detective returning to the patrol route.',
  };
  pushFeed({
    time: `Tick ${nfInt.format(ai.percepts.tick)}`,
    arch: `${ai.arch === 'FSM' ? 'FSM · Petri Net' : 'Reactive BT'} · ${activeProfile().label}`,
    isLoot: false, tag: reason, title: `${src.toUpperCase()} → ${dst.toUpperCase()}`, sub: `(p_${dst} = 1)`,
    badge: dst, metaText: `guard predicate ${reason}`, quote: quotes[dst] || `${src} → ${dst}`,
    note: `dist=${nfOne.format(ai.percepts.player_dist)}t · alert=${Math.round(ai.alert * 100)}% · tags=${thief.taggedIds.size}`,
  });
}

// ---------------- shoplifting actions ----------------
function stealItem(loot) {
  if (!loot || thief.stolenIds.has(loot.id) || thief.outcome) return;
  if (loot.id === 'm_spirits' && !heist.vitrineOpen) {
    pushFeed({ time: `Tick ${nfInt.format(ai.percepts.tick)}`, arch: 'HEIST', isLoot: false, tag: 'locked',
      title: 'The spirits vitrine is locked', sub: 'pry it open before stealing', badge: 'LOCKED',
      metaText: 'Hold E at the vitrine to force it', quote: 'Forcing a lock takes time and makes noise.', note: '' });
    return;
  }
  if (!HST.canCarry(heist)) {
    pushFeed({ time: `Tick ${nfInt.format(ai.percepts.tick)}`, arch: 'HEIST', isLoot: false, tag: 'bag-full',
      title: 'Your bag is full', sub: `carry at most ${heist.bagCap} goods`, badge: 'FULL',
      metaText: `Drop the idea of ${loot.meta.label}`, quote: 'Choose high-value goods, or make a second trip.', note: '' });
    return;
  }
  HST.putInBag(heist, loot.id);
  thief.stolenIds.add(loot.id);
  thief.stolenValue += loot.meta.value;
  thief.carry = true;
  thief.act = 'lift';
  setTimeout(() => { if (!thief.outcome) thief.act = 'idle'; }, 420);
  if (loot.meta.tagged) { thief.taggedIds.add(loot.id); heist.hadTags = true; }
  hidden.add(loot.id);
  for (const R of rooms.values()) R.base = null;
  emitSound(loot.ti, loot.tj, loot.meta.noise + 2.2, `stole ${loot.meta.label}`);

  pushFeed({
    time: `Tick ${nfInt.format(ai.percepts.tick)}`, arch: 'SHOPLIFT', isLoot: true,
    tag: loot.meta.tagged ? 'RF-TAG ACTIVE' : 'no tag', title: `Stole ${loot.meta.label}`,
    sub: `from ${loot.meta.roomName}`, badge: `+${money(loot.meta.value)}`,
    metaText: `Haul ${money(thief.stolenValue)} / ${money(QUOTA)} quota`,
    quote: loopSafeQuote(loot, thief.taggedIds.size),
    note: `${thief.taggedIds.size} active RF tag(s) — use the de-tagger in the stockroom before the EAS exit!`,
  });
}
function loopSafeQuote(loot, tagCount) {
  if (thief.stolenValue >= QUOTA) return 'Quota reached! De-tag everything, then walk through the EAS exit gate in the Kassenzone.';
  return tagCount > 0
    ? `RF security tag still active on this item. The EAS gate at the exit will alarm unless you de-tag in the Security Office.`
    : `Clean item — no RF tag. Theft sound travelled ${nfOne.format(loot.meta.noise + 2.2)} tiles.`;
}
function detagAll() {
  if (thief.outcome) return;
  if (!thief.taggedIds.size) {
    pushFeed({ time: `Tick ${nfInt.format(ai.percepts.tick)}`, arch: 'SECURITY BOX', isLoot: false, tag: 'detag',
      title: 'No RF tags to deactivate', sub: 'Security Box idle', badge: '—',
      metaText: 'All carried items are already clean', quote: 'Nothing to do here.', note: '' });
    return;
  }
  const n = thief.taggedIds.size;
  thief.taggedIds.clear();
  emitSound(DETAGGER.I, DETAGGER.J, 2.0, 'de-tagger beep');
  pushFeed({
    time: `Tick ${nfInt.format(ai.percepts.tick)}`, arch: 'SECURITY BOX', isLoot: false, tag: 'rf-deactivated',
    title: `Deactivated ${n} RF security tag${pluralEn.select(n) === 'one' ? '' : 's'}`,
    sub: 'at the Stockroom de-tagger', badge: 'CLEAN', metaText: `${n} tag(s) removed from carried goods`,
    quote: 'The EAS gate at the exit will now let you through without an alarm.', note: 'Hurry back to the Kassenzone.',
  });
}
function tossCoin(I, J) {
  if (thief.outcome) return;
  const ci = I ?? Math.min(COLS * N - 1, Math.max(1.5, thief.I + Math.cos(guard.angle + 1.5) * 4.2));
  const cj = J ?? Math.min(ROWS * N - 1, Math.max(1.5, thief.J + Math.sin(guard.angle + 1.5) * 4.2));
  emitSound(ci, cj, 7.2, 'coin toss');
  pushFeed({
    time: `Tick ${nfInt.format(ai.percepts.tick)}`, arch: 'DISTRACTION', isLoot: false, tag: 'heard_sound',
    title: 'Tossed a decoy coin', sub: `at tile (${nfOne.format(ci)}, ${nfOne.format(cj)})`, badge: 'DECOY',
    metaText: '7.2-tile acoustic ring to lure staff & detective',
    quote: 'Guard predicate heard_sound fires Patrol → Investigate.', note: 'Slip behind a gondola while they check it out.',
  });
}
function showOutcome(kind, reason) {
  const b = $('#heist-banner');
  b.hidden = false;
  if (kind === 'alarm') {
    // Recoverable warning: the EAS gate alarms, but the shoplifter can de-tag and try again.
    $('#banner-kicker').textContent = 'EAS ALARM TRIGGERED';
    $('#banner-title').textContent = 'Security Tag Set Off the Gate!';
    $('#banner-sub').textContent = `${reason} De-tag the goods at the stockroom Security Box, then return.`;
    const btn = $('#banner-retry-btn');
    if (btn) btn.innerHTML = '<span>Keep Sneaking</span> <span>&rarr;</span>';
    setTimeout(() => { if (!thief.outcome) b.hidden = true; }, 4200);
    return;
  }
  thief.outcome = kind;
  if (kind === 'busted') {
    $('#banner-kicker').textContent = `DETAINED BY STORE DETECTIVE (${ai.arch})`;
    $('#banner-title').textContent = 'Busted in the Store!';
    $('#banner-sub').textContent = `You had ${money(thief.stolenValue)} in your bag. ${reason}`;
  } else if (kind === 'alarm') {
    $('#banner-kicker').textContent = 'EAS ALARM TRIGGERED';
    $('#banner-title').textContent = 'Security Tag Set Off the Gate!';
    $('#banner-sub').textContent = `${reason} De-tag the goods at the stockroom Security Box, then try the exit again.`;
  } else {
    $('#banner-kicker').textContent = 'CLEAN GETAWAY · NO ALARM';
    $('#banner-title').textContent = `Escaped with ${money(thief.stolenValue)} of goods!`;
    $('#banner-sub').textContent = `You beat the ${ai.arch === 'FSM' ? '7-State FSM / Petri Net' : 'Reactive BT'} Detective, ${MC.cameras.length} CCTV cameras, and the store staff.`;
  }
}

function resetHeist() {
  traceLog.length = 0;
  heist = HST.createHeist(MC);
  thief.I = ENTRANCE.I; thief.J = ENTRANCE.J;
  thief.face = 'se'; thief.act = 'idle'; thief.roll = 0; thief.carry = false;
  thief.hp = 100; thief.stolenValue = 0; thief.stolenIds.clear(); thief.taggedIds.clear();
  thief.outcome = null; thief.targetI = null; thief.targetJ = null; thief.pendingStealId = null;
  $('#heist-banner').hidden = true;
  const retry = $('#banner-retry-btn');
  if (retry) retry.innerHTML = '<span>New Shift</span> <span>&rarr;</span>';
  hidden.clear();
  for (const R of rooms.values()) R.base = null;

  guard.I = 13.5; guard.J = 4.5; guard.angle = 1.5; guard.face = 'sw';
  staff.I = STAFF_START.I; staff.J = STAFF_START.J; staff.angle = 1.2; staff.wp = 0; staff.alert = 0;
  cameras.forEach((c, i) => { c.angle = c.baseAngle; c.sees = false; c.seenAt = -999; c.pingCooldown = 0; });
  ai.state = 'patrol'; ai.alert = 0.12; ai.firings = 0; ai.wpIndex = 0;
  ai.lastSeenPos = null; ai.soundWave = null; ai.easAlarm = 0;
  ai.lastTransition = { src: 'idle', dst: 'patrol', guard: 'route_assigned', tick: ai.percepts.tick };
  ai.feedLog = [{
    time: 'Shift started', arch: ai.arch === 'FSM' ? 'FSM · Petri Net' : 'Reactive BT',
    isLoot: false, tag: 'route_assigned', title: 'IDLE → PATROL', sub: '(p_patrol = 1)', badge: 'patrol',
    metaText: 'Store Detective initialized on 6-zone patrol circuit',
    quote: `Steal ${money(QUOTA)} of goods, de-tag RF labels in the Security Office, then slip out through the EAS exit.`,
    note: `${MC.cameras.length} CCTV cameras sweep the store. Staff report suspicious shoppers.`,
  }];
  renderFeed();
  updateDomOverlays();
}
const STAFF_START = { I: 21.5, J: 4.5 };

// ---------------- perception & simulation ----------------
function cameraSeesThief(c) {
  const dx = thief.I - c.I, dy = thief.J - c.J;
  const dist = Math.hypot(dx, dy);
  if (dist > c.range) return false;
  let rel = Math.atan2(dy, dx) - c.angle;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  if (Math.abs(rel) > c.halfAngle) return false;
  return hasLineOfSight(c.I, c.J, thief.I, thief.J);
}
function staffSeesThief() {
  const dx = thief.I - staff.I, dy = thief.J - staff.J;
  const dist = Math.hypot(dx, dy);
  if (dist > 4.2) return false;
  let rel = Math.atan2(dy, dx) - staff.angle;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  if (Math.abs(rel) > 0.45) return false;
  return hasLineOfSight(staff.I, staff.J, thief.I, thief.J);
}

// ---------------- Walls, doorways and solid fixtures ----------------
// The riso engine connects rooms with walls; only the shared doorway band (local tile 4)
// is open. Tall stand-on-floor fixtures are solid too, so NPCs cannot walk through shelves.
const PASSABLE_FIXTURES = new Set(['eas-gate', 'rewe-arch', 'aisle-sign', 'store-sign']);

function isBlockedTile(I, J) {
  for (const R of rooms.values()) {
    for (const it of R.items) {
      if (hidden.has(it.id)) continue;
      const k = kindOf(it);
      if (!k || S.layerOf(k) !== 'stand' || PASSABLE_FIXTURES.has(it.kind) || (k.height || 0) < 0.01) continue;
      const tiles = K.footprint(k, it);
      if (!tiles.length) continue;
      const minI = Math.min(...tiles.map((t) => R.rm.at[0] * N + t[0]));
      const maxI = Math.max(...tiles.map((t) => R.rm.at[0] * N + t[0]));
      const minJ = Math.min(...tiles.map((t) => R.rm.at[1] * N + t[1]));
      const maxJ = Math.max(...tiles.map((t) => R.rm.at[1] * N + t[1]));
      if (I > minI - 0.02 && I < maxI + 1.02 && J > minJ - 0.02 && J < maxJ + 1.02) return true;
    }
  }
  return false;
}
function canWalk(I, J, I2, J2) {
  if (I2 < 0.75 || I2 > COLS * N - 0.75 || J2 < 0.75 || J2 > ROWS * N - 0.75) return false;
  // Keep the bot clear of solid wall faces. Only the doorway band may approach a wall.
  const li = I2 - Math.floor(I2 / N) * N, lj = J2 - Math.floor(J2 / N) * N;
  if ((li < 0.45 || li > N - 0.45) && Math.abs(lj - 4) > 0.85) return false;
  if ((lj < 0.45 || lj > N - 0.45) && Math.abs(li - 4) > 0.85) return false;
  if (Math.floor(I / N) !== Math.floor(I2 / N) || Math.floor(J / N) !== Math.floor(J2 / N)) {
    // Use the engine's doorway centre (local tile 4) with an epsilon: the engine's own
    // crossable() compares with exact === 4, which floating-point drift can miss.
    const along = Math.abs(I2 - I) >= Math.abs(J2 - J) ? J : I;
    const local = ((along % N) + N) % N;
    if (local < 3.55 || local > 5.45) return false;
  }
  return !isBlockedTile(I2, J2);
}
// Axis sliding keeps movement smooth against a wall instead of stopping dead.
function moveEntity(e, ux, uy, stepLen) {
  const ni = e.I + ux * stepLen, nj = e.J + uy * stepLen;
  if (canWalk(e.I, e.J, ni, nj)) { e.I = ni; e.J = nj; return true; }
  if (ux !== 0 && canWalk(e.I, e.J, ni, e.J)) { e.I = ni; return true; }
  if (uy !== 0 && canWalk(e.I, e.J, e.I, nj)) { e.J = nj; return true; }
  return false;
}
// AI navigation: if the goal is in another room, aim for the doorway first.
function doorwayTarget(e, goalI, goalJ) {
  const ex = Math.floor(e.I / N), ey = Math.floor(e.J / N);
  const gx = Math.floor(goalI / N), gy = Math.floor(goalJ / N);
  if (ex !== gx) {
    const boundary = (ex < gx ? ex + 1 : ex) * N;
    return [boundary + (ex < gx ? 0.4 : -0.4), ey * N + 4.0];
  }
  if (ey !== gy) {
    const boundary = (ey < gy ? ey + 1 : ey) * N;
    return [ex * N + 4.0, boundary + (ey < gy ? 0.4 : -0.4)];
  }
  return [goalI, goalJ];
}
function moveToward(e, goalI, goalJ, stepLen) {
  // BFS over tile centres is the shared pathfinder from the FSM supermarket build.
  const NP = HS.NavPath;
  if (NP && NP.follow(e, canWalk, moveEntity, COLS * N, ROWS * N, goalI, goalJ, stepLen)) return true;

  // Fallback for a goal that BFS cannot reach from the current tile.
  const [wx, wy] = doorwayTarget(e, goalI, goalJ);
  const di = wx - e.I, dj = wy - e.J, d = Math.hypot(di, dj);
  if (d < 0.04) return false;
  if (moveEntity(e, di / d, dj / d, Math.min(stepLen, d))) return true;
  if (Math.abs(di) > 0.01 && moveEntity(e, Math.sign(di), 0, stepLen)) return true;
  if (Math.abs(dj) > 0.01 && moveEntity(e, 0, Math.sign(dj), stepLen)) return true;
  e.nav = null;
  return false;
}

function step(dt) {
  if (thief.outcome) return;
  const prof = activeProfile();
  ai.percepts.tick += 1;
  const tick = ai.percepts.tick;
  heist.elapsed += dt;

  // Thief movement
  let di = 0, dj = 0;
  if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) { di -= 1; dj -= 1; }
  if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) { di += 1; dj += 1; }
  if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) { di -= 1; dj += 1; }
  if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) { di += 1; dj -= 1; }
  const sprint = keysDown.has('ShiftLeft') || keysDown.has('ShiftRight');
  const crouched = keysDown.has('KeyC') || keysDown.has('ControlLeft') || keysDown.has('ControlRight');
  const moving = !!(di || dj) || thief.autoPlay || thief.targetI !== null;

  if (di || dj) {
    thief.targetI = null; thief.targetJ = null;
    const len = Math.hypot(di, dj), spd = SPEED * (sprint ? 1.48 : 1) * (crouched ? 0.6 : 1) * dt;
    if (moveEntity(thief, di / len, dj / len, spd)) thief.roll += spd;
    thief.face = faceTo(di, dj); thief.act = 'roll';
    if (sprint && tick % 28 === 0) emitSound(thief.I, thief.J, 4.5, 'sprint footsteps');
  } else if (thief.autoPlay) {
    let gi = EXIT.I, gj = EXIT.J;
    const next = nearestLoot();
    if (thief.stolenValue < QUOTA && next) {
      gi = next.ti; gj = next.tj;
      if (next.dist < 1.3 && !heist.channel) tryStealOrDetag();
    } else if (thief.taggedIds.size) {
      gi = DETAGGER.I; gj = DETAGGER.J;
      if (Math.hypot(gi - thief.I, gj - thief.J) < 1.6 && !heist.channel) tryStealOrDetag();
    } else if (!heist.camerasDisabled) {
      gi = PANEL.I; gj = PANEL.J;
      if (Math.hypot(gi - thief.I, gj - thief.J) < 1.6 && !heist.channel) tryStealOrDetag();
    } else if (thief.stolenValue >= QUOTA) {
      gi = EXIT.I; gj = EXIT.J;
    }
    const gdx = thief.I - guard.I, gdy = thief.J - guard.J, gd = Math.hypot(gdx, gdy);
    if (gd < 3.2) { gi = Math.max(1, Math.min(COLS * N - 1.5, thief.I + gdx / (gd || 1) * 3)); gj = Math.max(1, Math.min(ROWS * N - 1.5, thief.J + gdy / (gd || 1) * 3)); }
    const tdi = gi - thief.I, tdj = gj - thief.J, td = Math.hypot(tdi, tdj);
    if (td > 0.1 && !heist.channel && moveToward(thief, gi, gj, SPEED * 1.05 * dt)) { thief.roll += SPEED * 1.05 * dt; thief.face = faceTo(tdi, tdj); thief.act = 'roll'; }
  } else if (thief.targetI !== null && thief.targetJ !== null) {
    const tdi = thief.targetI - thief.I, tdj = thief.targetJ - thief.J, td = Math.hypot(tdi, tdj);
    if (td > 0.45 && moveToward(thief, thief.targetI, thief.targetJ, SPEED * 1.08 * dt)) { thief.roll += SPEED * 1.08 * dt; thief.face = faceTo(tdi, tdj); thief.act = 'roll'; }
    else { thief.targetI = null; thief.targetJ = null; thief.act = 'idle';
      if (thief.pendingStealId && !heist.channel) tryStealOrDetag();
      thief.pendingStealId = null;
    }
  } else thief.act = 'idle';

  // EAS exit gate
  const distExit = Math.hypot(thief.I - EXIT.I, thief.J - EXIT.J);
  if (distExit <= 1.7) {
    if (thief.taggedIds.size > 0) {
      if (ai.easAlarm <= 0) {
        showOutcome('alarm', `${thief.taggedIds.size} active RF tag(s) were detected by the EAS gate in the Kassenzone.`);
        HST.setHeat(heist, 1); ai.lastSeenPos = { I: thief.I, J: thief.J };
        emitSound(EXIT.I, EXIT.J, 9.0, 'EAS alarm');
        ai.easAlarm = 420;
        pushFeed({ time: `Tick ${nfInt.format(tick)}`, arch: 'EAS GATE', isLoot: false, tag: 'rf-alarm',
          title: 'EAS ANTI-THEFT ALARM!', sub: 'at the Kassenzone exit', badge: 'ALARM',
          metaText: `${thief.taggedIds.size} tagged item(s) triggered the RF scanner`,
          quote: 'The Detective and CCTV are now focused on the exit. De-tag in the Security Office and try again.', note: '' });
      }
      ai.easAlarm = Math.max(0, ai.easAlarm - 1);
      return;
    } else if (thief.stolenValue >= QUOTA && HST.requiredMet(heist)) {
      HST.completeObjective(heist, 'escape');
      showOutcome('escaped', '');
      return;
    }
    // Goods are clean but objectives remain. The prompt tells the player what is left.
  } else if (ai.easAlarm > 0) ai.easAlarm = Math.max(0, ai.easAlarm - 1);

  // Sound propagation
  let heard = false, soundAge = 999;
  if (ai.soundWave) {
    ai.soundWave.r += dt * 5.2; ai.soundWave.age += 1; soundAge = ai.soundWave.age;
    const d = Math.hypot(guard.I - ai.soundWave.I, guard.J - ai.soundWave.J);
    const effective = (ai.soundWave.maxR + 2.5) * prof.hearing_scale;
    if (d <= effective && ai.soundWave.age <= prof.sound_memory_ticks) { heard = true; ai.lastSeenPos = { I: ai.soundWave.I, J: ai.soundWave.J }; }
    if (ai.soundWave.r > ai.soundWave.maxR) ai.soundWave = null;
  }

  // CCTV sweep & detection (feeds the shared heat signal)
  let cameraSpot = false;
  const sweepBoost = 1 + Math.max(0, heist.tier - 1) * 0.08;
  for (const c of cameras) {
    c.angle = c.baseAngle + Math.sin(clock * c.sweepSpeed * sweepBoost + c.I) * c.sweepAmp;
    c.sees = cameraSeesThief(c);
    c.pingCooldown = Math.max(0, c.pingCooldown - 1);
    if (c.sees && !heist.camerasDisabled) {
      cameraSpot = true; c.seenAt = tick;
      if (c.pingCooldown <= 0) {
        c.pingCooldown = 150;
        ai.lastSeenPos = { I: thief.I, J: thief.J };
        pushFeed({ time: `Tick ${nfInt.format(tick)}`, arch: 'CCTV', isLoot: false, tag: 'camera_spotted',
          title: `${c.label} — SUSPICIOUS SHOPPER`, sub: 'CCTV feed relayed to the Detective', badge: 'CCTV',
          metaText: `shopper at tile (${nfOne.format(thief.I)}, ${nfOne.format(thief.J)})`,
          quote: 'Camera sighting adds heat and reveals your last position.', note: '' });
      }
    }
  }

  // Staff patrol & reporting
  const swp = MC.staffRoute[staff.wp];
  const sdi = swp[0] - staff.I, sdj = swp[1] - staff.J, sd = Math.hypot(sdi, sdj);
  if (sd <= 0.25) {
    staff.wp = (staff.wp + 1) % MC.staffRoute.length;
  } else if (!patrolFrozen && moveToward(staff, swp[0], swp[1], SPEED * 0.72 * dt)) {
    staff.roll += SPEED * 0.72 * dt; staff.angle = Math.atan2(sdj, sdi); staff.face = faceTo(sdi, sdj); staff.act = 'roll';
  }
  if (staffSeesThief() && !heist.camerasDisabled) {
    if (staff.alert <= 0) {
      staff.alert = 260;
      ai.lastSeenPos = { I: thief.I, J: thief.J };
      pushFeed({ time: `Tick ${nfInt.format(tick)}`, arch: 'STAFF', isLoot: false, tag: 'staff_report',
        title: 'Filialmitarbeiter reported a suspicious shopper', sub: 'to the Store Detective', badge: 'STAFF',
        metaText: `location (${nfOne.format(thief.I)}, ${nfOne.format(thief.J)})`,
        quote: 'Staff sightings add heat and mark your last known position.', note: '' });
    }
  }
  if (staff.alert > 0) staff.alert -= 1;

  // Guard perception: direct FOV + camera network + staff report
  const dx = thief.I - guard.I, dy = thief.J - guard.J, pdist = Math.hypot(dx, dy);
  let rel = Math.atan2(dy, dx) - guard.angle;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  const fov = prof.fov_distance * (1 + Math.max(0, heist.tier - 2) * 0.08);
  const inCone = pdist <= fov && Math.abs(rel) <= prof.fov_half_angle;
  const close = pdist <= prof.close_proximity;
  const guardSees = (inCone || close) && hasLineOfSight(guard.I, guard.J, thief.I, thief.J);
  const visible = guardSees || cameraSpot || (staff.alert > 0 && staff.alert > 200);

  // One detection model feeds one heat value. FSM and BT read it through ai.alert.
  const motion = moving && DET.inMotionZone(MOTION_ZONES, thief.I, thief.J);
  const det = DET.contribution({
    guardSees, close: pdist <= prof.close_proximity * 1.5,
    cameras: cameras.filter((c) => c.sees).length, camerasDisabled: heist.camerasDisabled,
    staffReport: staff.alert > 200 && !heist.camerasDisabled,
    sprint: !!sprint && !!moving, tags: thief.taggedIds.size,
    motion: !!motion, crouched,
  }, dt);
  HST.addHeat(heist, det.delta);
  ai.alert = heist.heat;
  if (visible) {
    ai.lastSeenPos = { I: thief.I, J: thief.J };
    ai.percepts.lost_sight_ticks = 0; ai.percepts.search_ticks = 0;
  } else {
    ai.percepts.lost_sight_ticks += 1;
    if (ai.state === 'search') ai.percepts.search_ticks += 1; else ai.percepts.search_ticks = 0;
  }
  Object.assign(ai.percepts, {
    player_visible: visible, player_dist: pdist, player_angle: rel,
    heard_sound: heard, sound_age_ticks: soundAge, alert: ai.alert,
  });
  if (heist.tier >= 5 && guardSees && pdist < 2.4) {
    showOutcome('busted', 'Security reached full exposure and the detective caught you.');
    return;
  }

  // Timed actions. Moving, being seen, or full exposure cancels the current action.
  const active = heist.channel;
  const channelResult = HST.tickChannel(heist, dt, moving || visible || heist.tier >= 5);
  if (channelResult === 'cancelled') {
    heist.lastCancel = { kind: active?.kind, moving, visible, tier: heist.tier, tick };
    pushFeed({ time: `Tick ${nfInt.format(tick)}`, arch: 'HEIST', isLoot: false, tag: 'interrupted',
      title: 'Action interrupted', sub: 'stay still and out of sight', badge: 'ABORT',
      metaText: 'Moving or being seen cancels a timed action', quote: 'Find cover, crouch with C, then try again.', note: '' });
  } else if (channelResult === 'done' && active) {
    if (active.kind === 'steal') {
      const meta = LOOT.get(active.id);
      const it = house.items.find((x) => x.id === active.id);
      if (meta && it) {
        const [li, lj] = itemTilePos(it);
        if (hasLineOfSight(thief.I, thief.J, li, lj, active.id)) stealItem({ id: active.id, meta, ti: li, tj: lj });
      }
    } else if (active.kind === 'detag') detagAll();
    else if (active.kind === 'power') {
      heist.camerasDisabled = true; HST.completeObjective(heist, 'power');
      emitSound(PANEL.I, PANEL.J, 2.4, 'power panel');
      pushFeed({ time: `Tick ${nfInt.format(tick)}`, arch: 'HEIST', isLoot: false, tag: 'power-cut',
        title: 'CCTV power disabled', sub: 'at the security panel', badge: 'DARK',
        metaText: 'Cameras still sweep, but feeds no longer raise heat',
        quote: 'Staff and the detective can still see you. Keep to the shadows.', note: '' });
    } else if (active.kind === 'vitrine') {
      heist.vitrineOpen = true; HST.completeObjective(heist, 'vitrine');
      const vit = house.items.find((x) => x.id === 'm_spirits');
      const [vi, vj] = vit ? itemTilePos(vit) : [17.2, 1.0];
      emitSound(vi, vj, 4.5, 'vitrine forced');
      pushFeed({ time: `Tick ${nfInt.format(tick)}`, arch: 'HEIST', isLoot: false, tag: 'vitrine-open',
        title: 'Spirits vitrine forced open', sub: 'the Islay malt is reachable', badge: 'OPEN',
        metaText: 'High-value goods unlocked', quote: 'The latch gave way. Grab the bottle while the aisle is clear.', note: '' });
    }
  }

  // Objectives advance as the run develops.
  if (thief.stolenValue >= QUOTA) HST.completeObjective(heist, 'quota');
  if (heist.hadTags && thief.taggedIds.size === 0) HST.completeObjective(heist, 'detag');
  if (heist.elapsed > 2 && heist.phase === 'case') heist.phase = 'infiltrate';
  if (heist.channel && heist.phase === 'infiltrate') heist.phase = 'execute';
  if (thief.stolenValue >= QUOTA && heist.phase === 'execute') heist.phase = 'exfil';

  // Guard controller: FSM table or real Behavior Tree
  if (ai.arch === 'FSM') {
    for (const r of CFG.fsmTable) if (r.src === ai.state && evalGuard(r.guard, ai.percepts, prof)) { recordTransition(ai.state, r.dst, r.guard); break; }
    ai.btActivePath = `Petri marking: p_${ai.state} = 1 (∑ tokens = 1 · ${prof.label})`;
  } else {
    const bb = { percepts: ai.percepts, profile: prof, prevState: ai.state, latchState: ai.state,
      guardReason: 'bt_priority', trace: [], abortedNodes: [] };
    ai.btTree.tick(bb);
    ai.btActivePath = globalThis.GUARD_BT.formatActiveTrace(bb);
    if (bb.activeLeaf !== ai.state) recordTransition(ai.state, bb.activeLeaf, bb.abortedNodes.length ? `preempt:${bb.abortedNodes[0]}` : bb.guardReason);
  }

  // Guard movement per state
  let gi = guard.I, gj = guard.J, speed = prof.patrol_speed * (1 + Math.max(0, heist.tier - 2) * 0.05);
  if (ai.state === 'patrol') {
    const wp = MC.guardRoute[ai.wpIndex]; gi = wp[0]; gj = wp[1];
    if (Math.hypot(gi - guard.I, gj - guard.J) < 0.65) ai.wpIndex = (ai.wpIndex + 1) % MC.guardRoute.length;
    guard.mood = ''; guard.act = 'roll';
  } else if (ai.state === 'investigate') {
    const t = ai.lastSeenPos || { I: 13.5, J: 13.5 }; gi = t.I; gj = t.J; speed = prof.investigate_speed;
    guard.mood = 'think'; guard.act = 'roll';
    ai.percepts.arrived_at_target = Math.hypot(gi - guard.I, gj - guard.J) < 0.8;
  } else if (ai.state === 'chase') {
    const t = visible ? thief : (ai.lastSeenPos || thief); gi = t.I; gj = t.J; speed = prof.chase_speed;
    guard.mood = ''; guard.act = 'roll'; thief.hp = Math.min(100, thief.hp + dt * 4);
  } else if (ai.state === 'attack') {
    guard.angle = Math.atan2(thief.J - guard.J, thief.I - guard.I);
    guard.face = faceTo(thief.I - guard.I, thief.J - guard.J);
    guard.act = 'cheer'; guard.mood = 'happy';
    thief.hp = Math.max(0, thief.hp - dt * 58);
    if (thief.hp <= 0) showOutcome('busted', 'The Detective tackled you after a Chase → Attack transition below 1.4 tiles.');
    return;
  } else if (ai.state === 'search') {
    guard.angle += dt * 2.5; guard.face = faceTo(Math.cos(guard.angle), Math.sin(guard.angle));
    guard.act = 'think'; guard.mood = 'think'; return;
  } else if (ai.state === 'return') {
    const wp = MC.guardRoute[0]; gi = wp[0]; gj = wp[1]; speed = prof.patrol_speed;
    ai.percepts.at_route_start = Math.hypot(gi - guard.I, gj - guard.J) < 0.85;
    guard.mood = ''; guard.act = 'roll';
  }
  const fdi = gi - guard.I, fdj = gj - guard.J, fd = Math.hypot(fdi, fdj);
  if (!patrolFrozen && fd > 0.08 && moveToward(guard, gi, gj, SPEED * speed * dt)) {
    guard.roll += SPEED * speed * dt;
    guard.angle = Math.atan2(fdj, fdi); guard.face = faceTo(fdi, fdj);
  }
  if (traceLog.length >= 2000) traceLog.shift();
  traceLog.push({
    tick, state: ai.state, heat: +heist.heat.toFixed(4), tier: heist.tier,
    visible: ai.percepts.player_visible, alert: +ai.alert.toFixed(4),
    player: [+thief.I.toFixed(2), +thief.J.toFixed(2)],
    guard: [+guard.I.toFixed(2), +guard.J.toFixed(2)],
    channel: heist.channel?.kind || null, outcome: thief.outcome,
  });
}

// ---------------- canvas rendering ----------------
function blit(src, ratio, wx, wy) {
  const cv = src.cv || src, w = src.w || cv.width, h = src.h || cv.height, k = zr() / ratio;
  ctx.imageSmoothingEnabled = k < 0.999; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cv, 0, 0, w, h, Math.round(devX(wx)), Math.round(devY(wy)), Math.round(w * k), Math.round(h * k));
  ctx.imageSmoothingEnabled = false;
}
function isoPoly(H, pts, z) {
  return pts.map(([i, j]) => [devX(P.isoX(i, j)), devY(P.isoY(i, j, z ?? 0.03))]);
}
// Clip a vision ray to the current room box. Rays that leave through a doorway may
// continue into the neighbouring room; rays that hit a wall stop there. This keeps the
// drawn cone consistent with the LOS rule used by detection.
function clippedRayLength(I, J, angle, range) {
  const ox = Math.floor(I / N) * N, oy = Math.floor(J / N) * N;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let t = range;
  if (dx > 1e-6) t = Math.min(t, (ox + N - I) / dx);
  else if (dx < -1e-6) t = Math.min(t, (ox - I) / dx);
  if (dy > 1e-6) t = Math.min(t, (oy + N - J) / dy);
  else if (dy < -1e-6) t = Math.min(t, (oy - J) / dy);
  const exitI = I + dx * t, exitJ = J + dy * t;
  const li = ((exitI % N) + N) % N, lj = ((exitJ % N) + N) % N;
  const throughDoor = (Math.abs(dx) > 1e-6 && lj > 2.5 && lj < 6.5) ||
                      (Math.abs(dy) > 1e-6 && li > 2.5 && li < 6.5);
  if (throughDoor) t = Math.min(range, t + 5.0);
  return Math.max(0.25, t);
}
// Build a fan polygon whose far edge follows the clipped detection range.
function visionFan(I, J, angle, half, range, steps) {
  const pts = [[devX(P.isoX(I, J)), devY(P.isoY(I, J, 0.02))]];
  for (let s = 0; s <= steps; s++) {
    const a = angle - half + (s / steps) * half * 2;
    const r = clippedRayLength(I, J, a, range);
    const ti = I + Math.cos(a) * r, tj = J + Math.sin(a) * r;
    pts.push([devX(P.isoX(ti, tj)), devY(P.isoY(ti, tj, 0.02))]);
  }
  return pts;
}
function drawVisionFan(H, pts, ink, strong) {
  const k = dpr / Math.max(0.35, Math.min(1, cam.z));
  H.tint(pts, ink, strong ? 0.30 : (cam.z < 0.5 ? 0.10 : 0.16));
  H.outline(H.RB, pts, ink, (strong ? 1.3 : 0.9) * k, { tone: 0.8, amp: 0.08, dash: [3 * k, 3 * k] });
}
function drawFloorOverlays() {
  const H = P.mkHand(ctx, { seed: 3 });
  // Entrance mat (teal)
  const en = ENTRANCE;
  H.tint(isoPoly(H, [[en.I - 0.9, en.J - 0.9], [en.I + 0.9, en.J - 0.9], [en.I + 0.9, en.J + 0.9], [en.I - 0.9, en.J + 0.9]], 0.02), 'teal', 0.3);
  H.outline(H.RB, isoPoly(H, [[en.I - 0.9, en.J - 0.9], [en.I + 0.9, en.J - 0.9], [en.I + 0.9, en.J + 0.9], [en.I - 0.9, en.J + 0.9]], 0.02), 'teal', 1.6 * dpr, { dash: [5 * dpr, 4 * dpr], amp: 0.05 });

  // EAS exit gate zone
  const ready = thief.stolenValue >= QUOTA && thief.taggedIds.size === 0;
  const gateColor = ready ? 'teal' : 'coral';
  const ex = EXIT.I, ey = EXIT.J;
  const gp = isoPoly(H, [[ex - 0.8, ey - 1.0], [ex + 0.8, ey - 1.0], [ex + 0.8, ey + 1.0], [ex - 0.8, ey + 1.0]], 0.02);
  H.tint(gp, gateColor, ready ? 0.45 : 0.24);
  H.outline(H.RB, gp, gateColor, 1.8 * dpr, { dash: [6 * dpr, 4 * dpr], amp: 0.05 });

  // De-tagger station zone (sun)
  const dt = DETAGGER;
  const dp = isoPoly(H, [[dt.I - 0.8, dt.J - 0.8], [dt.I + 0.8, dt.J - 0.8], [dt.I + 0.8, dt.J + 0.8], [dt.I - 0.8, dt.J + 0.8]], 0.02);
  H.tint(dp, 'sun', thief.taggedIds.size ? 0.42 : 0.18);
  H.outline(H.RB, dp, 'sun', 1.6 * dpr, { dash: [5 * dpr, 4 * dpr], amp: 0.05 });

  // CCTV sweep cones — clipped to room walls, light dither only.
  for (const c of cameras) {
    const fan = visionFan(c.I, c.J, c.angle, c.halfAngle, c.range, 10);
    if (!heist.camerasDisabled) drawVisionFan(H, fan, c.sees ? 'coral' : 'blue', false);

    // Raise the housing to wall height; the sight cone still originates at its floor tile.
    const gx = devX(P.isoX(c.I, c.J)), gy = devY(P.isoY(c.I, c.J, 2.45));
    // roundRect takes (x0, y0, x1, y1, r, n) — corner coordinates, not width/height.
    const body = P.roundRect(gx - 8 * dpr, gy - 10 * dpr, gx + 8 * dpr, gy + 2 * dpr, 2 * dpr, 4);
    H.fill(body, c.sees ? 'coral' : 'blue', 0.95);
    H.outline(H.RB, body, 'black', 1.2 * dpr, { tone: 1, amp: 0 });
    const aimI = c.I + Math.cos(c.angle), aimJ = c.J + Math.sin(c.angle);
    const aimX = devX(P.isoX(aimI, aimJ)) - devX(P.isoX(c.I, c.J));
    const aimY = devY(P.isoY(aimI, aimJ, 2.45)) - gy;
    const aimLength = Math.hypot(aimX, aimY) || 1;
    const aimXUnit = aimX / aimLength, aimYUnit = aimY / aimLength;
    const bodyEdge = 1 / Math.max(Math.abs(aimXUnit) / 8, Math.abs(aimYUnit) / 6);
    const lensX = gx + aimXUnit * (bodyEdge - 2) * dpr;
    const lensY = gy + aimYUnit * (bodyEdge - 2) * dpr;
    H.fill(P.circ(lensX, lensY, 2.4 * dpr, 10), c.sees ? 'coral' : 'sun', 1);
    H.line(H.RB, [
      [gx + aimXUnit * bodyEdge * dpr, gy + aimYUnit * bodyEdge * dpr],
      [gx + aimXUnit * (bodyEdge + 5) * dpr, gy + aimYUnit * (bodyEdge + 5) * dpr],
    ], c.sees ? 'coral' : 'sun', 1.6 * dpr, { amp: 0 });
    H.line(H.RB, [[gx, gy + 2 * dpr], [gx, gy + 13 * dpr]], 'blue', 1.8 * dpr, { amp: 0 });
    H.tint(P.roundRect(gx - 10 * dpr, gy + 12 * dpr, gx + 10 * dpr, gy + 14 * dpr, 0, 4), 'charcoal', 0.7);
  }

  // Guard FOV cone — clipped to room walls, strong only when chasing or attacking.
  const ink = STATE_INK[ai.state] || 'teal', prof = activeProfile();
  const strong = ai.state === 'chase' || ai.state === 'attack';
  drawVisionFan(H, visionFan(guard.I, guard.J, guard.angle, prof.fov_half_angle, prof.fov_distance, 12), ink, strong);

  // Staff small cone — clipped to room walls.
  drawVisionFan(H, visionFan(staff.I, staff.J, staff.angle, 0.45, 4.2, 8), 'sun', false);

  // Last seen ghost
  if (ai.lastSeenPos && (ai.state === 'investigate' || ai.state === 'search' || cameras.some((c) => c.sees))) {
    const lx = devX(P.isoX(ai.lastSeenPos.I, ai.lastSeenPos.J)), ly = devY(P.isoY(ai.lastSeenPos.I, ai.lastSeenPos.J, 0.04));
    H.outline(H.RB, P.ell(lx, ly, 18 * dpr, 10 * dpr, 20), 'coral', 1.6 * dpr, { dash: [4 * dpr, 4 * dpr], amp: 0 });
  }
  // Sound ring
  if (ai.soundWave) {
    const ring = [];
    for (let s = 0; s < 24; s++) {
      const a = s / 24 * Math.PI * 2, ti = ai.soundWave.I + Math.cos(a) * ai.soundWave.r, tj = ai.soundWave.J + Math.sin(a) * ai.soundWave.r;
      ring.push([devX(P.isoX(ti, tj)), devY(P.isoY(ti, tj, 0.05))]);
    }
    H.outline(H.RB, ring, 'coral', 2.2 * dpr, { tone: 1, dash: [5 * dpr, 4 * dpr], amp: 0.1 });
  }
}
function drawCharacter(R, e, t, role) {
  const [gx, gy] = P.iso(e.I - R.rm.at[0] * N, e.J - R.rm.at[1] * N, 0);
  ctx.save();
  const scale = zr() * B.SCALE * (role === 'thief' ? 0.95 : 1.08);
  ctx.setTransform(scale, 0, 0, scale, Math.round(devX(R.ox + gx)), Math.round(devY(R.oy + gy)));
  const H = P.mkHand(ctx, { fine: true, seed: role === 'thief' ? 9 : role === 'guard' ? 5 : 7 });
  B.drawBot(H, null, { t, face: e.face || 'se', act: e.act || 'idle', u: 0, mood: e.mood || '', roll: e.roll || 0, carry: role === 'thief' ? e.carry : false });
  if (role === 'thief') {
    const band = P.roundRect(-14, -22, 14, -15, 3, 4);
    H.fill(band, 'teal', 0.92, { fine: true });
    H.outline(H.RB, band, 'black', 0.9, { tone: 1, amp: 0, fine: true });
  } else {
    // Cap: detective = blue + gold badge, staff = yellow + red "S"
    const isGuard = role === 'guard';
    const capInk = isGuard ? 'blue' : 'sun';
    H.fill(P.ell(0, -32, 12, 5.5, 20), capInk, 0.95, { fine: true });
    H.fill(P.ell(e.face === 'sw' || e.face === 'nw' ? -5 : 5, -29, 10, 3.2, 16), 'black', 1, { fine: true });
    H.outline(H.RB, P.ell(0, -32, 12, 5.5, 20), 'black', 1.0, { tone: 1, amp: 0, fine: true });
    H.fill(P.circ(0, -32, 2.8, 10), isGuard ? 'sun' : 'coral', 1, { fine: true });
  }
  ctx.restore();
}
function draw(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, stage.width, stage.height);
  ctx.imageSmoothingEnabled = false;
  if (!roomOrder) roomOrder = [...rooms.values()].sort((a, b) => a.rm.at[0] + a.rm.at[1] - b.rm.at[0] - b.rm.at[1]);
  const list = roomOrder;
  for (const R of list) { if (!roomInView(R)) continue; const base = baseOf(R); blit(base.cv, base.ratio, R.ox + R.b.x0, R.oy + R.b.y0); }
  drawFloorOverlays();
  for (const R of list) {
    if (!roomInView(R)) continue;
    const things = [];
    for (const it of R.items) {
      if (hidden.has(it.id)) continue;
      const k = kindOf(it);
      if (S.layerOf(k) !== 'stand') continue;
      things.push({ key: K.depthOf(k, it), it });
    }
    const gr = roomAt(guard.I, guard.J), sr = roomAt(staff.I, staff.J), tr = roomAt(thief.I, thief.J);
    if (gr && rooms.get(gr.id) === R) things.push({ key: guard.I - R.rm.at[0] * N + guard.J - R.rm.at[1] * N + 0.01, entity: guard, role: 'guard' });
    if (sr && rooms.get(sr.id) === R) things.push({ key: staff.I - R.rm.at[0] * N + staff.J - R.rm.at[1] * N + 0.015, entity: staff, role: 'staff' });
    if (tr && rooms.get(tr.id) === R) things.push({ key: thief.I - R.rm.at[0] * N + thief.J - R.rm.at[1] * N + 0.02, entity: thief, role: 'thief' });
    things.sort((a, b) => a.key - b.key);
    for (const th of things) {
      if (th.entity) { drawCharacter(R, th.entity, t, th.role); continue; }
      const s = spriteOf(th.it), wx = R.ox + s.x0, wy = R.oy + s.y0;
      const isLoot = LOOT.has(th.it.id) && !thief.stolenIds.has(th.it.id);
      if (isLoot || hover === th.it.id) {
        const k = zr() / s.ratio, o = (hover === th.it.id ? 3 : 2) * dpr, hi = hiOf(s, o, k);
        ctx.drawImage(hi.cv, Math.round(devX(wx) - hi.pad * k), Math.round(devY(wy) - hi.pad * k), Math.round(hi.cv.width * k), Math.round(hi.cv.height * k));
      }
      blit(s.cv, s.ratio, wx, wy);
    }
  }
}

// ---------------- DOM overlays & feed ----------------
function setText(sel, v) { const el = $(sel); if (el && el.textContent !== v) el.textContent = v; }
function setHeatSpine(tier, pct) {
  const spine = $('#heat-spine');
  if (spine) {
    spine.dataset.tier = String(tier);
    spine.setAttribute('aria-valuenow', String(tier));
  }
  const notches = spine?.querySelectorAll?.('.heat-notch') || [];
  notches.forEach((n, i) => n.classList.toggle('is-on', i <= tier));
}
function renderObjectives() {
  const ul = $('#objective-list');
  if (!ul || !heist) return;
  const nodes = heist.objectives.map((o) => {
    const li = document.createElement('li');
    li.className = 'objective' + (o.done ? ' is-done' : '');
    const mark = document.createElement('span'); mark.className = 'objective-mark'; mark.textContent = o.done ? '✓' : '○';
    const label = document.createElement('span'); label.textContent = o.label;
    li.append(mark, label);
    return li;
  });
  ul.replaceChildren(...nodes);
}
function heistStatus() {
  if (!heist) return '';
  if (heist.channel) {
    const names = { steal: 'Stealing', detag: 'De-tagging', power: 'Cutting CCTV power', vitrine: 'Forcing the vitrine' };
    const pct = Math.round((heist.channel.progress / heist.channel.hold) * 100);
    return `${names[heist.channel.kind] || 'Working'} · ${pct}% · stay still and out of sight`;
  }
  if (!HST.canCarry(heist)) return `Bag full (${heist.bagCap} goods). De-tag and reach the EAS exit.`;
  if (heist.tier >= 4) return 'LOCKDOWN. Crouch with C and hide until heat drops.';
  if (heist.tier >= 2) return 'They are watching. Break line of sight, then crouch.';
  if (thief.taggedIds.size) return 'RF tags active. Strip them before the exit.';
  if (thief.stolenValue >= QUOTA) return 'Quota met. Finish the plan, then reach the exit.';
  return 'Enter through the red arch. Stay low and quiet.';
}
function updateDomOverlays() {
  const gw = P.isoX(guard.I, guard.J), gh = P.isoY(guard.I, guard.J, 1.45);
  setText('#glance-dot', '');
  const tether = $('#glance-tether');
  if (tether) { tether.style.left = `${Math.round(devX(gw) / dpr)}px`; tether.style.top = `${Math.round(devY(gh) / dpr)}px`; }
  const tw = P.isoX(thief.I, thief.J), th = P.isoY(thief.I, thief.J, 1.35);
  const prompt = $('#thief-prompt');
  const distDetag = Math.hypot(thief.I - DETAGGER.I, thief.J - DETAGGER.J);
  const distExit = Math.hypot(thief.I - EXIT.I, thief.J - EXIT.J);
  const near = nearestLoot();

  // @break-ui fixture modes feed the same DOM formatting/clamping paths as the house game.
  if (breakDataMode !== 'demo' && MARKET_FIXTURES[breakDataMode]) {
    const f = MARKET_FIXTURES[breakDataMode];
    const pct = Math.round(clampNum(f.alert * 100, 0, 100));
    const hp = Math.round(clampNum(f.hp, 0, 100));
    const firings = Math.max(0, Math.round(Number(f.firings) || 0));
    const pair = `${f.src} → ${f.dst}`;
    setText('#header-bot-name', 'Heist');
    setText('#glance-state-text', middleTruncate(f.state.toUpperCase(), 20));
    setText('#glance-arch-text', middleTruncate(f.arch, 14));
    const gd = $('#glance-dot'); if (gd) gd.style.background = STATE_CSS[f.state.split('_')[0]] || '#008c8a';
    const gbf = $('#glance-bar-fill'); if (gbf) gbf.style.width = `${pct}%`;
    setText('#glance-rule-srcdst', middleTruncate(pair, 22));
    setText('#glance-rule-guard', middleTruncate(f.rule, 18));
    if (prompt) {
      prompt.hidden = !f.promptText;
      if (f.promptText) { prompt.style.left = `${Math.round(devX(tw) / dpr)}px`; prompt.style.top = `${Math.round(devY(th) / dpr)}px`; setText('#thief-prompt-text', f.promptText); }
    }
    setText('#loot-total', '€12,345,679');
    setText('#loot-status', `stolen · quota ${money(QUOTA)}`);
    setText('#panel-arch-badge', `Detective: ${middleTruncate(f.state.toUpperCase(), 22)} (${middleTruncate(f.arch, 18)})`);
    setText('#p-dist', `${nfOne.format(clampNum(f.dist, 0, 999))} tiles`);
    setText('#p-los', pct > 50 ? 'SPOTTED!' : 'hidden');
    setText('#p-hp', `${hp}%`);
    setText('#rate-place', `p_${f.state}`);
    setText('#rate-loot-count', f.lootText);
    setText('#rate-nearest-loot', middleTruncate(`nearest: Q3_Heist_Target_Aleksandra_Wiśniewska-Kowalczyk_Edition_v12_FINAL.heic (€12,345,679)`, 40));
    setText('#rate-fov', f.fovText);
    setText('#rate-firings', nfInt.format(firings));
    setText('#rate-firings-label', pluralEn.select(firings) === 'one' ? 'switch' : 'switches');
    setText('#rate-guard-last', `rule: ${f.rule}`);
    setText('#tag-count', f.tagText);
    const abf = $('#alert-bar-fill'); if (abf) abf.style.width = `${pct}%`;
    const ab = $('#alert-bar'); if (ab) ab.setAttribute('aria-valuenow', String(pct));
    setText('#alert-tier', f.state);
    setText('#alert-numbers', `${pct}% suspicion · ${f.tagText} · ${f.fovText}`);
    setText('#bt-active-pill', `ReactiveSelector(Root) > Sequence[Investigate_Secondary_Auditory_Anomaly_With_Long_Unbreakable_Identifier_9f8e7d6c5b4a] > Act:inspect_noise_origin (RUNNING)`);
    setText('#heat-label', middleTruncate(f.state.toUpperCase(), 16));
    setText('#heat-note', middleTruncate(f.fovText, 24));
    setText('#bag-count', f.lootText);
    setHeatSpine(Math.max(0, Math.min(5, Math.floor(pct / 20))), pct);
    setText('#heist-status', middleTruncate(f.promptText || 'Stress fixture active', 60));
    const telBreak = $('#telemetry'); if (telBreak) telBreak.open = true;
    return;
  }

  setText('#header-bot-name', 'Heist');
  setText('#glance-state-text', ai.state.toUpperCase());
  const tierInfo = HST.TIERS[heist.tier];
  setText('#heat-label', tierInfo.label);
  setText('#heat-note', tierInfo.note);
  setHeatSpine(heist.tier, Math.round(clampNum(heist.heat * 100, 0, 100)));
  setText('#bag-count', `${heist.bag.length} / ${heist.bagCap} bag`);
  renderObjectives();
  setText('#heist-status', heistStatus());
  const telDemo = $('#telemetry'); if (telDemo) telDemo.open = false;
  const dot = $('#glance-dot'); if (dot) dot.style.background = STATE_CSS[ai.state] || '#008c8a';
  setText('#glance-arch-text', `${ai.arch} · ${activeProfile().label}`);
  const pct = Math.round(clampNum(ai.alert * 100, 0, 100));
  const bar = $('#glance-bar-fill'); if (bar) bar.style.width = `${pct}%`;
  const tr = `${ai.lastTransition.src} → ${ai.lastTransition.dst}`;
  setText('#glance-rule-srcdst', tr); setText('#glance-rule-guard', ai.lastTransition.guard);

  let promptText = '';
  if (heist.channel) {
    const names = { steal: 'Stealing', detag: 'De-tagging', power: 'Cutting CCTV power', vitrine: 'Forcing the vitrine' };
    const p = Math.round((heist.channel.progress / heist.channel.hold) * 100);
    promptText = `${names[heist.channel.kind] || 'Working'} · ${p}% · hold still`;
  } else if (near && near.dist <= 2.2) {
    promptText = hasLineOfSight(thief.I, thief.J, near.ti, near.tj, near.id)
      ? `Hold E: steal ${near.meta.label} (${money(near.meta.value)})`
      : 'A wall blocks the goods · move into the aisle';
  }
  else if (distDetag <= 2.0 && thief.taggedIds.size) promptText = `Deactivate ${thief.taggedIds.size} RF tag(s) here (E)`;
  else if (distExit <= 2.4) {
    const left = heist.objectives.filter((o) => o.id !== 'escape' && !o.done).map((o) => o.label);
    promptText = thief.taggedIds.size
      ? `EAS ALARM: ${thief.taggedIds.size} RF tag(s) active — de-tag first!`
      : (thief.stolenValue < QUOTA
        ? `Need ${money(QUOTA - thief.stolenValue)} more before the exit`
        : (left.length ? `Finish: ${left.join(' · ')}` : 'Walk through EAS gate to escape!'));
  }
  if (prompt) {
    prompt.hidden = !promptText;
    if (promptText) { prompt.style.left = `${Math.round(devX(tw) / dpr)}px`; prompt.style.top = `${Math.round(devY(th) / dpr)}px`; setText('#thief-prompt-text', promptText); }
  }

  setText('#loot-total', money(thief.stolenValue));
  setText('#loot-status', thief.stolenValue >= QUOTA ? `QUOTA MET · tags ${thief.taggedIds.size}` : `stolen · quota ${money(QUOTA)}`);
  setText('#panel-arch-badge', `Detective: ${ai.state.toUpperCase()} (${ai.arch} · ${activeProfile().label})`);
  const trip = $('#panel-trip'); if (trip) trip.classList.toggle('is-now', ai.state === 'chase' || ai.state === 'attack' || cameras.some((c) => c.sees));
  setText('#p-dist', `${nfOne.format(ai.percepts.player_dist)} tiles`);
  setText('#p-los', ai.percepts.player_visible ? 'SPOTTED!' : 'hidden (pos=None)');
  setText('#p-hp', `${Math.round(clampNum(thief.hp, 0, 100))}%`);

  setText('#rate-place', `p_${ai.state}`);
  setText('#rate-loot-count', `${thief.stolenIds.size} / ${LOOT.size}`);
  setText('#rate-nearest-loot', near ? `next: ${near.meta.label} (${money(near.meta.value)})` : 'All tagged! Escape!');
  setText('#rate-fov', cameras.filter((c) => c.sees).length ? `${cameras.filter((c) => c.sees).length} CCTV ALERT` : (ai.percepts.player_visible ? 'SPOTTED' : 'Hidden'));
  setText('#rate-firings', nfInt.format(ai.firings));
  setText('#rate-firings-label', pluralEn.select(ai.firings) === 'one' ? 'switch' : 'switches');
  setText('#rate-guard-last', `rule: ${ai.lastTransition.guard}`);

  setText('#alert-tier', pct >= 80 ? 'ALARMED (Detective chasing / CCTV lock!)' : pct >= 42 ? 'Suspicious (investigating / searching)' : 'Calm (routine shelf patrol)');
  const ab = $('#alert-bar-fill'); if (ab) ab.style.width = `${pct}%`;
  const alertBar = $('#alert-bar'); if (alertBar) alertBar.setAttribute('aria-valuenow', String(pct));
  setText('#alert-numbers', `${pct}% suspicion · ${thief.taggedIds.size} RF tag(s) · ${cameras.filter((c) => c.sees).length}/${cameras.length} CCTV on you`);
  setText('#rate-guard-last', `rule: ${ai.lastTransition.guard}`);
  setText('#bt-active-pill', ai.btActivePath);
  setText('#tag-count', `${thief.taggedIds.size} active RF tag(s)`);
}

function renderFeed() {
  const ol = $('#feed'), more = $('#more');
  if (!ol) return;
  const list = (breakDataMode !== 'demo' && MARKET_FIXTURES[breakDataMode])
    ? MARKET_FIXTURES[breakDataMode].feed
    : ai.feedLog;
  if (!list.length) {
    const li = document.createElement('li'); li.className = 'feed-empty';
    li.textContent = 'No shoplifting events or Guard state switches recorded yet.';
    ol.replaceChildren(li); if (more) more.hidden = true; return;
  }
  const slice = list.slice(0, feedShown);
  ol.replaceChildren(...slice.map((e, idx) => {
    const li = document.createElement('li'); li.className = 'grp';
    const gt = document.createElement('p'); gt.className = 'grp-t'; gt.textContent = `${e.time} · ${e.arch}`;
    const card = document.createElement('div'); card.className = 'card' + (idx === 0 ? ' is-now' : '');
    const kick = document.createElement('p'); kick.className = 'card-kicker';
    const klabel = document.createElement('span'); klabel.textContent = e.isLoot ? 'Shoplift action' : 'Security event';
    kick.append(klabel);
    if (e.tag) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = e.tag; kick.append(' ', t); }
    const title = document.createElement('h3'); title.className = 'card-title'; title.textContent = (e.title || 'Untitled event') + (e.sub ? ' ' : '');
    if (e.sub) { const s = document.createElement('span'); s.className = 'card-sub'; s.textContent = e.sub; title.append(s); }
    const meta = document.createElement('p'); meta.className = 'card-meta';
    const badge = document.createElement('span'); badge.className = 'price' + (e.isLoot ? ' is-loot' : ''); badge.textContent = e.badge || '—';
    meta.append(badge); if (e.metaText) meta.append(' ', e.metaText);
    card.append(kick, title, meta);
    if (e.quote && String(e.quote).trim()) { const q = document.createElement('p'); q.className = 'card-quote'; q.textContent = `“${e.quote}”`; card.append(q); }
    if (e.note && String(e.note).trim()) { const n = document.createElement('p'); n.className = 'card-note'; n.textContent = e.note; card.append(n); }
    li.append(gt, card); return li;
  }));
  if (more) {
    if (list.length > feedShown) { more.hidden = false; more.textContent = `Show earlier (showing ${slice.length} of ${list.length})`; }
    else more.hidden = true;
  }
}

// ---------------- hit testing & controls ----------------
function hullOf(it) {
  const k = kindOf(it), sz = K.sizeOf(k, it), pl = K.placer(it.at, sz), [w, d] = sz, wall = k.place === 'wall', pts = [];
  for (const u of [0, w]) for (const v of [0, wall ? 0.1 : d]) for (const z of [0, wall ? d : Math.max(0.05, k.height || 0.2)]) pts.push(P.iso(...pl.W(u, v, z)));
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
function thingAt(px, py) {
  const [wx, wy] = toWorld(px, py);
  let best = null, bk = -Infinity;
  for (const R of rooms.values()) for (const it of R.items) {
    if (hidden.has(it.id)) continue;
    const k = kindOf(it), key = S.layerOf(k) === 'stand' ? K.depthOf(k, it) : -3;
    if (key > bk && P.pip(hullOf(it), wx - R.ox, wy - R.oy)) { best = it; bk = key; }
  }
  return best;
}
const at = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
let drag = null, moved = 0;
stage.addEventListener('pointerdown', (e) => { drag = { x: at(e)[0], y: at(e)[1] }; moved = 0; });
stage.addEventListener('pointermove', (e) => {
  if (drag) {
    const [ex, ey] = at(e), dx = ex - drag.x, dy = ey - drag.y;
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 5) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; userCam = true; tween = null; stage.classList.add('is-drag'); }
    drag = { x: ex, y: ey }; return;
  }
  if (e.pointerType === 'mouse') { const it = thingAt(...at(e)); hover = it ? it.id : null; stage.classList.toggle('is-point', !!(it && LOOT.has(it.id))); }
});
stage.addEventListener('pointerup', (e) => {
  stage.classList.remove('is-drag');
  if (drag && moved <= 5) {
    const [px, py] = at(e), clicked = thingAt(px, py), [wx, wy] = toWorld(px, py), [ti, tj] = worldToTile(wx, wy);
    const cI = Math.max(0.8, Math.min(COLS * N - 0.8, ti)), cJ = Math.max(0.8, Math.min(ROWS * N - 0.8, tj));
    if (e.shiftKey) tossCoin(cI, cJ);
    else if (clicked && LOOT.has(clicked.id) && !thief.stolenIds.has(clicked.id)) {
      const [li, lj] = itemTilePos(clicked);
      thief.autoPlay = false; syncModeBtns();
      thief.targetI = li; thief.targetJ = lj; thief.pendingStealId = clicked.id;
    } else if (Math.hypot(cI - DETAGGER.I, cJ - DETAGGER.J) < 2.2) {
      thief.autoPlay = false; syncModeBtns();
      thief.targetI = DETAGGER.I; thief.targetJ = DETAGGER.J; thief.pendingStealId = null;
      setTimeout(() => { if (Math.hypot(thief.I - DETAGGER.I, thief.J - DETAGGER.J) < 2.2) detagAll(); }, 700);
    } else { thief.autoPlay = false; syncModeBtns(); thief.targetI = cI; thief.targetJ = cJ; thief.pendingStealId = null; }
  }
  drag = null;
});
let wheelAcc = 0;
stage.addEventListener('wheel', (e) => {
  e.preventDefault(); wheelAcc += e.deltaY * (e.deltaMode ? 30 : 1);
  if (Math.abs(wheelAcc) > 60) { zoomBy(wheelAcc < 0 ? 1 : -1, ...at(e)); wheelAcc = 0; }
}, { passive: false });
for (const b of document.querySelectorAll('[data-zoom]')) b.addEventListener('click', () => {
  const z = b.dataset.zoom;
  if (z === 'fit') { userCam = false; fitTo(worldBounds(), true); } else zoomBy(z === 'in' ? 1 : -1);
});

function holdFor(loot) { return 1.4 + (loot.meta.value / 70) * 2.2; }
function startStealChannel(loot) {
  if (!HST.canCarry(heist)) {
    pushFeed({ time: `Tick ${nfInt.format(ai.percepts.tick)}`, arch: 'HEIST', isLoot: false, tag: 'bag-full',
      title: 'Your bag is full', sub: `carry at most ${heist.bagCap} goods`, badge: 'FULL',
      metaText: `Cannot take ${loot.meta.label}`, quote: 'Choose high-value goods, or make a second trip.', note: '' });
    return;
  }
  HST.startChannel(heist, 'steal', loot.id, holdFor(loot));
}
function tryStealOrDetag() {
  if (heist.channel) return;
  if (Math.hypot(thief.I - PANEL.I, thief.J - PANEL.J) <= 2.0 && !heist.camerasDisabled &&
      hasLineOfSight(thief.I, thief.J, PANEL.I, PANEL.J)) {
    HST.startChannel(heist, 'power', null, 2.4); return;
  }
  if (Math.hypot(thief.I - DETAGGER.I, thief.J - DETAGGER.J) <= 2.3 &&
      hasLineOfSight(thief.I, thief.J, DETAGGER.I, DETAGGER.J)) {
    if (thief.taggedIds.size) HST.startChannel(heist, 'detag', null, 1.8);
    else detagAll();
    return;
  }
  const near = nearestLoot();
  if (!near) return;
  if (near.dist <= 2.4) {
    if (!hasLineOfSight(thief.I, thief.J, near.ti, near.tj, near.id)) {
      pushFeed({ time: `Tick ${nfInt.format(ai.percepts.tick)}`, arch: 'HEIST', isLoot: false, tag: 'blocked',
        title: 'A wall blocks the goods', sub: 'step into the same aisle', badge: 'BLOCKED',
        metaText: `Cannot reach ${near.meta.label} from here`, quote: 'Move around the shelf or through the doorway first.', note: '' });
      return;
    }
    if (near.id === 'm_spirits' && !heist.vitrineOpen) HST.startChannel(heist, 'vitrine', null, 3.2);
    else startStealChannel(near);
  } else { thief.targetI = near.ti; thief.targetJ = near.tj; thief.pendingStealId = near.id; }
}
function syncModeBtns() {
  const p = $('#mode-play-btn'), a = $('#mode-auto-btn');
  if (p) p.classList.toggle('is-active', !thief.autoPlay);
  if (a) a.classList.toggle('is-active', thief.autoPlay);
}
window.addEventListener('keydown', (e) => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  keysDown.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyE' || e.code === 'Space') tryStealOrDetag();
  else if (e.code === 'KeyQ') tossCoin();
  else if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey) resetHeist();
});
window.addEventListener('keyup', (e) => keysDown.delete(e.code));

$('#steal-btn')?.addEventListener('click', tryStealOrDetag);
$('#coin-btn')?.addEventListener('click', () => tossCoin());
$('#reset-heist-btn')?.addEventListener('click', resetHeist);
$('#banner-retry-btn')?.addEventListener('click', () => {
  if (thief.outcome) resetHeist();
  else $('#heist-banner').hidden = true; // dismiss a recoverable EAS alarm warning
});
$('#more')?.addEventListener('click', () => { feedShown += 20; renderFeed(); });
$('#mode-play-btn')?.addEventListener('click', () => { thief.autoPlay = false; syncModeBtns(); });
$('#mode-auto-btn')?.addEventListener('click', () => { thief.autoPlay = true; syncModeBtns(); });
$('#arch-switch-btn')?.addEventListener('click', () => {
  ai.arch = ai.arch === 'FSM' ? 'BT' : 'FSM';
  setText('#arch-switch-btn', `Guard: ${ai.arch}`);
  updateDomOverlays();
});
$('#profile-switch-btn')?.addEventListener('click', () => {
  const i = PROFILE_ORDER.indexOf(ai.profileId);
  ai.profileId = PROFILE_ORDER[(i + 1) % PROFILE_ORDER.length];
  const p = activeProfile();
  setText('#profile-switch-btn', `Trait: ${p.label}`);
  pushFeed({ time: `Tick ${nfInt.format(ai.percepts.tick)}`, arch: `${ai.arch} · ${p.label}`, isLoot: false,
    tag: `fov ${nfOne.format(p.fov_distance)}t`, title: `Detective Personality → ${p.label}`, sub: `(alert gate ${Math.round(p.alert_detect_threshold * 100)}%)`,
    badge: p.id, metaText: p.summary, quote: `Detective now uses ${p.label} perception thresholds.`, note: '' });
  updateDomOverlays();
});
document.querySelectorAll('[data-scn]').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.scn === 'lure') emitSound(14.5, 13.5, 8.0, 'stockroom distraction');
  else if (b.dataset.scn === 'sound') emitSound(thief.I, thief.J, 6.5, 'loud footstep');
}));

function setBreakMode(mode) {
  if (!['demo', 'worst', 'empty', 'one', 'huge'].includes(mode)) mode = 'demo';
  breakDataMode = mode; feedShown = 20;
  document.querySelectorAll('[data-break-mode]').forEach((b) => b.toggleAttribute('data-active', b.dataset.breakMode === mode));
  try { const u = new URL(location.href); u.searchParams.set('data', mode); history.replaceState(null, '', u); } catch {}
  renderFeed(); updateDomOverlays();
}
document.querySelectorAll('[data-break-mode]').forEach((b) => b.addEventListener('click', () => setBreakMode(b.dataset.breakMode)));

// ---------------- boot ----------------
function paperTile() {
  const tile = (ink, tone, scale) => {
    const t = P.ditherTile(ink, Math.round(tone * 64)), cv = HS.env.makeCanvas(8 * scale, 8 * scale), c = cv.getContext('2d');
    c.imageSmoothingEnabled = false; c.drawImage(t, 0, 0, 8 * scale, 8 * scale);
    return `url(${cv.toDataURL()})`;
  };
  const rs = document.documentElement.style;
  rs.setProperty('--dither-coral', tile('coral', 0.72, 1));
  rs.setProperty('--dither-sun', tile('sun', 0.35, 1));
  rs.setProperty('--dither-teal', tile('teal', 0.55, 1));
}
function tick(now) {
  if (!house) return;
  const t = now / 1000, dt = Math.min(0.05, lastT ? t - lastT : 0.016);
  lastT = t; clock += dt;
  if (tween) { const u = Math.min(1, (clock - tween.t0) / tween.d), e = P.sm(u); cam.x = P.lerp(tween.x0, tween.x1, e); cam.y = P.lerp(tween.y0, tween.y1, e); if (u >= 1) tween = null; }
  step(dt);
  draw(clock); updateDomOverlays(); updateZoneStrip();
}
function frame(now) { requestAnimationFrame(frame); tick(now); }
function init() {
  paperTile();
  house = MC.house;
  kinds = { ...window.KINDS_DATA, ...MC.kinds };
  loadImages(); index();
  $('#loading').hidden = true;
  resize(); resetHeist(); draw(0);
  try { setBreakMode(new URLSearchParams(location.search).get('data') || 'demo'); } catch {}
  new ResizeObserver(() => resize()).observe(view);
  globalThis.MARKET_DEBUG = {
    snapshot: () => ({
      I: thief.I, J: thief.J, state: ai.state, alert: ai.alert,
      stolenValue: thief.stolenValue, stolenIds: [...thief.stolenIds],
      tags: [...thief.taggedIds], outcome: thief.outcome,
      camSightings: cameras.filter((c) => c.sees).map((c) => c.id),
      guardI: guard.I, guardJ: guard.J, staffI: staff.I, staffJ: staff.J,
      guardWp: ai.wpIndex, staffWp: staff.wp,
      heat: heist.heat, tier: heist.tier, phase: heist.phase,
      bag: heist.bag.length, bagCap: heist.bagCap,
      channel: heist.channel ? { kind: heist.channel.kind, progress: heist.channel.progress, hold: heist.channel.hold } : null,
      objectives: heist.objectives.map((o) => ({ id: o.id, done: o.done })),
      camerasDisabled: heist.camerasDisabled, vitrineOpen: heist.vitrineOpen,
      crouched: keysDown.has('KeyC'),
      target: [thief.targetI, thief.targetJ], visible: ai.percepts.player_visible,
      lastCancel: heist.lastCancel || null,
    }),
    teleport: (I, J) => { thief.I = I; thief.J = J; },
    canWalk: (I, J, I2, J2) => canWalk(I, J, I2, J2),
    los: (I, J, I2, J2) => hasLineOfSight(I, J, I2, J2),
    zone: () => updateZoneStrip(),
    isBlockedTile: (I, J) => isBlockedTile(I, J),
    blockers: (I, J) => {
      const out = [];
      for (const R of rooms.values()) for (const it of R.items) {
        if (hidden.has(it.id)) continue;
        const k = kindOf(it);
        if (!k || S.layerOf(k) !== 'stand' || PASSABLE_FIXTURES.has(it.kind) || (k.height || 0) < 0.01) continue;
        const tiles = K.footprint(k, it);
        if (!tiles.length) continue;
        const minI = Math.min(...tiles.map((t) => R.rm.at[0] * N + t[0]));
        const maxI = Math.max(...tiles.map((t) => R.rm.at[0] * N + t[0]));
        const minJ = Math.min(...tiles.map((t) => R.rm.at[1] * N + t[1]));
        const maxJ = Math.max(...tiles.map((t) => R.rm.at[1] * N + t[1]));
        if (I > minI - 0.02 && I < maxI + 1.02 && J > minJ - 0.02 && J < maxJ + 1.02)
          out.push({ id: it.id, kind: it.kind, tile: [minI, minJ], room: it.room });
      }
      return out;
    },
    keys: keysDown,
    steal: () => tryStealOrDetag(),
    tick: (dt = 1 / 60) => step(dt),
    setAlert: (v) => { HST.setHeat(heist, v); ai.alert = heist.heat; },
    setHeat: (v) => { HST.setHeat(heist, v); ai.alert = heist.heat; },
    heist: () => heist,
    trace: () => traceLog.slice(),
    clearTrace: () => { traceLog.length = 0; },
    reset: () => resetHeist(),
    freezePatrol: (on = true) => { patrolFrozen = !!on; },
    setGuard: (I, J) => { guard.I = I; guard.J = J; },
    setStaff: (I, J) => { staff.I = I; staff.J = J; },
    fans: () => cameras.map((c) => ({ id: c.id, I: c.I, J: c.J, angle: c.angle,
      pts: visionFan(c.I, c.J, c.angle, c.halfAngle, c.range, 10) })),
  };
  requestAnimationFrame(frame);
}
init();
})();
