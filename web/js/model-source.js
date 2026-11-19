(function (WS) {
'use strict';

function objectEnd(source, start) {
  let depth = 0, quote = null, escaped = false, lineComment = false, blockComment = false;
  for (let i = start; i < source.length; i++) {
    const char = source[i], next = source[i + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; i++; continue; }
    if (char === '/' && next === '*') { blockComment = true; i++; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) return i + 1;
  }
  throw new Error('Could not find the end of the model object in market.js.');
}

function replaceMarketModel(source, modelId, model) {
  if (typeof source !== 'string') throw new Error('The selected file could not be read as text.');
  if (!/^[a-z0-9-]+$/.test(modelId)) throw new Error('This model ID is not safe to use as a source key.');
  if (!model || typeof model !== 'object' || Array.isArray(model) || !Array.isArray(model.shapes)) {
    throw new Error('Only an accepted model object with a shapes array can be written.');
  }

  const declaration = 'const MARKET_KINDS = {';
  const declarationAt = source.indexOf(declaration);
  if (declarationAt < 0) throw new Error('The selected file does not contain the market model catalog.');
  const key = `'${modelId}':`;
  const valueAt = source.indexOf(key, declarationAt + declaration.length);
  if (valueAt < 0) throw new Error(`Could not find '${modelId}' in the market model catalog.`);
  if (source.indexOf(key, valueAt + key.length) >= 0) {
    throw new Error(`Found more than one '${modelId}' key. No source change was made.`);
  }

  let start = valueAt + key.length;
  while (/\s/.test(source[start] || '')) start++;
  if (source[start] !== '{') throw new Error(`The '${modelId}' value is not an object. No source change was made.`);
  const end = objectEnd(source, start);
  const lineStart = source.lastIndexOf('\n', start) + 1;
  const indent = source.slice(lineStart, start).match(/^\s*/)?.[0] || '';
  const lines = JSON.stringify(model, null, 2).split('\n');
  const replacement = [lines[0], ...lines.slice(1).map((line) => indent + line)].join('\n');
  return source.slice(0, start) + replacement + source.slice(end);
}

WS.ModelSource = { replaceMarketModel };
})(window.WORKSHOP || (window.WORKSHOP = {}));
