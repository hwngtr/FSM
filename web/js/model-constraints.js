(function (WS) {
'use strict';

const constraints = {
  'shopping-cart': {
    requiredColors: ['basket', 'handle', 'wheel', 'metal'],
    features: [
      { name: 'basket base', color: 'basket', primitives: ['box', 'panel'], minimum: 1 },
      { name: 'handle', color: 'handle', primitives: ['box', 'pole', 'lines'], minimum: 1 },
      { name: 'metal frame', color: 'metal', primitives: ['box', 'pole', 'lines'], minimum: 4 },
      { name: 'wheels', color: 'wheel', primitives: ['cyl'], minimum: 4 },
    ],
    promptRules: [
      'Keep the basket, handle, metal frame, and all four wheels.',
      'Keep the basket open at the top, with visible gaps and two long metal rails along each side direction.',
      'Keep the basket base shallow. Do not replace the basket with a deep solid box.',
      'Keep one wheel near each footprint corner and close to floor level.',
      'Do not turn the cart into a cabinet, box, or generic trolley-like object.',
    ],
    basket: { color: 'basket', maxThickness: 0.18, coverage: 0.65 },
    frame: { color: 'metal', topMin: 0.25, span: 0.65, railMax: 0.12 },
    wheel: { primitive: 'cyl', color: 'wheel', floorMax: 0.12, cornerBand: 0.35 },
  },
};

function shapeType(shape, primitives) {
  return primitives.find((type) => Array.isArray(shape[type]));
}

function validate(modelId, kind) {
  const spec = constraints[modelId];
  if (!spec) return [];
  if (!kind || typeof kind !== 'object' || !Array.isArray(kind.shapes)) {
    return [`${modelId} must keep its model fields and shapes array.`];
  }

  const errors = [];
  for (const color of spec.requiredColors) {
    if (typeof kind.colors?.[color] !== 'string' || !kind.colors[color]) {
      errors.push(`Keep the "${color}" color role. It identifies a required cart part.`);
    }
  }

  for (const feature of spec.features) {
    const count = kind.shapes.filter((shape) =>
      shape && shape.color === feature.color && shapeType(shape, feature.primitives)).length;
    if (count < feature.minimum) {
      errors.push(`Keep ${feature.name}: it needs at least ${feature.minimum} ${feature.color}-colored supported shape${feature.minimum === 1 ? '' : 's'}.`);
    }
  }

  const size = kind.size;
  const validSize = Array.isArray(size) && size.length === 2
    && size.every((value) => typeof value === 'number' && Number.isFinite(value) && value > 0);
  const basketBases = kind.shapes.filter((shape) => {
    const box = shape?.box;
    return shape?.color === spec.basket.color && Array.isArray(box) && box.length === 6
      && box.every(Number.isFinite) && box[3] >= 0 && box[4] >= 0
      && box[5] > 0 && box[5] <= spec.basket.maxThickness;
  });
  if (!validSize || !basketBases.some(({ box }) =>
    box[3] >= size[0] * spec.basket.coverage && box[4] >= size[1] * spec.basket.coverage)) {
    errors.push('Keep a shallow basket base that covers most of the cart footprint. Do not make it a deep solid box.');
  }

  if (validSize) {
    const metalBoxes = kind.shapes
      .filter((shape) => shape?.color === spec.frame.color && Array.isArray(shape.box)
        && shape.box.length === 6 && shape.box.every(Number.isFinite))
      .map((shape) => shape.box);
    const horizontalRails = metalBoxes.filter(([, , z, width, depth, height]) =>
      z >= spec.frame.topMin && width >= size[0] * spec.frame.span
      && depth <= spec.frame.railMax && height > 0);
    const depthRails = metalBoxes.filter(([, , z, width, depth, height]) =>
      z >= spec.frame.topMin && depth >= size[1] * spec.frame.span
      && width <= spec.frame.railMax && height > 0);
    if (horizontalRails.length < 2 || depthRails.length < 2) {
      errors.push('Keep an open basket frame: it needs two long metal rails in each footprint direction.');
    } else {
      const horizontalEdges = new Set(horizontalRails.flatMap(([, v, , , depth]) => [
        v <= size[1] * 0.2 ? 'near' : null,
        v + depth >= size[1] * 0.8 ? 'far' : null,
      ].filter(Boolean)));
      const depthEdges = new Set(depthRails.flatMap(([u, , , width]) => [
        u <= size[0] * 0.2 ? 'left' : null,
        u + width >= size[0] * 0.8 ? 'right' : null,
      ].filter(Boolean)));
      if (!horizontalEdges.has('near') || !horizontalEdges.has('far')
        || !depthEdges.has('left') || !depthEdges.has('right')) {
        errors.push('Place the basket rails on opposite edges so the basket stays open.');
      }
    }
  }

  const wheels = kind.shapes
    .filter((shape) => shape && shape.color === spec.wheel.color && Array.isArray(shape[spec.wheel.primitive]))
    .map((shape) => shape[spec.wheel.primitive])
    .filter((values) => values.length === 5 && values.every(Number.isFinite));
  if (wheels.length >= 4) {
    if (wheels.some(([, , z, radius, height]) =>
      radius <= 0 || height <= 0 || z < 0 || z > spec.wheel.floorMax)) {
      errors.push('Keep all four wheels small and near floor level. Each wheel needs positive radius and height.');
    }
    if (validSize) {
      const [width, depth] = size;
      const corners = new Set();
      for (const [u, v] of wheels) {
        const xSide = u < width * spec.wheel.cornerBand ? 'left'
          : u > width * (1 - spec.wheel.cornerBand) ? 'right' : null;
        const ySide = v < depth * spec.wheel.cornerBand ? 'near'
          : v > depth * (1 - spec.wheel.cornerBand) ? 'far' : null;
        if (xSide && ySide) corners.add(`${xSide}-${ySide}`);
      }
      if (corners.size < 4) {
        errors.push('Place one wheel near each of the four footprint corners.');
      }
    } else {
      errors.push('Keep a two-number positive size so wheel positions can be checked.');
    }
  }
  return errors;
}

function rulesFor(modelId) {
  return constraints[modelId]?.promptRules || [];
}

WS.ModelConstraints = { validate, rulesFor };
})(window.WORKSHOP || (window.WORKSHOP = {}));
