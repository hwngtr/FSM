'use strict';
// The Heist at Dither's House — Playable Stealth Robbery vs. Smart NPC Guard AI
// Guard AI runs the single-source 7-state FSM + 1-token Petri Net OR Reactive Behavior Tree.
(() => {
const HS = globalThis.HOUSE, { P, W, K, S, B } = HS;
const $ = (q, el = document) => el.querySelector(q);
const view = $('#view'), stage = $('#stage'), ctx = stage.getContext('2d');
const ZOOMS = [0.25, 0.33, 0.42, 0.5, 0.56, 0.62, 0.75, 0.875, 1, 1.25, 1.5, 2, 2.5, 3];
const MAX_RATIO = 3;
const SPEED = 3.1;
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;

const nfInt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nfOne = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pluralEn = new Intl.PluralRules('en-US');

const clampNum = (v, lo, hi) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
};
const money = (n) => {
  const val = Number(n);
  if (!Number.isFinite(val)) return '$0';
  return '$' + nfInt.format(Math.round(val));
};
const middleTruncate = (str, max = 24) => {
  const s = String(str ?? '');
  if (s.length <= max) return s;
  const keep = Math.max(4, Math.floor((max - 1) / 2));
  return s.slice(0, keep) + '…' + s.slice(s.length - keep);
};

let house = null, kinds = {}, images = {}, dpr = 1, vw = 0, vh = 0, zi = 7, lastT = 0, clock = 0;
const rooms = new Map();
const sprites = new Map();
const hidden = new Set();
const appearing = new Map();
const cam = { x: 0, y: 0, z: ZOOMS[zi] };
let fitZi = 0, tween = null, userCam = false, hover = null;
let breakDataMode = 'demo';   // 'demo' | 'worst' | 'empty' | 'one' | 'huge'
let feedShown = 20;

const kindOf = (it) => kinds[it.kind];
let shownHouse = { rooms: [] }, cellMap = new Map(), blocked = null;

// ============================================================================
// HEIST LOOT CATALOG (10 high-value targets inside the house)
// ============================================================================
const HEIST_QUOTA = 5000;
const LOOT_TARGETS = new Map([
  ['i76', { label: 'Mac Studio M5 Max', value: 2499, noise: 3.8, roomName: 'the office' }],
  ['i48', { label: 'iPhone Duo 256GB', value: 1999, noise: 2.2, roomName: 'the living room' }],
  ['i42', { label: 'Apple Studio Display', value: 1599, noise: 4.2, roomName: 'the office' }],
  ['i31', { label: 'MacBook Air 13" M5', value: 1299, noise: 2.5, roomName: 'the office' }],
  ['i77', { label: 'Yamaha Digital Piano', value: 1200, noise: 5.8, roomName: 'the music room' }],
  ['i78', { label: 'Renoir Print (Framed)', value: 750, noise: 2.6, roomName: 'the first room' }],
  ['i15', { label: 'Monet Print (Framed)', value: 650, noise: 2.6, roomName: 'the first room' }],
  ['i11', { label: 'PlayStation 5 Console', value: 599, noise: 3.4, roomName: 'the living room' }],
  ['i50', { label: 'Breville Espresso Pro', value: 500, noise: 3.6, roomName: 'the kitchen' }],
  ['i12', { label: 'Nebula Smart Projector', value: 399, noise: 2.8, roomName: 'the first room' }],
]);

// ============================================================================
// @break-ui WORST-CASE, EMPTY, ONE & 1,000-ROW FIXTURES
// ============================================================================
const BREAK_UI_FIXTURES = {
  worst: {
    botName: 'Aleksandra Wiśniewska-Kowalczyk & Đặng Thị Ngọc Hân',
    state: 'investigate_secondary_auditory_anomaly_in_north_corridor',
    archLabel: 'ReactiveSelector_PriorityPreemption_With_Blackboard_v12.4.0-rc3',
    src: 'patrol_outer_perimeter_waypoint_04',
    dst: 'investigate_secondary_auditory_anomaly_in_north_corridor',
    guardRule: 'player_visible_through_north_corridor_window_with_partial_occlusion',
    alert: 1.42,
    stolenValue: 12345678.9,
    quota: 5000,
    hp: -42.5,
    dist: 0.1 + 0.2,
    firings: 1284901,
    lootCountText: '12 / 10',
    nearestLootText: 'nearest: Q3_Heist_Target_Aleksandra_Wiśniewska-Kowalczyk_Edition_v12_FINAL.heic ($12,345,679)',
    promptText: 'Steal Christopher Alexander Montgomery III’s Biedermeier Writing Desk — FINAL (revised) v12 [approved] ($12,345,679)',
    btActivePath: 'ReactiveSelector(Root) > Sequence[Investigate_Secondary_Auditory_Anomaly_With_Long_Unbreakable_Identifier_9f8e7d6c5b4a] > Act:inspect_noise_origin (RUNNING)',
    feed: [
      {
        time: '2025-12-31T23:59:59.999-08:00 (just now)',
        arch: 'FSM · Petri Net · Benachrichtigungseinstellungen',
        isLoot: true,
        tag: 'customer-feedback-from-enterprise-onboarding-guard-predicate-v12',
        title: 'Stole Aleksandra Wiśniewska-Kowalczyk & Đặng Thị Ngọc Hân’s Masterpiece — FINAL (revised) v12 [approved].pdf',
        sub: 'from Paramètres de confidentialité et de sécurité (Room #1,284)',
        badge: '+$12,345,679',
        metaText: 'verified by bartholomew.fitzgerald@northwind-industries-holdings.example.com',
        quote: 'Line one of a multi-paragraph heist thought with stacked Vietnamese diacritics (Đặng Thị Ngọc Hân), CJK (王秀英), RTL (نور الهدى عبد الرحمن), and ZWJ emoji (👩🏽‍💻 Priya 🦊 Fox) that keeps going to test clamping and quote wrapping inside the riso card.',
        note: 'https://example.com/workspaces/dither-house/heist/9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f?tab=telemetry&filter=unresolved_invariants',
      },
      {
        time: '1970-01-01T00:00:00Z',
        arch: 'Jo',
        isLoot: false,
        tag: 'a',
        title: 'J',
        sub: '',
        badge: '$0',
        metaText: '',
        quote: '',
        note: '',
      },
      {
        time: 'In 3 days',
        arch: 'Reactive BT',
        isLoot: false,
        tag: '<script>alert("xss")</script> &amp; **bold**',
        title: 'PATROL → CHASE <img src=x onerror=alert(1)>',
        sub: '(p_chase = 1)',
        badge: '100%',
        metaText: 'dist = 0.3 tiles · alert = 100%',
        quote: 'Testing HTML escaping in title, tag, and badge fields.',
        note: 'IMG_20250914_183022_HDR_portrait_edited_edited_unbreakable_filename.HEIC',
      },
    ],
  },
  empty: {
    botName: '   ',
    state: 'idle',
    archLabel: 'FSM',
    src: 'idle',
    dst: 'idle',
    guardRule: 'none',
    alert: 0,
    stolenValue: 0,
    quota: 0,
    hp: 0,
    dist: 0,
    firings: 0,
    lootCountText: '0 / 0',
    nearestLootText: 'nearest: none',
    promptText: '',
    btActivePath: '',
    feed: [],
  },
  one: {
    botName: 'J',
    state: 'patrol',
    archLabel: 'FSM',
    src: 'idle',
    dst: 'patrol',
    guardRule: 'route_assigned',
    alert: 0.01,
    stolenValue: 1,
    quota: 1,
    hp: 1,
    dist: 1.0,
    firings: 1,
    lootCountText: '1 / 1',
    nearestLootText: 'nearest: 1 item ($1)',
    promptText: 'Steal 1 item ($1)',
    btActivePath: '1 active token in p_patrol',
    feed: [
      {
        time: '1 min ago',
        arch: '1 controller',
        isLoot: true,
        tag: '1 switch',
        title: 'Stole 1 item',
        sub: 'from 1 room',
        badge: '+$1',
        metaText: '1 loot stolen · 1 switch recorded',
        quote: 'Testing singular pluralization ("1 switch", "1 item", "$1").',
        note: '1 of 1 item collected.',
      },
    ],
  },
  huge: (() => {
    const rows = [];
    for (let i = 1000; i >= 1; i--) {
      rows.push({
        time: `Tick ${nfInt.format(i * 12)}`,
        arch: i % 2 === 0 ? 'FSM · Petri Net' : 'Reactive BT',
        isLoot: i % 5 === 0,
        tag: i % 5 === 0 ? 'noise 3.4t' : 'player_visible',
        title: i % 5 === 0 ? `Stole Valuation Lot #${nfInt.format(i)}` : `PATROL → CHASE (#${nfInt.format(i)})`,
        sub: `(p_chase = 1 · row ${nfInt.format(i)} of 1,000)`,
        badge: i % 5 === 0 ? `+$${nfInt.format(i * 15)}` : 'chase',
        metaText: `Paginated stress row ${nfInt.format(i)} of 1,000`,
        quote: `Guard evaluated transition rule #${nfInt.format(i)} in 0.02ms.`,
        note: `Petri marking invariant I3 held across ${nfInt.format(i)} transitions.`,
      });
    }
    return {
      botName: 'Dither',
      state: 'chase',
      archLabel: 'FSM · 1,000 rows',
      src: 'patrol',
      dst: 'chase',
      guardRule: 'player_visible',
      alert: 0.88,
      stolenValue: 4850,
      quota: 5000,
      hp: 75,
      dist: 2.4,
      firings: 1000,
      lootCountText: '8 / 10',
      nearestLootText: 'nearest: Mac Studio ($2,499)',
      promptText: '',
      btActivePath: 'Petri marking: p_chase = 1 (1,000 log entries)',
      feed: rows,
    };
  })(),
};

const ESCAPE_DOOR = { I: 1.2, J: 6.8, room: 'r1' };

// ============================================================================
// SINGLE-SOURCE 7-STATE FSM_TABLE & PETRI NET RULES
// ============================================================================
const FSM_TABLE = [
  { src: 'idle',        dst: 'chase',       guard: 'player_visible' },
  { src: 'idle',        dst: 'investigate', guard: 'heard_sound' },
  { src: 'idle',        dst: 'patrol',      guard: 'route_assigned' },
  { src: 'patrol',      dst: 'chase',       guard: 'player_visible' },
  { src: 'patrol',      dst: 'investigate', guard: 'heard_sound' },
  { src: 'investigate', dst: 'chase',       guard: 'player_visible' },
  { src: 'investigate', dst: 'search',      guard: 'arrived_and_quiet' },
  { src: 'chase',       dst: 'attack',      guard: 'in_attack_range' },
  { src: 'chase',       dst: 'search',      guard: 'lost_sight_long' },
  { src: 'attack',      dst: 'chase',       guard: 'out_of_range' },
  { src: 'attack',      dst: 'search',      guard: 'lost_sight_long' },
  { src: 'search',      dst: 'chase',       guard: 'player_visible' },
  { src: 'search',      dst: 'investigate', guard: 'heard_sound' },
  { src: 'search',      dst: 'return',      guard: 'search_expired' },
  { src: 'return',      dst: 'chase',       guard: 'player_visible' },
  { src: 'return',      dst: 'investigate', guard: 'heard_sound' },
  { src: 'return',      dst: 'patrol',      guard: 'at_route_start' },
];

const STATE_INK = {
  idle: 'blue',
  patrol: 'teal',
  investigate: 'sun',
  chase: 'coral',
  attack: 'coral',
  search: 'sun',
  return: 'teal',
};

const STATE_CSS = {
  idle: '#56628a',
  patrol: '#008c8a',
  investigate: '#ffd428',
  chase: '#ee6852',
  attack: '#a8402d',
  search: '#ee6852',
  return: '#008c8a',
};

const PATROL_WAYPOINTS = [
  [13.5, 4.5],  // r2: living room
  [13.5, 13.5], // r4: office
  [4.5, 13.5],  // r3: kitchen
  [5.5, 4.5],   // r1: studio
  [21.5, 21.5], // r9: music room
];

const N = W.ROOM;
const guard = { I: 13.5, J: 4.5, angle: 1.5, face: 'sw', act: 'roll', u: 0, mood: '', roll: 0 };
const thief = {
  I: 2.2,
  J: 6.5,
  targetI: null,
  targetJ: null,
  pendingStealId: null,
  face: 'se',
  act: 'idle',
  roll: 0,
  carry: false,
  hp: 100,
  stolenValue: 0,
  stolenIds: new Set(),
  autoPlay: false,
  outcome: null,
};

const keysDown = new Set();

const ai = {
  arch: 'FSM',
  state: 'patrol',
  alert: 0.12,
  firings: 0,
  wpIndex: 0,
  lastSeenPos: null,
  lastTransition: { src: 'idle', dst: 'patrol', guard: 'route_assigned', tick: 1 },
  btActivePath: 'Petri marking: p_patrol = 1 (∑ tokens = 1)',
  percepts: {
    tick: 0,
    player_visible: false,
    player_dist: 11.4,
    player_angle: 0.0,
    heard_sound: false,
    arrived_at_target: false,
    at_route_start: false,
    lost_sight_ticks: 0,
    search_ticks: 0,
  },
  soundWave: null,
  feedLog: [],
};

// ---------------- House geometry & sprite caching ----------------
function index() {
  const keep = new Map(rooms);
  rooms.clear();
  shownHouse = { rooms: house.rooms };
  cellMap = S.cells(shownHouse);
  blocked = null;
  for (const rm of house.rooms) {
    const [ox, oy] = W.roomOrigin(rm.at), items = S.itemsIn(house, rm.id).filter((it) => kindOf(it));
    const old = keep.get(rm.id), ver = JSON.stringify(rm) + JSON.stringify(S.edgesOf(shownHouse, rm)) + items.filter((it) => S.layerOf(kindOf(it)) !== 'stand').map((it) => it.id + JSON.stringify(it.at) + (hidden.has(it.id) ? 'h' : '') + (images[it.image] ? 'i' : '')).join('|');
    rooms.set(rm.id, { rm, ox, oy, b: W.roomBounds(rm), items, base: old && old.ver === ver ? old.base : null, ver });
  }
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
  const cv = HS.env.makeCanvas(Math.max(1, Math.ceil(w * ratio)), Math.max(1, Math.ceil(h * ratio))), c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.setTransform(ratio, 0, 0, ratio, -x0 * ratio, -y0 * ratio);
  draw(c);
  return cv;
}
function baseOf(R) {
  const ratio = ratioNow();
  if (!R.base || R.base.ratio !== ratio) {
    const b = R.b, skip = (it) => hidden.has(it.id) || appearing.has(it.id);
    R.base = { ratio, cv: printed(b.x1 - b.x0, b.y1 - b.y0, ratio, b.x0, b.y0, (c) => S.drawBase(P.mkHand(c, { seed: 1 }), shownHouse, R.rm, R.items, kinds, images, { skip })) };
  }
  return R.base;
}
function spriteOf(it) {
  const ratio = ratioNow(), key = ratio + JSON.stringify(it.at) + (images[it.image] ? 'i' : ''), have = sprites.get(it.id);
  if (have && have.key === key) return have;
  const k = kindOf(it), bx = K.screenBox(k, it);
  const s = { ratio, key, x0: bx.x0, y0: bx.y0, w: bx.x1 - bx.x0, h: bx.y1 - bx.y0, hi: null };
  s.cv = printed(s.w, s.h, ratio, bx.x0, bx.y0, (c) => K.drawThing(P.mkHand(c, { seed: 1 }), P.streamOf('item', it.id), k, it, images));
  sprites.set(it.id, s);
  return s;
}
function hiOf(s) {
  if (s.hi) return s.hi;
  const cv = HS.env.makeCanvas(s.cv.width, s.cv.height), c = cv.getContext('2d');
  c.drawImage(s.cv, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = '#ffd428';
  c.fillRect(0, 0, cv.width, cv.height);
  return (s.hi = cv);
}

// ---------------- Camera & coordinates ----------------
const zr = () => cam.z * dpr;
const devX = (wx) => (wx - cam.x) * zr() + stage.width / 2;
const devY = (wy) => (wy - cam.y) * zr() + stage.height / 2;
const toWorld = (px, py) => [(px * dpr - stage.width / 2) / zr() + cam.x, (py * dpr - stage.height / 2) / zr() + cam.y];

function worldToTile(wx, wy) {
  const i = (wx / 32 + wy / 16) / 2;
  const j = (wy / 16 - wx / 32) / 2;
  return [i, j];
}

function worldBounds() {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const R of rooms.values()) {
    x0 = Math.min(x0, R.ox + R.b.x0);
    y0 = Math.min(y0, R.oy + R.b.y0);
    x1 = Math.max(x1, R.ox + R.b.x1);
    y1 = Math.max(y1, R.oy + R.b.y1);
  }
  return { x0, y0, x1, y1 };
}
function fitTo(b, animate) {
  const pad = vw < 600 ? 14 : 40;
  const fits = (z) => (b.x1 - b.x0) * z <= vw - pad * 2 && (b.y1 - b.y0) * z <= vh - pad * 2 - (vw < 600 ? 40 : 30);
  let k = 0;
  for (let n = 0; n < ZOOMS.length - 3; n++) if (fits(ZOOMS[n])) k = n;
  fitZi = k;
  moveTo({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 + 8, zi: k }, animate);
}
const atFit = () => zi <= fitZi;
function touchMode() { stage.style.touchAction = COARSE && atFit() ? 'pan-y' : 'none'; }
function moveTo(to, animate) {
  if (to.zi !== undefined && to.zi !== zi) { zi = to.zi; cam.z = ZOOMS[zi]; forgetOtherSizes(); }
  touchMode();
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
  zi = n;
  cam.z = ZOOMS[n];
  tween = null;
  userCam = true;
  cam.x = wx - (wx - cam.x) * z0 / cam.z;
  cam.y = wy - (wy - cam.y) * z0 / cam.z;
  forgetOtherSizes();
  touchMode();
}
function roomInView(R) {
  const w = stage.width / zr() / 2, h = stage.height / zr() / 2;
  return R.ox + R.b.x1 > cam.x - w && R.ox + R.b.x0 < cam.x + w && R.oy + R.b.y1 > cam.y - h && R.oy + R.b.y0 < cam.y + h;
}
function resize() {
  const r = view.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
  vw = r.width || window.innerWidth;
  vh = r.height || window.innerHeight;
  stage.width = Math.round(vw * d);
  stage.height = Math.round(vh * d);
  if (d !== dpr) { dpr = d; sprites.clear(); for (const R of rooms.values()) R.base = null; }
  if (!userCam && house) fitTo(worldBounds(), false);
}

// ---------------- Helpers for Loot & Rooms ----------------
const roomAt = (I, J) => cellMap.get(S.key(Math.floor(I / N), Math.floor(J / N)));
const botRoom = (I, J) => { const rm = roomAt(I, J); return rm && rooms.get(rm.id); };
const global = (rm, i, j) => [rm.at[0] * N + i, rm.at[1] * N + j];
const faceTo = (di, dj) => Math.abs(di) > Math.abs(dj) ? (di > 0 ? 'se' : 'nw') : (dj > 0 ? 'sw' : 'ne');

function itemTilePos(it) {
  const k = kindOf(it);
  if (!k) return [4.5, 4.5];
  const [w, d] = it.size || k.size || [1, 1], a = it.at, rm = house.rooms.find((r) => r.id === it.room);
  if (!rm) return [4.5, 4.5];
  const li = a.i + (a.face === 'ne' || a.face === 'sw' ? w / 2 : d / 2);
  const lj = a.j + (a.face === 'ne' || a.face === 'sw' ? d / 2 : w / 2);
  return global(rm, Math.min(8.2, Math.max(0.8, li)), Math.min(8.2, Math.max(0.8, lj)));
}

function nearestStealableLoot(fromI = thief.I, fromJ = thief.J) {
  let best = null, bestDist = Infinity;
  for (const [id, meta] of LOOT_TARGETS.entries()) {
    if (thief.stolenIds.has(id)) continue;
    const it = house.items.find((x) => x.id === id);
    if (!it) continue;
    const [ti, tj] = itemTilePos(it);
    const d = Math.hypot(ti - fromI, tj - fromJ);
    if (d < bestDist) {
      bestDist = d;
      best = { id, it, meta, ti, tj, dist: d };
    }
  }
  return best;
}

function emitSound(I, J, maxR, label) {
  ai.soundWave = { I, J, r: 0.25, maxR: maxR || 5.5, age: 0, label: label || 'noise' };
}

function pushFeedCard(entry) {
  ai.feedLog.unshift(entry);
  if (ai.feedLog.length > 50) ai.feedLog.pop();
  if (breakDataMode === 'demo') renderFeed();
}

function stealItem(lootObj) {
  if (!lootObj || thief.stolenIds.has(lootObj.id) || thief.outcome) return;
  thief.stolenIds.add(lootObj.id);
  thief.stolenValue += lootObj.meta.value;
  thief.carry = true;
  thief.act = 'lift';
  setTimeout(() => { if (!thief.outcome) thief.act = 'idle'; }, 420);

  hidden.add(lootObj.id);
  const rm = rooms.get(lootObj.it.room);
  if (rm) rm.base = null;

  emitSound(lootObj.ti, lootObj.tj, lootObj.meta.noise + 2.2, `stole ${lootObj.meta.label}`);

  const bal = $('#state-balance');
  if (bal) {
    bal.classList.add('is-up');
    setTimeout(() => bal.classList.remove('is-up'), 1100);
  }

  pushFeedCard({
    time: `Tick ${nfInt.format(ai.percepts.tick)}`,
    arch: 'THIEF ACTION',
    isLoot: true,
    tag: `noise ${nfOne.format(lootObj.meta.noise)}t`,
    title: `Stole ${lootObj.meta.label}`,
    sub: `from ${lootObj.meta.roomName}`,
    badge: `+${money(lootObj.meta.value)}`,
    metaText: `Haul now ${money(thief.stolenValue)} of ${money(HEIST_QUOTA)} quota`,
    quote: thief.stolenValue >= HEIST_QUOTA
      ? 'Quota reached! Head to the Front Door in the first room (top-left) to escape!'
      : `Bagged ${lootObj.meta.label}. Watch out — the theft sound wave travels ${nfOne.format(lootObj.meta.noise + 2.2)} tiles.`,
    note: `${thief.stolenIds.size} of ${LOOT_TARGETS.size} target valuables stolen.`,
  });
}

function triggerCoinDistraction(I, J) {
  if (thief.outcome) return;
  const coinI = I ?? Math.min(25, Math.max(1.5, thief.I + (Math.cos(guard.angle + 1.5) * 4.2)));
  const coinJ = J ?? Math.min(25, Math.max(1.5, thief.J + (Math.sin(guard.angle + 1.5) * 4.2)));
  emitSound(coinI, coinJ, 7.2, 'coin toss');
  pushFeedCard({
    time: `Tick ${nfInt.format(ai.percepts.tick)}`,
    arch: 'THIEF GADGET',
    isLoot: true,
    tag: 'heard_sound',
    title: 'Tossed Decoy Coin',
    sub: `at tile (${nfOne.format(coinI)}, ${nfOne.format(coinJ)})`,
    badge: 'DECOY',
    metaText: '7.2-tile acoustic ring emitted to lure the Guard AI',
    quote: 'If the Guard hears the ring, guard predicate heard_sound fires Patrol → Investigate.',
    note: 'Use the distraction to slip behind the Guard’s FOV cone.',
  });
}

function showOutcomeBanner(kind) {
  thief.outcome = kind;
  const banner = $('#heist-banner');
  banner.hidden = false;
  if (kind === 'busted') {
    $('#banner-kicker').textContent = `CAUGHT BY GUARD (${ai.arch})`;
    $('#banner-title').textContent = 'Busted! The Guard Tackled You.';
    $('#banner-sub').textContent = `You had ${money(thief.stolenValue)} in your sack, but the Guard transitioned Chase → Attack at < 1.35 tiles.`;
  } else {
    $('#banner-kicker').textContent = 'HEIST COMPLETE · CLEAN GETAWAY';
    $('#banner-title').textContent = `Escaped with ${money(thief.stolenValue)}!`;
    $('#banner-sub').textContent = `You outsmarted the ${ai.arch === 'FSM' ? '7-State FSM / Petri Net' : 'Reactive Behavior Tree'} Guard and slipped out the front door.`;
  }
}

function resetHeist() {
  thief.I = 2.2;
  thief.J = 6.5;
  thief.targetI = null;
  thief.targetJ = null;
  thief.pendingStealId = null;
  thief.carry = false;
  thief.hp = 100;
  thief.stolenValue = 0;
  thief.stolenIds.clear();
  thief.outcome = null;
  $('#heist-banner').hidden = true;

  hidden.clear();
  for (const R of rooms.values()) R.base = null;

  guard.I = 13.5;
  guard.J = 4.5;
  guard.angle = 1.5;
  ai.state = 'patrol';
  ai.alert = 0.12;
  ai.firings = 0;
  ai.wpIndex = 0;
  ai.lastSeenPos = null;
  ai.soundWave = null;
  ai.lastTransition = { src: 'idle', dst: 'patrol', guard: 'route_assigned', tick: ai.percepts.tick };

  ai.feedLog = [
    {
      time: 'Heist started',
      arch: ai.arch === 'FSM' ? 'FSM · Petri Net' : 'Reactive BT',
      isLoot: false,
      tag: 'route_assigned',
      title: 'IDLE → PATROL',
      sub: '(p_patrol = 1)',
      badge: 'patrol',
      metaText: 'Guard initialized on 5-room patrol circuit',
      quote: 'Steal $5,000 in gold-highlighted valuables and return to the Front Door in the first room.',
      note: 'TLA+ invariants I1–I5 verified · player_pos redacted when outside FOV.',
    },
  ];
  renderFeed();
  updateDomOverlays();
}

// ---------------- Guard AI Evaluation (FSM_TABLE vs ReactiveSelector BT) ----------------
function hasLineOfSight(gI, gJ, tI, tJ) {
  const rG = roomAt(gI, gJ), rT = roomAt(tI, tJ);
  if (!rG || !rT) return false;
  if (rG.id === rT.id) return true;
  const localGI = gI % N, localGJ = gJ % N;
  const localTI = tI % N, localTJ = tJ % N;
  const nearDoorI = (localGI > 2.6 && localGI < 6.4) && (localTI > 2.6 && localTI < 6.4);
  const nearDoorJ = (localGJ > 2.6 && localGJ < 6.4) && (localTJ > 2.6 && localTJ < 6.4);
  return nearDoorI || nearDoorJ;
}

function evalGuardPredicate(name, p) {
  switch (name) {
    case 'route_assigned': return true;
    case 'player_visible': return p.player_visible;
    case 'heard_sound': return p.heard_sound;
    case 'arrived_and_quiet': return p.arrived_at_target && !p.player_visible;
    case 'in_attack_range': return p.player_visible && p.player_dist <= 1.38;
    case 'out_of_range': return p.player_visible && p.player_dist > 1.38;
    case 'lost_sight_long': return !p.player_visible && p.lost_sight_ticks >= 48;
    case 'search_expired': return !p.player_visible && p.search_ticks >= 95;
    case 'at_route_start': return p.at_route_start;
    default: return false;
  }
}

function recordTransition(src, dst, guardName) {
  if (src === dst) return;
  ai.state = dst;
  ai.firings += 1;
  ai.lastTransition = { src, dst, guard: guardName, tick: ai.percepts.tick };

  const quotes = {
    patrol: 'Token moved to p_patrol (∑ tokens = 1). Guard resuming house patrol circuit.',
    investigate: `Guard heard ${ai.soundWave ? ai.soundWave.label : 'a noise'}! Moving to inspect sound origin.`,
    chase: 'INTRUDER SPOTTED in FOV cone! Guard preempted patrol to chase the Thief!',
    attack: 'Guard closed within 1.35 tiles — tackling the Thief!',
    search: 'Thief broke line of sight! Guard scanning last known coordinates.',
    return: 'Search timer expired with no visual contact; returning to patrol route.',
  };

  pushFeedCard({
    time: `Tick ${nfInt.format(ai.percepts.tick)}`,
    arch: ai.arch === 'FSM' ? 'FSM · Petri Net' : 'Reactive BT',
    isLoot: false,
    tag: guardName,
    title: `${src.toUpperCase()} → ${dst.toUpperCase()}`,
    sub: `(p_${dst} = 1)`,
    badge: dst,
    metaText: `Triggered by guard predicate ${guardName}`,
    quote: quotes[dst] || `Transitioned ${src} → ${dst}.`,
    note: `Guard dist=${nfOne.format(ai.percepts.player_dist)}t · visible=${ai.percepts.player_visible} · alert=${Math.round(ai.alert * 100)}%`,
  });
}

function stepSimulation(dt) {
  if (thief.outcome) return;
  ai.percepts.tick += 1;
  const tick = ai.percepts.tick;

  let moveDi = 0, moveDj = 0;
  if (keysDown.has('KeyW') || keysDown.has('ArrowUp'))    { moveDi -= 1; moveDj -= 1; }
  if (keysDown.has('KeyS') || keysDown.has('ArrowDown'))  { moveDi += 1; moveDj += 1; }
  if (keysDown.has('KeyA') || keysDown.has('ArrowLeft'))  { moveDi -= 1; moveDj += 1; }
  if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) { moveDi += 1; moveDj -= 1; }

  const sprinting = keysDown.has('ShiftLeft') || keysDown.has('ShiftRight');

  if (moveDi !== 0 || moveDj !== 0) {
    thief.targetI = null;
    thief.targetJ = null;
    const len = Math.hypot(moveDi, moveDj);
    const spd = SPEED * (sprinting ? 1.48 : 1.0) * dt;
    thief.I = Math.max(0.8, Math.min(26.2, thief.I + (moveDi / len) * spd));
    thief.J = Math.max(0.8, Math.min(26.2, thief.J + (moveDj / len) * spd));
    thief.roll += spd;
    thief.face = faceTo(moveDi, moveDj);
    thief.act = 'roll';
    if (sprinting && tick % 28 === 0) {
      emitSound(thief.I, thief.J, 4.5, 'sprint footsteps');
    }
  } else if (thief.autoPlay) {
    let goalI = ESCAPE_DOOR.I, goalJ = ESCAPE_DOOR.J;
    const nextLoot = nearestStealableLoot();
    if (thief.stolenValue < HEIST_QUOTA && nextLoot) {
      goalI = nextLoot.ti;
      goalJ = nextLoot.tj;
      if (nextLoot.dist < 1.35) stealItem(nextLoot);
    }
    const gdx = thief.I - guard.I, gdy = thief.J - guard.J, gd = Math.hypot(gdx, gdy);
    if (gd < 3.4) {
      goalI = Math.max(1.2, Math.min(25.5, thief.I + (gdx / (gd || 1)) * 3.0));
      goalJ = Math.max(1.2, Math.min(25.5, thief.J + (gdy / (gd || 1)) * 3.0));
    }
    const tdi = goalI - thief.I, tdj = goalJ - thief.J, tdist = Math.hypot(tdi, tdj);
    if (tdist > 0.1) {
      const step = Math.min(tdist, SPEED * 1.05 * dt);
      thief.I += (tdi / tdist) * step;
      thief.J += (tdj / tdist) * step;
      thief.roll += step;
      thief.face = faceTo(tdi, tdj);
      thief.act = 'roll';
    }
  } else if (thief.targetI !== null && thief.targetJ !== null) {
    const tdi = thief.targetI - thief.I, tdj = thief.targetJ - thief.J, tdist = Math.hypot(tdi, tdj);
    if (tdist > 0.08) {
      const step = Math.min(tdist, SPEED * 1.08 * dt);
      thief.I += (tdi / tdist) * step;
      thief.J += (tdj / tdist) * step;
      thief.roll += step;
      thief.face = faceTo(tdi, tdj);
      thief.act = 'roll';
    } else {
      thief.targetI = null;
      thief.targetJ = null;
      thief.act = 'idle';
      if (thief.pendingStealId) {
        const near = nearestStealableLoot();
        if (near && near.id === thief.pendingStealId && near.dist <= 2.2) {
          stealItem(near);
        }
        thief.pendingStealId = null;
      }
    }
  } else {
    thief.act = 'idle';
  }

  if (thief.stolenValue >= HEIST_QUOTA && Math.hypot(thief.I - ESCAPE_DOOR.I, thief.J - ESCAPE_DOOR.J) <= 1.5) {
    showOutcomeBanner('escaped');
    return;
  }

  let heardSound = false;
  if (ai.soundWave) {
    ai.soundWave.r += dt * 5.2;
    ai.soundWave.age += 1;
    const distGuardToSound = Math.hypot(guard.I - ai.soundWave.I, guard.J - ai.soundWave.J);
    if (distGuardToSound <= ai.soundWave.maxR + 2.5 && ai.soundWave.age <= 42) {
      heardSound = true;
      ai.lastSeenPos = { I: ai.soundWave.I, J: ai.soundWave.J };
    }
    if (ai.soundWave.r > ai.soundWave.maxR) ai.soundWave = null;
  }

  const dx = thief.I - guard.I, dy = thief.J - guard.J;
  const distToPlayer = Math.hypot(dx, dy);
  let relAngle = Math.atan2(dy, dx) - guard.angle;
  while (relAngle > Math.PI) relAngle -= Math.PI * 2;
  while (relAngle < -Math.PI) relAngle += Math.PI * 2;

  const inCone = distToPlayer <= 5.4 && Math.abs(relAngle) <= 0.60;
  const closeProximity = distToPlayer <= 1.25;
  const visible = (inCone || closeProximity) && hasLineOfSight(guard.I, guard.J, thief.I, thief.J);

  ai.percepts.player_visible = visible;
  ai.percepts.player_dist = distToPlayer;
  ai.percepts.player_angle = relAngle;
  ai.percepts.heard_sound = heardSound;

  if (visible) {
    ai.lastSeenPos = { I: thief.I, J: thief.J };
    ai.percepts.lost_sight_ticks = 0;
    ai.percepts.search_ticks = 0;
    ai.alert = Math.min(1, ai.alert + dt * 0.75);
  } else {
    ai.percepts.lost_sight_ticks += 1;
    if (ai.state === 'search') ai.percepts.search_ticks += 1;
    ai.alert = heardSound ? Math.max(ai.alert, 0.52) : Math.max(0.10, ai.alert - dt * 0.14);
  }

  if (ai.arch === 'FSM') {
    for (const rule of FSM_TABLE) {
      if (rule.src === ai.state && evalGuardPredicate(rule.guard, ai.percepts)) {
        recordTransition(ai.state, rule.dst, rule.guard);
        break;
      }
    }
    ai.btActivePath = `Petri marking: p_${ai.state} = 1 (∑ tokens = 1 · mutex)`;
  } else {
    let nextState = ai.state, guardUsed = 'bt_tick';
    if (visible && distToPlayer <= 1.38) {
      nextState = 'attack'; guardUsed = 'in_attack_range';
      ai.btActivePath = 'ReactiveSelector > Sequence[Attack] > Act:tackle (RUNNING)';
    } else if (visible) {
      nextState = 'chase'; guardUsed = 'player_visible';
      ai.btActivePath = 'ReactiveSelector > Sequence[Chase] > Act:pursue (RUNNING)';
    } else if (heardSound) {
      nextState = 'investigate'; guardUsed = 'heard_sound';
      ai.btActivePath = 'ReactiveSelector > Sequence[Investigate] > Act:inspect_noise (RUNNING)';
    } else if ((ai.state === 'chase' || ai.state === 'attack') && ai.percepts.lost_sight_ticks >= 38) {
      nextState = 'search'; guardUsed = 'lost_sight_long';
      ai.btActivePath = 'ReactiveSelector > Sequence[Search] > Act:scan_area (RUNNING)';
    } else if (ai.state === 'search' && ai.percepts.search_ticks >= 85) {
      nextState = 'patrol'; guardUsed = 'search_expired';
      ai.btActivePath = 'ReactiveSelector > Act:patrol (RUNNING)';
    } else if (ai.state !== 'search' && ai.state !== 'investigate') {
      nextState = 'patrol'; guardUsed = 'route_assigned';
      ai.btActivePath = 'ReactiveSelector > Act:patrol (RUNNING)';
    }
    if (nextState !== ai.state) recordTransition(ai.state, nextState, guardUsed);
  }

  let goalI = guard.I, goalJ = guard.J, speedMul = 0.82;
  if (ai.state === 'patrol') {
    const wp = PATROL_WAYPOINTS[ai.wpIndex];
    goalI = wp[0]; goalJ = wp[1];
    if (Math.hypot(goalI - guard.I, goalJ - guard.J) < 0.65) {
      ai.wpIndex = (ai.wpIndex + 1) % PATROL_WAYPOINTS.length;
    }
    guard.mood = '';
    guard.act = 'roll';
  } else if (ai.state === 'investigate') {
    const target = ai.lastSeenPos || { I: 6.5, J: 11.5 };
    goalI = target.I; goalJ = target.J;
    speedMul = 1.05;
    guard.mood = 'think';
    guard.act = 'roll';
    if (Math.hypot(goalI - guard.I, goalJ - guard.J) < 0.8) {
      ai.percepts.arrived_at_target = true;
    } else {
      ai.percepts.arrived_at_target = false;
    }
  } else if (ai.state === 'chase') {
    const target = visible ? thief : (ai.lastSeenPos || thief);
    goalI = target.I; goalJ = target.J;
    speedMul = 1.24;
    guard.mood = '';
    guard.act = 'roll';
    thief.hp = Math.min(100, thief.hp + dt * 4);
  } else if (ai.state === 'attack') {
    guard.angle = Math.atan2(thief.J - guard.J, thief.I - guard.I);
    guard.face = faceTo(thief.I - guard.I, thief.J - guard.J);
    guard.act = 'cheer';
    guard.mood = 'happy';
    thief.hp = Math.max(0, thief.hp - dt * 58);
    if (thief.hp <= 0) {
      showOutcomeBanner('busted');
    }
    return;
  } else if (ai.state === 'search') {
    guard.angle += dt * 2.5;
    guard.face = faceTo(Math.cos(guard.angle), Math.sin(guard.angle));
    guard.act = 'think';
    guard.mood = 'think';
    return;
  } else if (ai.state === 'return') {
    const wp = PATROL_WAYPOINTS[0];
    goalI = wp[0]; goalJ = wp[1];
    ai.percepts.at_route_start = Math.hypot(goalI - guard.I, goalJ - guard.J) < 0.85;
    guard.mood = '';
    guard.act = 'roll';
  }

  const gdi = goalI - guard.I, gdj = goalJ - guard.J, gdist = Math.hypot(gdi, gdj);
  if (gdist > 0.08) {
    const step = Math.min(gdist, SPEED * speedMul * dt);
    guard.I += (gdi / gdist) * step;
    guard.J += (gdj / gdist) * step;
    guard.roll += step;
    guard.angle = Math.atan2(gdj, gdi);
    guard.face = faceTo(gdi, gdj);
  }
}

// ---------------- Riso-print Rendering ----------------
function blit(src, ratio, wx, wy) {
  const cv = src.cv || src, w = src.w || cv.width, h = src.h || cv.height, k = zr() / ratio;
  ctx.imageSmoothingEnabled = k < 0.999;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cv, 0, 0, w, h, Math.round(devX(wx)), Math.round(devY(wy)), Math.round(w * k), Math.round(h * k));
  ctx.imageSmoothingEnabled = false;
}

function drawHeistOverlaysOnFloor() {
  const H = P.mkHand(ctx, { seed: 3 });

  const ex = ESCAPE_DOOR.I, ey = ESCAPE_DOOR.J;
  const escPoly = [
    [devX(P.isoX(ex - 0.8, ey - 0.8)), devY(P.isoY(ex - 0.8, ey - 0.8, 0.02))],
    [devX(P.isoX(ex + 0.8, ey - 0.8)), devY(P.isoY(ex + 0.8, ey - 0.8, 0.02))],
    [devX(P.isoX(ex + 0.8, ey + 0.8)), devY(P.isoY(ex + 0.8, ey + 0.8, 0.02))],
    [devX(P.isoX(ex - 0.8, ey + 0.8)), devY(P.isoY(ex - 0.8, ey + 0.8, 0.02))],
  ];
  const quotaReady = thief.stolenValue >= HEIST_QUOTA;
  H.tint(escPoly, quotaReady ? 'teal' : 'sun', quotaReady ? 0.45 : 0.22);
  H.outline(H.RB, escPoly, quotaReady ? 'teal' : 'blue', 1.6 * dpr, { dash: [5 * dpr, 4 * dpr], amp: 0.05 });

  const ink = STATE_INK[ai.state] || 'teal';
  const fovLen = 5.2, half = 0.60, steps = 14;
  const pts = [[devX(P.isoX(guard.I, guard.J)), devY(P.isoY(guard.I, guard.J, 0.02))]];
  for (let s = 0; s <= steps; s++) {
    const a = guard.angle - half + (s / steps) * (half * 2);
    const ti = guard.I + Math.cos(a) * fovLen;
    const tj = guard.J + Math.sin(a) * fovLen;
    pts.push([devX(P.isoX(ti, tj)), devY(P.isoY(ti, tj, 0.02))]);
  }
  H.tint(pts, ink, ai.state === 'attack' || ai.state === 'chase' ? 0.50 : 0.28);
  H.outline(H.RB, pts, ink, 1.5 * dpr, { tone: 0.9, amp: 0.08 });

  if (ai.lastSeenPos && (ai.state === 'investigate' || ai.state === 'search')) {
    const lx = devX(P.isoX(ai.lastSeenPos.I, ai.lastSeenPos.J));
    const ly = devY(P.isoY(ai.lastSeenPos.I, ai.lastSeenPos.J, 0.04));
    const ghost = P.ell(lx, ly, 18 * dpr, 10 * dpr, 20);
    H.outline(H.RB, ghost, 'coral', 1.6 * dpr, { dash: [4 * dpr, 4 * dpr], amp: 0 });
  }

  if (ai.soundWave) {
    const ringPts = [];
    for (let s = 0; s < 24; s++) {
      const a = (s / 24) * Math.PI * 2;
      const ti = ai.soundWave.I + Math.cos(a) * ai.soundWave.r;
      const tj = ai.soundWave.J + Math.sin(a) * ai.soundWave.r;
      ringPts.push([devX(P.isoX(ti, tj)), devY(P.isoY(ti, tj, 0.05))]);
    }
    H.outline(H.RB, ringPts, 'coral', 2.2 * dpr, { tone: 1, dash: [5 * dpr, 4 * dpr], amp: 0.1 });
  }
}

function drawBotCharacter(R, entity, t, isThief) {
  const [gx, gy] = P.iso(entity.I - R.rm.at[0] * N, entity.J - R.rm.at[1] * N, 0);
  ctx.save();
  const scale = zr() * B.SCALE * (isThief ? 0.95 : 1.08);
  ctx.setTransform(scale, 0, 0, scale, Math.round(devX(R.ox + gx)), Math.round(devY(R.oy + gy)));
  const H = P.mkHand(ctx, { fine: true, seed: isThief ? 9 : 5 });

  B.drawBot(H, null, {
    t,
    face: entity.face || 'se',
    act: entity.act || 'idle',
    u: entity.u || 0,
    mood: entity.mood || '',
    roll: entity.roll || 0,
    carry: isThief ? entity.carry : false,
  });

  if (isThief) {
    const band = P.roundRect(-14, -22, 14, -15, 3, 4);
    H.fill(band, 'teal', 0.92, { fine: true });
    H.outline(H.RB, band, 'black', 0.9, { tone: 1, amp: 0, fine: true });
    H.line(H.RB, [[-13, -19], [-20, -23], [-18, -16]], 'teal', 2.2, { tone: 1, amp: 0, fine: true });
  } else {
    const capCrown = P.ell(0, -32, 12, 5.5, 20);
    const capVisor = P.ell(entity.face === 'sw' || entity.face === 'nw' ? -5 : 5, -29, 10, 3.2, 16);
    H.fill(capVisor, 'black', 1, { fine: true });
    H.fill(capCrown, 'blue', 0.95, { fine: true });
    H.outline(H.RB, capCrown, 'black', 1.0, { tone: 1, amp: 0, fine: true });
    H.fill(P.circ(0, -32, 2.8, 10), 'sun', 1, { fine: true });
  }
  ctx.restore();
}

function updateDomOverlays() {
  const gwx = P.isoX(guard.I, guard.J);
  const gwy = P.isoY(guard.I, guard.J, 1.45);
  const tether = $('#glance-tether');
  if (tether) {
    tether.style.left = `${Math.round(devX(gwx) / dpr)}px`;
    tether.style.top = `${Math.round(devY(gwy) / dpr)}px`;
  }

  const twx = P.isoX(thief.I, thief.J);
  const twy = P.isoY(thief.I, thief.J, 1.35);
  const promptEl = $('#thief-prompt');

  // If @break-ui fixture mode is active, render fixture data through the same formatting & clamping boundaries
  if (breakDataMode !== 'demo' && BREAK_UI_FIXTURES[breakDataMode]) {
    const fx = BREAK_UI_FIXTURES[breakDataMode];
    const cleanBotName = String(fx.botName ?? '').trim() || 'Dither';
    const clampedAlertPct = Math.round(clampNum(fx.alert * 100, 0, 100));
    const clampedHp = Math.round(clampNum(fx.hp, 0, 100));
    const safeFirings = Math.max(0, Math.round(Number(fx.firings) || 0));
    const fullRulePair = `${fx.src} → ${fx.dst}`;

    $('#header-bot-name').textContent = cleanBotName;
    $('#glance-state-text').textContent = middleTruncate(fx.state.toUpperCase(), 20);
    $('#glance-state-text').title = fx.state;
    $('#glance-arch-text').textContent = middleTruncate(fx.archLabel, 14);
    $('#glance-arch-text').title = fx.archLabel;
    $('#glance-bar-fill').style.width = `${clampedAlertPct}%`;
    $('#glance-rule-srcdst').textContent = middleTruncate(fullRulePair, 22);
    $('#glance-rule-srcdst').title = fullRulePair;
    $('#glance-rule-guard').textContent = middleTruncate(fx.guardRule, 18);
    $('#glance-rule-guard').title = fx.guardRule;

    if (fx.promptText) {
      promptEl.hidden = false;
      promptEl.style.left = `${Math.round(devX(twx) / dpr)}px`;
      promptEl.style.top = `${Math.round(devY(twy) / dpr)}px`;
      $('#thief-prompt-text').textContent = fx.promptText;
    } else {
      promptEl.hidden = true;
    }

    $('#loot-total').textContent = money(fx.stolenValue);
    $('#loot-status').textContent = `stolen · quota ${money(fx.quota)}`;
    $('#panel-arch-badge').textContent = `Guard: ${middleTruncate(fx.state.toUpperCase(), 22)} (${middleTruncate(fx.archLabel, 18)})`;
    $('#panel-arch-badge').title = `Guard: ${fx.state} (${fx.archLabel})`;
    $('#p-dist').textContent = `${nfOne.format(clampNum(fx.dist, 0, 999))} tiles`;
    $('#p-los').textContent = clampedAlertPct > 50 ? 'SPOTTED!' : 'hidden';
    $('#p-hp').textContent = `${clampedHp}%`;

    const fullPlace = `p_${fx.state}`;
    $('#rate-place').textContent = fullPlace;
    $('#rate-place').title = fullPlace;
    $('#rate-loot-count').textContent = fx.lootCountText;
    $('#rate-nearest-loot').textContent = fx.nearestLootText;
    $('#rate-nearest-loot').title = fx.nearestLootText;
    $('#rate-fov').textContent = clampedAlertPct > 50 ? 'SPOTTED' : 'Hidden';
    $('#rate-firings').textContent = nfInt.format(safeFirings);
    $('#rate-firings-label').textContent = pluralEn.select(safeFirings) === 'one' ? 'switch' : 'switches';
    $('#rate-guard-last').textContent = `rule: ${fx.guardRule}`;
    $('#rate-guard-last').title = `rule: ${fx.guardRule}`;

    $('#alert-bar-fill').style.width = `${clampedAlertPct}%`;
    $('#alert-bar').setAttribute('aria-valuenow', String(clampedAlertPct));
    $('#alert-tier').textContent = fx.state;
    $('#alert-numbers').textContent = `${clampedAlertPct}% suspicion · quota ${money(fx.quota)}`;
    $('#bt-active-pill').textContent = fx.btActivePath || '';
    return;
  }

  // Normal live Demo Data mode
  $('#header-bot-name').textContent = 'Dither';
  $('#glance-state-text').textContent = ai.state.toUpperCase();
  $('#glance-state-text').title = ai.state;
  $('#glance-dot').style.background = STATE_CSS[ai.state] || '#008c8a';
  $('#glance-arch-text').textContent = ai.arch === 'FSM' ? 'FSM · Petri' : 'Reactive BT';
  const pct = Math.round(clampNum(ai.alert * 100, 0, 100));
  $('#glance-bar-fill').style.width = `${pct}%`;
  const trText = `${ai.lastTransition.src} → ${ai.lastTransition.dst}`;
  $('#glance-rule-srcdst').textContent = trText;
  $('#glance-rule-srcdst').title = trText;
  $('#glance-rule-guard').textContent = ai.lastTransition.guard;
  $('#glance-rule-guard').title = ai.lastTransition.guard;

  const nearLoot = nearestStealableLoot();
  const distToEscape = Math.hypot(thief.I - ESCAPE_DOOR.I, thief.J - ESCAPE_DOOR.J);

  if (thief.stolenValue >= HEIST_QUOTA && distToEscape <= 3.2) {
    promptEl.hidden = false;
    promptEl.style.left = `${Math.round(devX(twx) / dpr)}px`;
    promptEl.style.top = `${Math.round(devY(twy) / dpr)}px`;
    $('#thief-prompt-text').textContent = 'Step into Front Door to ESCAPE!';
  } else if (nearLoot && nearLoot.dist <= 2.15) {
    promptEl.hidden = false;
    promptEl.style.left = `${Math.round(devX(twx) / dpr)}px`;
    promptEl.style.top = `${Math.round(devY(twy) / dpr)}px`;
    $('#thief-prompt-text').textContent = `Steal ${nearLoot.meta.label} (${money(nearLoot.meta.value)})`;
  } else {
    promptEl.hidden = true;
  }

  $('#loot-total').textContent = money(thief.stolenValue);
  $('#loot-status').textContent = thief.stolenValue >= HEIST_QUOTA
    ? 'QUOTA MET! Escape at Front Door!'
    : `stolen · quota ${money(HEIST_QUOTA)}`;
  $('#panel-arch-badge').textContent = `Guard: ${ai.state.toUpperCase()} (${ai.arch})`;
  $('#panel-trip').classList.toggle('is-now', ai.state === 'chase' || ai.state === 'attack');
  $('#p-dist').textContent = `${nfOne.format(ai.percepts.player_dist)} tiles`;
  $('#p-los').textContent = ai.percepts.player_visible ? 'SPOTTED!' : 'hidden (pos=None)';
  $('#p-hp').textContent = `${Math.round(clampNum(thief.hp, 0, 100))}%`;

  $('#rate-place').textContent = `p_${ai.state}`;
  $('#rate-place').title = `p_${ai.state}`;
  $('#rate-loot-count').textContent = `${thief.stolenIds.size} / ${LOOT_TARGETS.size}`;
  const nearText = nearLoot
    ? `next: ${nearLoot.meta.label} (${money(nearLoot.meta.value)})`
    : 'All loot stolen! Escape!';
  $('#rate-nearest-loot').textContent = nearText;
  $('#rate-nearest-loot').title = nearText;
  $('#rate-fov').textContent = ai.percepts.player_visible ? 'SPOTTED' : 'Hidden';
  $('#rate-firings').textContent = nfInt.format(ai.firings);
  $('#rate-firings-label').textContent = pluralEn.select(ai.firings) === 'one' ? 'switch' : 'switches';
  $('#rate-guard-last').textContent = `rule: ${ai.lastTransition.guard}`;
  $('#rate-guard-last').title = `rule: ${ai.lastTransition.guard}`;

  $('#alert-bar-fill').style.width = `${pct}%`;
  $('#alert-bar').setAttribute('aria-valuenow', String(pct));
  const tier = pct >= 80 ? 'ALARMED (Guard Chasing / Attacking!)' : pct >= 42 ? 'Suspicious (Investigating noise / Searching)' : 'Calm (Routine house patrol)';
  $('#alert-tier').textContent = tier;
  $('#alert-numbers').textContent = `${pct}% suspicion · ${thief.stolenValue >= HEIST_QUOTA ? 'Escape door unlocked in Studio!' : `Steal ${money(HEIST_QUOTA - thief.stolenValue)} more to unlock Escape`}`;

  const btPill = $('#bt-active-pill');
  if (btPill) btPill.textContent = ai.btActivePath;
}

function draw(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, stage.width, stage.height);
  ctx.imageSmoothingEnabled = false;
  const list = [...rooms.values()].sort((a, b) => a.rm.at[0] + a.rm.at[1] - b.rm.at[0] - b.rm.at[1]);

  for (const R of list) {
    if (!roomInView(R)) continue;
    const base = baseOf(R);
    blit(base.cv, base.ratio, R.ox + R.b.x0, R.oy + R.b.y0);
  }

  drawHeistOverlaysOnFloor();

  for (const R of list) {
    if (!roomInView(R)) continue;
    const things = [];
    for (const it of R.items) {
      if (hidden.has(it.id)) continue;
      const k = kindOf(it), layer = S.layerOf(k);
      if (layer !== 'stand') continue;
      things.push({ key: K.depthOf(k, it), it });
    }
    const guardRoom = botRoom(guard.I, guard.J) || list[0];
    if (guardRoom === R) {
      things.push({ key: guard.I - R.rm.at[0] * N + guard.J - R.rm.at[1] * N + 0.01, entity: guard, isThief: false });
    }
    const thiefRoom = botRoom(thief.I, thief.J) || list[0];
    if (thiefRoom === R) {
      things.push({ key: thief.I - R.rm.at[0] * N + thief.J - R.rm.at[1] * N + 0.02, entity: thief, isThief: true });
    }
    things.sort((a, b) => a.key - b.key);
    for (const th of things) {
      if (th.entity) {
        drawBotCharacter(R, th.entity, t, th.isThief);
        continue;
      }
      const s = spriteOf(th.it), wx = R.ox + s.x0, wy = R.oy + s.y0;
      const isLoot = LOOT_TARGETS.has(th.it.id) && !thief.stolenIds.has(th.it.id);
      if (isLoot || hover === th.it.id) {
        const hi = hiOf(s), k = zr() / s.ratio, o = (hover === th.it.id ? 3.0 : 2.0) * dpr;
        for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o]]) {
          ctx.drawImage(hi, Math.round(devX(wx) + dx), Math.round(devY(wy) + dy), Math.round(s.cv.width * k), Math.round(s.cv.height * k));
        }
      }
      blit(s.cv, s.ratio, wx, wy);
    }
  }
}

// ---------------- Feed rendering (Fix #3, #9, #10: paginated, empty-state, optional quote/note) ----------------
function renderFeed() {
  const ol = $('#feed');
  const moreBtn = $('#more');
  if (!ol) return;
  const sourceList = (breakDataMode !== 'demo' && BREAK_UI_FIXTURES[breakDataMode])
    ? BREAK_UI_FIXTURES[breakDataMode].feed
    : ai.feedLog;

  if (!sourceList.length) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'feed-empty';
    emptyLi.textContent = 'No heist events or Guard state switches recorded yet.';
    ol.replaceChildren(emptyLi);
    if (moreBtn) moreBtn.hidden = true;
    return;
  }

  const slice = sourceList.slice(0, feedShown);
  ol.replaceChildren(...slice.map((entry, idx) => {
    const li = document.createElement('li');
    li.className = 'grp';
    const gt = document.createElement('p');
    gt.className = 'grp-t';
    gt.textContent = `${entry.time} · ${entry.arch}`;
    const card = document.createElement('div');
    card.className = 'card' + (idx === 0 ? ' is-now' : '');

    const kick = document.createElement('p');
    kick.className = 'card-kicker';
    const kickLabel = document.createElement('span');
    kickLabel.textContent = entry.isLoot ? 'Heist action' : 'Guard state switch';
    kick.append(kickLabel);
    if (entry.tag) {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'tag';
      tagSpan.textContent = entry.tag;
      kick.append(' ', tagSpan);
    }

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = (entry.title || 'Untitled event') + (entry.sub ? ' ' : '');
    if (entry.sub) {
      const subSpan = document.createElement('span');
      subSpan.className = 'card-sub';
      subSpan.textContent = entry.sub;
      title.append(subSpan);
    }

    const meta = document.createElement('p');
    meta.className = 'card-meta';
    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'price' + (entry.isLoot ? ' is-loot' : '');
    badgeSpan.textContent = entry.badge || '—';
    meta.append(badgeSpan);
    if (entry.metaText) meta.append(' ', entry.metaText);

    card.append(kick, title, meta);

    if (entry.quote && String(entry.quote).trim()) {
      const quote = document.createElement('p');
      quote.className = 'card-quote';
      quote.textContent = `“${entry.quote}”`;
      card.append(quote);
    }

    if (entry.note && String(entry.note).trim()) {
      const note = document.createElement('p');
      note.className = 'card-note';
      note.textContent = entry.note;
      card.append(note);
    }

    li.append(gt, card);
    return li;
  }));

  if (moreBtn) {
    if (sourceList.length > feedShown) {
      moreBtn.hidden = false;
      moreBtn.textContent = `Show earlier (showing ${nfInt.format(slice.length)} of ${nfInt.format(sourceList.length)})`;
    } else {
      moreBtn.hidden = true;
    }
  }
}

$('#more')?.addEventListener('click', () => {
  feedShown += 20;
  renderFeed();
});

// ---------------- Hit-testing loot items & pointer / keyboard controls ----------------
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
  for (const R of rooms.values()) {
    for (const it of R.items) {
      if (hidden.has(it.id)) continue;
      const k = kindOf(it), key = S.layerOf(k) === 'stand' ? K.depthOf(k, it) : S.layerOf(k) === 'wall' ? -1 : -3;
      if (key > bk && P.pip(hullOf(it), wx - R.ox, wy - R.oy)) { best = it; bk = key; }
    }
  }
  return best;
}

const at = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
let drag = null, moved = 0;

stage.addEventListener('pointerdown', (e) => {
  drag = { x: at(e)[0], y: at(e)[1] };
  moved = 0;
});
stage.addEventListener('pointermove', (e) => {
  if (drag) {
    const [ex, ey] = at(e), dx = ex - drag.x, dy = ey - drag.y;
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 5) {
      cam.x -= dx / cam.z;
      cam.y -= dy / cam.z;
      userCam = true;
      tween = null;
      stage.classList.add('is-drag');
    }
    drag = { x: ex, y: ey };
    return;
  }
  if (e.pointerType === 'mouse') {
    const it = thingAt(...at(e));
    hover = it ? it.id : null;
    stage.classList.toggle('is-point', !!(it && LOOT_TARGETS.has(it.id)));
  }
});
stage.addEventListener('pointerup', (e) => {
  stage.classList.remove('is-drag');
  if (drag && moved <= 5) {
    const [px, py] = at(e);
    const clickedItem = thingAt(px, py);
    const [wx, wy] = toWorld(px, py);
    const [ti, tj] = worldToTile(wx, wy);
    const clampedI = Math.max(0.8, Math.min(26.2, ti));
    const clampedJ = Math.max(0.8, Math.min(26.2, tj));

    if (e.shiftKey) {
      triggerCoinDistraction(clampedI, clampedJ);
    } else if (clickedItem && LOOT_TARGETS.has(clickedItem.id) && !thief.stolenIds.has(clickedItem.id)) {
      const [li, lj] = itemTilePos(clickedItem);
      thief.autoPlay = false;
      $('#mode-play-btn').classList.add('is-active');
      $('#mode-auto-btn').classList.remove('is-active');
      thief.targetI = li;
      thief.targetJ = lj;
      thief.pendingStealId = clickedItem.id;
    } else {
      thief.autoPlay = false;
      $('#mode-play-btn').classList.add('is-active');
      $('#mode-auto-btn').classList.remove('is-active');
      thief.targetI = clampedI;
      thief.targetJ = clampedJ;
      thief.pendingStealId = null;
    }
  }
  drag = null;
});

let wheelAcc = 0;
stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  wheelAcc += e.deltaY * (e.deltaMode ? 30 : 1);
  if (Math.abs(wheelAcc) > 60) {
    zoomBy(wheelAcc < 0 ? 1 : -1, ...at(e));
    wheelAcc = 0;
  }
}, { passive: false });

for (const b of document.querySelectorAll('[data-zoom]')) {
  b.addEventListener('click', () => {
    const z = b.dataset.zoom;
    if (z === 'fit') { userCam = false; fitTo(worldBounds(), true); }
    else zoomBy(z === 'in' ? 1 : -1);
  });
}

window.addEventListener('keydown', (e) => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  keysDown.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === 'KeyE' || e.code === 'Space') {
    const near = nearestStealableLoot();
    if (near && near.dist <= 2.3) stealItem(near);
  } else if (e.code === 'KeyQ') {
    triggerCoinDistraction();
  } else if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey) {
    resetHeist();
  }
});
window.addEventListener('keyup', (e) => {
  keysDown.delete(e.code);
});

$('#steal-btn').addEventListener('click', () => {
  const near = nearestStealableLoot();
  if (!near) return;
  if (near.dist <= 2.4) {
    stealItem(near);
  } else {
    thief.targetI = near.ti;
    thief.targetJ = near.tj;
    thief.pendingStealId = near.id;
  }
});

$('#coin-btn').addEventListener('click', () => triggerCoinDistraction());
$('#reset-heist-btn').addEventListener('click', resetHeist);
$('#banner-retry-btn').addEventListener('click', resetHeist);

$('#mode-play-btn').addEventListener('click', () => {
  thief.autoPlay = false;
  $('#mode-play-btn').classList.add('is-active');
  $('#mode-auto-btn').classList.remove('is-active');
});

$('#mode-auto-btn').addEventListener('click', () => {
  thief.autoPlay = true;
  $('#mode-auto-btn').classList.add('is-active');
  $('#mode-play-btn').classList.remove('is-active');
});

$('#arch-switch-btn').addEventListener('click', () => {
  ai.arch = ai.arch === 'FSM' ? 'BT' : 'FSM';
  $('#arch-switch-btn').textContent = `Guard: ${ai.arch}`;
  updateDomOverlays();
});

document.querySelectorAll('[data-scn]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const scn = btn.dataset.scn;
    if (scn === 'sound') {
      emitSound(thief.I, thief.J, 6.5, 'loud footstep');
    } else if (scn === 'lure') {
      emitSound(4.5, 14.5, 8.0, 'kitchen distraction');
    }
  });
});

// @break-ui Segmented Toggle Wiring (?data=demo|worst|empty|one|huge)
function setBreakMode(mode) {
  if (!['demo', 'worst', 'empty', 'one', 'huge'].includes(mode)) mode = 'demo';
  breakDataMode = mode;
  feedShown = 20;
  document.querySelectorAll('[data-break-mode]').forEach((btn) => {
    btn.toggleAttribute('data-active', btn.dataset.breakMode === mode);
  });
  try {
    const url = new URL(location.href);
    url.searchParams.set('data', mode);
    history.replaceState(null, '', url);
  } catch { /* ignore file:// URL replace errors */ }
  renderFeed();
  updateDomOverlays();
}

document.querySelectorAll('[data-break-mode]').forEach((btn) => {
  btn.addEventListener('click', () => setBreakMode(btn.dataset.breakMode));
});

// ---------------- Boot ----------------
function paperTile() {
  const tile = (ink, tone, scale) => {
    const t = P.ditherTile(ink, Math.round(tone * 64)), cv = HS.env.makeCanvas(8 * scale, 8 * scale), c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(t, 0, 0, 8 * scale, 8 * scale);
    return `url(${cv.toDataURL()})`;
  };
  const rs = document.documentElement.style;
  rs.setProperty('--dither-coral', tile('coral', 0.72, 1));
  rs.setProperty('--dither-sun', tile('sun', 0.35, 1));
  rs.setProperty('--dither-teal', tile('teal', 0.55, 1));
}

function tick(now) {
  if (!house) return;
  const t = now / 1000;
  const dt = Math.min(0.05, lastT ? t - lastT : 0.016);
  lastT = t;
  clock += dt;
  if (tween) {
    const u = Math.min(1, (clock - tween.t0) / tween.d), e = P.sm(u);
    cam.x = P.lerp(tween.x0, tween.x1, e);
    cam.y = P.lerp(tween.y0, tween.y1, e);
    if (u >= 1) tween = null;
  }
  stepSimulation(dt);
  draw(clock);
  updateDomOverlays();
}

function frame(now) {
  requestAnimationFrame(frame);
  tick(now);
}

function init() {
  paperTile();
  house = window.HOUSE_DATA;
  kinds = window.KINDS_DATA;
  loadImages();
  index();
  $('#loading').hidden = true;
  resize();
  resetHeist();
  draw(0);

  try {
    const initialMode = new URLSearchParams(location.search).get('data') || 'demo';
    setBreakMode(initialMode);
  } catch { /* ignore */ }

  const h = $('#hint');
  if (h) {
    h.textContent = 'Click any gold-outlined valuable to sneak over and steal it · Press Q to toss a decoy coin · Escape at the Front Door!';
    h.hidden = false;
    setTimeout(() => { h.classList.add('is-gone'); setTimeout(() => { h.hidden = true; }, 700); }, 9000);
  }
  new ResizeObserver(() => resize()).observe(view);
  requestAnimationFrame(frame);
}

init();
})();
