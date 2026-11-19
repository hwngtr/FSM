// ===========================================================================
// the object workshop index: a read-only, normalized catalog over the game's
// own data. it exposes two sources side by side:
//
//   models    - reusable shape definitions, KINDS_DATA (web/js/data.js) for the
//               house and MARKET_CONFIG.kinds (web/js/market.js) for the market
//   placements- placed objects, HOUSE_DATA.items and MARKET_CONFIG.house.items
//
// nothing here mutates game data. source files are fetched (same origin) once
// and searched with plain text so the UI can show the file and line each
// model or item comes from. over file:// the fetch fails and the line is
// simply left out.
// ===========================================================================
(function (WS) {
'use strict';

const MODEL_SOURCES = {
  house: { file: 'js/data.js', container: 'window.KINDS_DATA', needle: (id) => `"${id}": {"name"` },
  market: { file: 'js/market.js', container: 'MARKET_KINDS', needle: (id) => `'${id}': {` },
};
const ITEM_SOURCES = {
  house: { file: 'js/data.js', container: 'HOUSE_DATA.items', needle: (id) => `"id":"${id}"` },
  market: { file: 'js/market.js', container: 'MARKET_CONFIG.house.items', needle: (id) => `id: '${id}'` },
};

// one cached text fetch per file, then a line-number search
const texts = new Map();
function fileLines(file) {
  if (!texts.has(file)) {
    texts.set(file, (async () => {
      try {
        const res = await fetch(file);
        return res.ok ? (await res.text()).split('\n') : null;
      } catch (e) { return null; }
    })());
  }
  return texts.get(file);
}
async function locate(entry, id) {
  const lines = await fileLines(entry.file);
  if (!lines) return null;
  const needle = entry.needle(id);
  for (let n = 0; n < lines.length; n++) if (lines[n].includes(needle)) return n + 1;
  return null;
}

const models = [];
const placements = [];
const modelById = new Map();
const roomNames = new Map();

// models: house kinds first, then market kinds (a shared id keeps the house one)
for (const [origin, defs] of [['house', window.KINDS_DATA || {}], ['market', (window.MARKET_CONFIG && window.MARKET_CONFIG.kinds) || {}]]) {
  for (const id of Object.keys(defs)) {
    if (modelById.has(id)) continue;
    const m = { id, origin, kind: defs[id], src: MODEL_SOURCES[origin], line: null };
    modelById.set(id, m); models.push(m);
  }
}

// placements: every placed object, with the room it sits in
for (const [origin, house] of [['house', window.HOUSE_DATA], ['market', window.MARKET_CONFIG && window.MARKET_CONFIG.house]]) {
  if (!house) continue;
  for (const rm of house.rooms || []) roomNames.set(origin + ':' + rm.id, rm.name || rm.type || rm.id);
  for (const it of house.items || []) {
    placements.push({
      id: origin + ':' + it.id, item: it, origin,
      modelId: it.kind, room: roomNames.get(origin + ':' + it.room) || it.room || '',
      src: ITEM_SOURCES[origin], line: null,
    });
  }
}

// resolve every source line in the background; the UI re-renders when told
let resolved = false;
async function resolveSources(notify) {
  if (resolved) return;
  resolved = true;
  const jobs = [];
  for (const m of models) jobs.push(locate(m.src, m.id).then((l) => { m.line = l; }));
  for (const p of placements) jobs.push(locate(p.src, p.item.id).then((l) => { p.line = l; }));
  await Promise.all(jobs);
  if (notify) notify();
}

/** Exposes the read-only model and placement catalog from game data. */
WS.WorkshopIndex = {
  models, placements, modelById,
  roomName: (origin, id) => roomNames.get(origin + ':' + id) || '',
  resolveSources,
  // a placement's model, or null when its kind is unknown
  modelOf: (p) => modelById.get(p.modelId) || null,
};
})(window.WORKSHOP || (window.WORKSHOP = {}));
