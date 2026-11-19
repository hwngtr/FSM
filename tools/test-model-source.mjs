import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../web/js/model-source.js', import.meta.url), 'utf8'), context);
const replaceMarketModel = context.window.WORKSHOP.ModelSource.replaceMarketModel;

const source = [
  'const MARKET_KINDS = {',
  "    'shopping-cart': {",
  "      name: 'old } cart',",
  '      // This brace is not the end of the object: }',
  '      shapes: [{ box: [0, 0, 0, 1, 1, 1] }],',
  '    },',
  "    'hand-basket': { name: 'keep me', shapes: [] },",
  '  };',
  'const OTHER_CODE = "unchanged";',
].join('\n');
const model = { name: 'new cart', shapes: [{ box: [0, 0, 0, 1, 1, 1] }] };
const result = replaceMarketModel(source, 'shopping-cart', model);
assert.match(result, /'shopping-cart': \{\n      "name": "new cart"/);
assert.match(result, /'hand-basket': \{ name: 'keep me', shapes: \[\] \}/);
assert.match(result, /const OTHER_CODE = "unchanged";/);
assert.throws(() => replaceMarketModel(source, 'missing-cart', model), /Could not find/);
assert.throws(() => replaceMarketModel(source.replace("    'shopping-cart': {", "    'shopping-cart': { name: 'first' },\n    'shopping-cart': {"), 'shopping-cart', model), /more than one/);

console.log('Market model source replacement passed.');
