import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../web/js/model-constraints.js', import.meta.url), 'utf8'), context);
const constraints = context.window.WORKSHOP.ModelConstraints;

const cart = {
  size: [1.1, 1.6],
  colors: { metal: 'silver', basket: 'blue', handle: 'red', wheel: 'black' },
  shapes: [
    { box: [0, 0, 0.42, 1.1, 1.6, 0.08], color: 'basket' },
    { box: [0, 0, 0.5, 1.1, 0.07, 0.42], color: 'metal' },
    { box: [0, 1.53, 0.5, 1.1, 0.07, 0.42], color: 'metal' },
    { box: [0, 0, 0.5, 0.07, 1.6, 0.42], color: 'metal' },
    { box: [1.03, 0, 0.5, 0.07, 1.6, 0.42], color: 'metal' },
    { pole: [0.1, 1.55, 0.5, 0.1, 1.55, 1.02], color: 'metal' },
    { box: [0.08, 1.5, 1, 0.94, 0.12, 0.08], color: 'handle' },
    { cyl: [0.18, 0.18, 0, 0.1, 0.16], color: 'wheel' },
    { cyl: [0.92, 0.18, 0, 0.1, 0.16], color: 'wheel' },
    { cyl: [0.18, 1.42, 0, 0.1, 0.16], color: 'wheel' },
    { cyl: [0.92, 1.42, 0, 0.1, 0.16], color: 'wheel' },
  ],
};

assert.deepEqual(Array.from(constraints.validate('shopping-cart', cart)), []);
assert.match(constraints.rulesFor('shopping-cart').join(' '), /all four wheels/i);
assert.deepEqual(Array.from(constraints.validate('unconstrained-model', { shapes: [] })), []);

const boxInsteadOfCart = { ...cart, colors: { body: 'blue' }, shapes: [{ box: [0, 0, 0, 1, 1, 1], color: 'body' }] };
const boxErrors = constraints.validate('shopping-cart', boxInsteadOfCart);
assert.ok(boxErrors.some((error) => /basket base/i.test(error)));
assert.ok(boxErrors.some((error) => /handle/i.test(error)));
assert.ok(boxErrors.some((error) => /wheels/i.test(error)));

const closedBasket = structuredClone(cart);
closedBasket.shapes = closedBasket.shapes.filter((shape) => shape.color !== 'metal' || !shape.box);
assert.ok(constraints.validate('shopping-cart', closedBasket).some((error) => /open basket frame/i.test(error)));

const deepBasket = structuredClone(cart);
deepBasket.shapes[0].box[5] = 0.8;
assert.ok(constraints.validate('shopping-cart', deepBasket).some((error) => /shallow basket base/i.test(error)));

const missingCornerWheel = structuredClone(cart);
const farRightWheel = missingCornerWheel.shapes.find((shape) =>
  shape.color === 'wheel' && shape.cyl[0] > 0.5 && shape.cyl[1] > 0.5);
farRightWheel.cyl[0] = 0.55;
assert.ok(constraints.validate('shopping-cart', missingCornerWheel).some((error) => /four footprint corners/i.test(error)));

console.log('Model identity constraints passed.');
