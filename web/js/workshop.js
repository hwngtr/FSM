// ===========================================================================
// the object workshop page: browse models and placed objects, edit a draft,
// and render a live preview with the same press as the game.
//
// rules kept here:
//   - the preview always goes through HOUSE.K.drawThing + HOUSE.P.mkHand;
//     no shape code is duplicated.
//   - drafts are parsed with JSON.parse only. nothing is ever eval'd and no
//     game data is mutated: drawThing receives a deep copy.
//   - a malformed draft shows an error and leaves the last good preview up.
// ===========================================================================
(function () {
'use strict';
const K = HOUSE.K, P = HOUSE.P;
const IDX = window.WORKSHOP.WorkshopIndex;

const $ = (id) => document.getElementById(id);
const listModels = $('list-models'), listPlaced = $('list-placed');
const search = $('search'), count = $('count'), empty = $('empty');
const tabs = { models: $('tab-models'), placed: $('tab-placed') };
const insEmpty = $('inspector-empty'), insBody = $('inspector-body');
const insTitle = $('ins-title'), insMeta = $('ins-meta'), insBadges = $('ins-badges');
const draft = $('draft'), draftError = $('draft-error'), preview = $('preview');
const aiGoals = $('ai-goals'), aiStatus = $('ai-status'), modelChecks = $('model-checks');
const writeSource = $('write-source');
const links = $('ins-links');

const state = { tab: 'models', query: '', sel: null, entry: null, appliedKind: null, appliedItem: null, draftIsDirty: false };
const images = {}; // loaded art PNGs, same shape as the game's own map

// ---------------- the shared renderer ----------------
// draw one thing centred on the canvas, at 2x for crisp dither screens
function renderPreview(kind, item) {
  const it = structuredClone(item);
  it.colors = it.colors || {}; it.options = it.options || {};
  const bx = K.screenBox(kind, it), w = bx.x1 - bx.x0, h = bx.y1 - bx.y0;
  const s = 2;
  preview.width = Math.max(2, w * s); preview.height = Math.max(2, h * s);
  const c = preview.getContext('2d');
  c.fillStyle = P.rgb(P.PAPER);
  c.fillRect(0, 0, preview.width, preview.height);
  c.setTransform(s, 0, 0, s, -bx.x0 * s, -bx.y0 * s);
  const H = P.mkHand(c, { seed: 1, ox: 0, oy: 0 });
  K.drawThing(H, P.streamOf('item', it.id), kind, it, images);
  preview.setAttribute('aria-label', 'Live riso preview of ' + (it.name || kind.name || 'object'));
}

// load art images the way the game does, then redraw
function loadImages(item, kind, redraw) {
  if (!item.image || images[item.image] instanceof Image) return;
  images[item.image] = null;
  const im = new Image();
  im.onload = () => { images[item.image] = im; redraw(); };
  im.src = item.image;
}

// a stand-in placement so a model can be drawn on its own
function modelItem(m) {
  const kind = m.kind, place = kind.place;
  const wall = place === 'wall';
  return {
    id: 'preview:' + m.id, kind: m.id, name: kind.label || m.id,
    size: kind.size, colors: kind.colors, options: kind.options,
    at: wall
      ? { i: 0, j: 0.02, z: kind.z || 0, face: 'nw' }
      : { i: 0, j: 0, z: 0, face: 'ne' },
    image: null,
  };
}

// ---------------- catalog list ----------------
function matches(entry) {
  const q = state.query.trim().toLowerCase();
  if (!q) return true;
  const hay = state.tab === 'models'
    ? [entry.id, entry.kind.label, entry.kind.name].join(' ').toLowerCase()
    : [entry.item.name, entry.item.kind, entry.room, entry.item.store].join(' ').toLowerCase();
  return q.split(/\s+/).every((t) => hay.includes(t));
}
function visible() {
  const all = state.tab === 'models' ? IDX.models : IDX.placements;
  return all.filter(matches);
}
function subOf(entry) {
  if (state.tab === 'models') return `${entry.origin} kind · place: ${entry.kind.place || 'floor'} · ${entry.kind.size ? entry.kind.size.join('×') + ' tiles' : 'no size'}`;
  const model = IDX.modelOf(entry);
  return `${entry.origin} · ${entry.room || 'no room'} · kind: ${entry.item.kind}${model ? '' : ' (kind unknown)'}`;
}
function renderList() {
  const list = state.tab === 'models' ? listModels : listPlaced;
  for (const el of [listModels, listPlaced]) el.hidden = el !== list;
  list.textContent = '';
  let shown = 0;
  for (const entry of visible()) {
    shown++;
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(state.sel === entry.id));
    const name = state.tab === 'models' ? entry.id : (entry.item.name || entry.item.id);
    b.innerHTML = '';
    const n = document.createElement('span'); n.className = 'cl-name'; n.textContent = name;
    const s = document.createElement('span'); s.className = 'cl-sub'; s.textContent = subOf(entry);
    b.append(n, s);
    b.addEventListener('click', () => select(entry.id));
    li.appendChild(b); list.appendChild(li);
  }
  const total = state.tab === 'models' ? IDX.models.length : IDX.placements.length;
  count.textContent = `${shown} of ${total} ${state.tab}`;
  empty.hidden = shown > 0;
}
function tabTo(tab) {
  state.tab = tab;
  for (const [t, btn] of Object.entries(tabs)) btn.setAttribute('aria-selected', String(t === tab));
  renderList();
}

// ---------------- inspector ----------------
function select(id) {
  state.sel = id;
  const entry = state.tab === 'models' ? IDX.models.find((m) => m.id === id) : IDX.placements.find((p) => p.id === id);
  if (!entry) return;
  state.entry = entry;
  insEmpty.hidden = true; insBody.hidden = false;
  showInspector(entry);
  renderList();
}

function showInspector(entry) {
  const isModel = state.tab === 'models';
  writeSource.hidden = !isModel || entry.origin !== 'market';
  const kind = isModel ? entry.kind : (IDX.modelOf(entry) || {}).kind;
  const item = isModel ? modelItem(entry) : entry.item;
  insTitle.textContent = isModel ? entry.id : (entry.item.name || entry.item.id);
  insMeta.textContent = isModel
    ? `Model · ${entry.origin} · defined in ${entry.src.file}${entry.line ? ' line ' + entry.line : ''}`
    : `Placed · kind ${entry.item.kind} · room ${entry.room || '—'} · position ${entry.item.at ? 'i' + entry.item.at.i + ', j' + entry.item.at.j + (entry.item.at.z ? ', z' + entry.item.at.z : '') : '—'} · ${entry.item.store ? 'bought at ' + entry.item.store : 'not from a store'}`;

  insBadges.textContent = '';
  const badge = (cls, text) => { const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; insBadges.appendChild(s); };
  badge(null, isModel ? 'reusable model' : 'placed object');
  badge('badge-market', entry.origin === 'house' ? "Dither's House" : 'Frischemarkt');
  if (kind && kind.place === 'wall') badge(null, 'wall-mounted');
  if (item.image) badge('badge-image', 'image-backed print (loads a PNG)');

  // links: same-origin source, then the safe external product page
  links.textContent = '';
  const ul = document.createElement('ul');
  const addLink = (href, text, external) => {
    const a = document.createElement('a');
    a.href = href; a.textContent = text;
    if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer nofollow'; }
    const li = document.createElement('li'); li.appendChild(a); ul.appendChild(li);
  };
  const h3 = document.createElement('h3'); h3.textContent = 'Sources';
  links.append(h3, ul);
  if (isModel) addLink(entry.src.file, `${entry.src.file}${entry.line ? ' — line ' + entry.line : ''} (model definition)`, false);
  else {
    addLink(entry.src.file, `${entry.src.file}${entry.line ? ' — line ' + entry.line : ''} (placed object)`, false);
    const m = IDX.modelOf(entry);
    if (m) addLink(m.src.file, `${m.src.file}${m.line ? ' — line ' + m.line : ''} (its model)`, false);
    if (entry.item.url) {
      if (/^https:\/\//i.test(entry.item.url)) addLink(entry.item.url, 'product page — ' + (entry.item.store || 'store'), true);
      else badge(null, 'product link withheld (not an https URL)');
    }
  }

  // draft: a deep copy of the editable record
  const draftObj = isModel ? kind : item;
  draft.value = JSON.stringify(draftObj, null, 2);
  draftError.hidden = true;
  aiStatus.textContent = '';
  modelChecks.textContent = '';
  state.appliedKind = null;
  state.appliedItem = null;
  state.draftIsDirty = false;
  applyDraft();
}

// parse and render the current draft. JSON.parse only — never eval.
function applyDraft() {
  draftError.hidden = true;
  draftError.textContent = '';
  let parsed;
  try { parsed = JSON.parse(draft.value); }
  catch (err) {
    draftError.hidden = false;
    draftError.innerHTML = '';
    const st = document.createElement('strong'); st.textContent = 'The draft is not valid JSON.';
    draftError.append(st, document.createTextNode(err.message));
    return;
  }
  const entry = state.entry;
  if (!entry) return;
  const isModel = state.tab === 'models';
  const baseKind = isModel ? entry.kind : (IDX.modelOf(entry) || {}).kind;
  try {
    if (isModel) {
      if (typeof parsed !== 'object' || !parsed || !Array.isArray(parsed.shapes)) {
        draftError.hidden = false;
        draftError.textContent = 'A model draft needs a "shapes" array. Nothing was applied.';
        return;
      }
      const diagnostics = modelDiagnostics(parsed, entry.id);
      renderDiagnostics(diagnostics);
      if (diagnostics.errors.length) {
        draftError.hidden = false;
        draftError.textContent = 'This model draft does not meet its identity constraints. The last good preview is unchanged. Fix the listed checks before applying it.';
        return;
      }
      const item = modelItem({ id: entry.id, kind: parsed });
      renderPreview(parsed, item);
      loadImages(parsed, parsed, () => renderPreview(parsed, item));
      state.appliedKind = parsed;
      state.appliedItem = item;
    } else {
      if (typeof parsed !== 'object' || !parsed || !parsed.at) {
        draftError.hidden = false;
        draftError.textContent = 'A placement draft needs an "at" object. Nothing was applied.';
        return;
      }
      if (!baseKind) { renderPreview({ shapes: [], size: [1, 1] }, parsed); return; }
      const item = Object.assign({}, structuredClone(entry.item), parsed);
      renderPreview(baseKind, item);
      loadImages(item, baseKind, () => renderPreview(baseKind, item));
      state.appliedKind = baseKind;
      state.appliedItem = item;
    }
    state.draftIsDirty = false;
  } catch (err) {
    draftError.hidden = false;
    draftError.textContent = 'The draft could not render. ' + err.message;
  }
}

// copy helpers: clipboard with a textarea fallback
async function copy(text, btn) {
  let ok = true;
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    try { const t = document.createElement('textarea'); t.value = text; document.body.append(t);
      t.select(); document.execCommand('copy'); t.remove(); }
    catch (e2) { ok = false; }
  }
  if (btn) { const old = btn.textContent; btn.textContent = ok ? 'Copied!' : 'Copy failed';
    setTimeout(() => { btn.textContent = old; }, 1200); }
}

function modelDiagnostics(kind, modelId) {
  const errors = [], warnings = [];
  if (!kind || typeof kind !== 'object' || !Array.isArray(kind.shapes)) {
    return { errors: ['Model must be an object with a shapes array.'], warnings };
  }
  if (!Array.isArray(kind.size) || kind.size.length !== 2
    || !kind.size.every((n) => Number.isFinite(Number(n)) && Number(n) > 0)) {
    errors.push('size must contain two positive numbers.');
  }
  if (!Number.isFinite(Number(kind.height)) || Number(kind.height) <= 0) {
    warnings.push('height is missing or is not a positive number.');
  }
  const lengths = { box: 6, legs: 6, cyl: 5, cone: 6, ball: 4, pole: 6, panel: 5,
    plant: 3, books: 5, flat: 5, glow: 3, dot: 3 };
  const bounds = [];
  kind.shapes.forEach((shape, i) => {
    const label = `Shape ${i + 1}`;
    if (!shape || typeof shape !== 'object' || Array.isArray(shape)) {
      errors.push(`${label} must be an object.`);
      return;
    }
    const type = K.shapeType(shape);
    if (!type) {
      errors.push(`${label} needs one supported primitive (${K.SHAPES.join(', ')}).`);
      return;
    }
    const values = shape[type];
    if (lengths[type] && values.length !== lengths[type]) {
      errors.push(`${label} (${type}) needs ${lengths[type]} values.`);
      return;
    }
    const numeric = values.flat(Infinity).every((v) =>
      (typeof v === 'number' && Number.isFinite(v))
      || (typeof v === 'string' && /^\$[a-zA-Z][\w-]*$/.test(v)));
    if (!numeric) errors.push(`${label} (${type}) has a non-finite or unsupported coordinate.`);
    if (shape.color && !Object.hasOwn(kind.colors || {}, shape.color)
      && !Object.hasOwn(K.SWATCH, shape.color)) {
      warnings.push(`${label} uses unknown color "${shape.color}".`);
    }
    if (['box', 'legs'].includes(type) && values.length === 6
      && values.every((v) => typeof v === 'number')) {
      bounds.push({ label, x0: values[0], y0: values[1], z0: values[2],
        x1: values[0] + values[3], y1: values[1] + values[4], z1: values[2] + values[5] });
    } else if (type === 'cyl' && values.length === 5
      && values.every((v) => typeof v === 'number')) {
      bounds.push({ label, x0: values[0] - values[3], y0: values[1] - values[3], z0: values[2],
        x1: values[0] + values[3], y1: values[1] + values[3], z1: values[2] + values[4] });
    }
  });
  if (Array.isArray(kind.size) && kind.size.length === 2
    && kind.size.every((v) => typeof v === 'number' && Number.isFinite(v))) {
    for (const b of bounds) {
      if (b.x0 < -0.05 || b.y0 < -0.05 || b.z0 < -0.05
        || b.x1 > kind.size[0] + 0.05 || b.y1 > kind.size[1] + 0.05
        || (Number.isFinite(kind.height) && b.z1 > kind.height + 0.1)) {
        warnings.push(`${b.label} extends beyond the declared size or height.`);
      }
    }
  }
  if (kind.shapes.length === 0) warnings.push('The model has no shapes to render.');
  errors.push(...window.WORKSHOP.ModelConstraints.validate(modelId, kind));
  return { errors, warnings };
}

function renderDiagnostics(result) {
  modelChecks.textContent = '';
  const entries = [
    ...result.errors.map((text) => ({ text, cls: 'check-error' })),
    ...result.warnings.map((text) => ({ text, cls: 'check-warning' })),
  ];
  if (!entries.length) entries.push({ text: 'No structural or basic geometry issues found.', cls: '' });
  for (const entry of entries) {
    const li = document.createElement('li');
    li.className = entry.cls;
    li.textContent = entry.text;
    modelChecks.appendChild(li);
  }
  aiStatus.textContent = result.errors.length
    ? `${result.errors.length} error${result.errors.length === 1 ? '' : 's'} and ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}.`
    : result.warnings.length
      ? `No blocking errors. ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}.`
      : 'Draft passes these basic checks. Visual realism still needs your review.';
}

function buildAiPrompt() {
  if (!state.entry) return null;
  let kind;
  if (state.tab === 'models') {
    try { kind = JSON.parse(draft.value); }
    catch { return { error: 'Fix the JSON draft before copying an AI prompt.' }; }
  } else {
    kind = IDX.modelOf(state.entry)?.kind;
  }
  if (!kind) return { error: 'This object has no reusable model definition to send in a prompt.' };
  const goals = aiGoals.value.trim() || 'Improve the object so it reads clearly as its named real-world object.';
  const modelId = state.tab === 'models' ? state.entry.id : state.entry.item.kind;
  const identityRules = window.WORKSHOP.ModelConstraints.rulesFor(modelId);
  return [
    'Improve this procedural object model for a small isometric game. Return one valid JSON object only, with no Markdown fences or explanation.',
    'Keep the existing model fields and supported shape primitives. Do not invent renderer features, JavaScript, or unsupported shape types. Preserve painter order where possible. Keep coordinates finite and within size/height unless a deliberate overhang is needed.',
    `Object id: ${state.tab === 'models' ? state.entry.id : state.entry.item.kind}`,
    `Object label: ${kind.label || kind.name || 'unnamed object'}`,
    `Supported primitives: ${K.SHAPES.join(', ')}.`,
    'Coordinate formats: box/legs [u,v,z,width,depth,height]; cyl [u,v,z,radius,height] and always vertical; cone [u,v,z,bottomRadius,topRadius,height]; ball [u,v,z,radius]; pole [u0,v0,z0,u1,v1,z1]; panel [u,v,z,width,height]; flat [u,v,z,width,depth]; dot [u,v,z]. Other primitives use the existing game schema.',
    'Important renderer limit: cylinders only stand vertically. Do not claim to rotate a cylinder sideways. If the requested result needs a feature the renderer does not support, keep the JSON valid and explain the limitation after the JSON only if asked; otherwise prefer a supported visual approximation.',
    ...(identityRules.length ? ['Required identity constraints:\n' + identityRules.map((rule) => '- ' + rule).join('\n')] : []),
    `Improvement goals: ${goals}`,
    'Current model JSON:',
    JSON.stringify(kind, null, 2),
  ].join('\n\n');
}

async function writeAppliedModel() {
  const entry = state.entry;
  if (state.tab !== 'models' || !entry || entry.origin !== 'market') {
    aiStatus.textContent = 'Select a reusable market model first.';
    return;
  }
  if (state.draftIsDirty) {
    aiStatus.textContent = 'Apply the draft and review its preview before writing it to source.';
    return;
  }
  if (!state.appliedKind) {
    aiStatus.textContent = 'Apply and preview a valid model before writing it to source.';
    return;
  }
  const diagnostics = modelDiagnostics(state.appliedKind, entry.id);
  renderDiagnostics(diagnostics);
  if (diagnostics.errors.length) {
    aiStatus.textContent = 'This model does not meet its identity constraints. It was not written.';
    return;
  }
  if (typeof window.showOpenFilePicker !== 'function') {
    aiStatus.textContent = 'This browser cannot write local files. Use Copy model JSON and replace the model in web/js/market.js.';
    return;
  }
  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description: 'Market JavaScript source', accept: { 'text/javascript': ['.js'] } }],
    });
    if (handle.name !== 'market.js') {
      aiStatus.textContent = 'Select the project’s web/js/market.js file. No source was changed.';
      return;
    }
    const original = await (await handle.getFile()).text();
    const updated = window.WORKSHOP.ModelSource.replaceMarketModel(original, entry.id, state.appliedKind);
    const approved = window.confirm(
      `Write the applied "${entry.id}" model to the selected market.js file? This replaces only that model definition.`
    );
    if (!approved) {
      aiStatus.textContent = 'Source update cancelled. No source was changed.';
      return;
    }
    const writable = await handle.createWritable();
    await writable.write(updated);
    await writable.close();
    aiStatus.textContent = `Updated ${entry.id} in market.js. Reload the market page to see the source change.`;
  } catch (err) {
    if (err.name === 'AbortError') {
      aiStatus.textContent = 'Source update cancelled.';
      return;
    }
    aiStatus.textContent = `Could not update market.js. ${err.message}`;
  }
}

// ---------------- wiring ----------------
search.addEventListener('input', () => { state.query = search.value; renderList(); });
for (const [t, btn] of Object.entries(tabs)) {
  btn.addEventListener('click', () => tabTo(t));
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault(); const other = t === 'models' ? 'placed' : 'models';
      tabTo(other); tabs[other].focus();
    }
  });
}
$('apply').addEventListener('click', applyDraft);
draft.addEventListener('input', () => { state.draftIsDirty = true; });
$('write-source').addEventListener('click', writeAppliedModel);
$('copy-ai-prompt').addEventListener('click', async (e) => {
  const prompt = buildAiPrompt();
  if (!prompt || prompt.error) { aiStatus.textContent = prompt?.error || 'Select a model first.'; return; }
  await copy(prompt, e.currentTarget);
  aiStatus.textContent = 'Prompt copied. Paste it into your AI assistant, then paste its JSON reply into Draft.';
});
$('check-model').addEventListener('click', () => {
  if (state.tab !== 'models') {
    aiStatus.textContent = 'Select a model in the Models tab to check model geometry.';
    modelChecks.textContent = '';
    return;
  }
  try { renderDiagnostics(modelDiagnostics(JSON.parse(draft.value), state.entry.id)); }
  catch (err) {
    renderDiagnostics({ errors: [`Draft is not valid JSON: ${err.message}`], warnings: [] });
  }
});
$('reset').addEventListener('click', () => { if (state.entry) showInspector(state.entry); });
$('copy-model').addEventListener('click', (e) => {
  const entry = state.entry; if (!entry) return;
  copy(JSON.stringify(state.appliedKind || (state.tab === 'models' ? entry.kind : (IDX.modelOf(entry) || {}).kind), null, 2), e.currentTarget);
});
$('copy-placement').addEventListener('click', (e) => {
  const entry = state.entry; if (!entry) return;
  const placement = state.appliedItem || (state.tab === 'models' ? modelItem(entry) : entry.item);
  copy(JSON.stringify(placement, null, 2), e.currentTarget);
});
// Ctrl/Cmd+Enter in the draft applies it
draft.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); applyDraft(); }
});

// a placement's model may be unknown; the list still shows the record
tabTo('models');
IDX.resolveSources(() => { if (state.entry) showInspector(state.entry); renderList(); });
})();
