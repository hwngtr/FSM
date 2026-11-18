// Heist domain: heat, alert tiers, objectives, bag capacity and timed actions.
// Pure logic. No DOM, no rendering. Shared by the browser game and the Node test harness.
(function (HS) {
'use strict';

const TIERS = [
  { min: 0.00, label: 'Calm',      note: 'routine shelf patrol',        css: 'calm' },
  { min: 0.12, label: 'Curious',   note: 'a noise caught their ear',    css: 'curious' },
  { min: 0.32, label: 'Suspicious',note: 'cameras tracking your route', css: 'suspicious' },
  { min: 0.52, label: 'Searching', note: 'detective sweeping the zone', css: 'searching' },
  { min: 0.72, label: 'Lockdown',  note: 'security on full alert',      css: 'lockdown' },
  { min: 0.90, label: 'Exposure',  note: 'one more sighting ends it',   css: 'exposure' },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));

function tierOf(heat) {
  let tier = 0;
  for (let i = 1; i < TIERS.length; i++) if (heat >= TIERS[i].min) tier = i;
  return tier;
}

function createHeist(cfg = {}) {
  return {
    heat: 0.12,
    tier: 1,
    phase: 'case',
    bagCap: cfg.bagCap || 3,
    bag: [],
    objectives: (cfg.objectives || []).map((o) => ({ ...o, done: false })),
    channel: null,
    camerasDisabled: false,
    vitrineOpen: false,
    hadTags: false,
    elapsed: 0,
  };
}

function setHeat(st, value) {
  st.heat = clamp(value, 0, 1);
  st.tier = tierOf(st.heat);
  return st.heat;
}

function addHeat(st, amount) {
  return setHeat(st, st.heat + amount);
}

function decay(st, dt, hidden) {
  const rate = hidden ? 0.12 : 0.07;
  return addHeat(st, -rate * dt);
}

function bagCount(st) { return st.bag.length; }
function canCarry(st) { return st.bag.length < st.bagCap; }
function putInBag(st, id) { if (canCarry(st)) { st.bag.push(id); return true; } return false; }

function objective(st, id) { return st.objectives.find((o) => o.id === id); }
function completeObjective(st, id) {
  const o = objective(st, id);
  if (o && !o.done) { o.done = true; return true; }
  return false;
}
function requiredMet(st) {
  return st.objectives.filter((o) => o.id !== 'escape').every((o) => o.done);
}

function startChannel(st, kind, id, holdSeconds) {
  st.channel = { kind, id, hold: Math.max(0.2, holdSeconds), progress: 0 };
  return st.channel;
}
function cancelChannel(st) { st.channel = null; }
function tickChannel(st, dt, interrupted) {
  const c = st.channel;
  if (!c) return null;
  if (interrupted) { st.channel = null; return 'cancelled'; }
  c.progress += dt;
  if (c.progress >= c.hold) { st.channel = null; return 'done'; }
  return 'running';
}

HS.Heist = {
  TIERS, tierOf, createHeist, setHeat, addHeat, decay, bagCount, canCarry, putInBag,
  objective, completeObjective, requiredMet,
  startChannel, cancelChannel, tickChannel, clamp,
};
})(globalThis.HOUSE || (globalThis.HOUSE = {}));
