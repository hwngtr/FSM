'use strict';
// Frischemarkt (Lidl/REWE style) procedural riso fixtures, 6-zone floorplan,
// shoplifting catalog (with RF security tags), CCTV cameras, and Staff routes.
(() => {
  const MARKET_KINDS = {
    'gondola-shelf': {
      name: 'gondola-shelf', label: 'low open sightline grocery shelf', place: 'floor',
      size: [2.8, 0.92], height: 1.72, price: [400, 1200],
      colors: { frame: 'charcoal', spine: 'charcoal', priceStrip: 'yellow', cap: 'oak',
                pasta: 'mustard', tins: 'coral', drinks: 'teal', snack: 'orange', box: 'cream' },
      shapes: [
        { box: [0, 0.04, 0, 2.8, 0.84, 0.14], color: 'frame', shadow: true },
        { box: [0.04, 0.42, 0.14, 2.72, 0.08, 1.34], color: 'spine' },
        { box: [0, 0.04, 0.14, 0.06, 0.84, 1.34], color: 'cap' },
        { box: [2.74, 0.04, 0.14, 0.06, 0.84, 1.34], color: 'cap' },
        { box: [0.06, 0.04, 0.54, 2.68, 0.84, 0.05], color: 'frame' },
        { box: [0.06, 0.84, 0.52, 2.68, 0.04, 0.06], color: 'priceStrip' },
        { box: [0.14, 0.14, 0.14, 0.32, 0.42, 0.34], color: 'pasta' },
        { box: [0.60, 0.14, 0.14, 0.32, 0.42, 0.34], color: 'box' },
        { box: [1.06, 0.14, 0.14, 0.32, 0.42, 0.34], color: 'tins' },
        { box: [1.52, 0.14, 0.14, 0.32, 0.42, 0.34], color: 'drinks' },
        { box: [1.98, 0.14, 0.14, 0.32, 0.42, 0.34], color: 'snack' },
        { box: [2.44, 0.14, 0.14, 0.24, 0.42, 0.34], color: 'pasta' },
        { box: [0.06, 0.08, 1.06, 2.68, 0.76, 0.05], color: 'frame' },
        { box: [0.06, 0.80, 1.04, 2.68, 0.04, 0.06], color: 'priceStrip' },
        { box: [0.14, 0.18, 0.14, 0.30, 0.38, 0.36], color: 'drinks' },
        { box: [0.60, 0.18, 0.14, 0.30, 0.38, 0.36], color: 'snack' },
        { box: [1.06, 0.18, 0.14, 0.30, 0.38, 0.36], color: 'box' },
        { box: [1.52, 0.18, 0.14, 0.30, 0.38, 0.36], color: 'tins' },
        { box: [1.98, 0.18, 0.14, 0.30, 0.38, 0.36], color: 'pasta' },
        { box: [2.44, 0.18, 0.14, 0.24, 0.38, 0.36], color: 'drinks' },
        { box: [0, 0.08, 1.46, 2.8, 0.76, 0.05], color: 'cap' },
        { box: [0.20, 0.16, 1.51, 0.40, 0.55, 0.24], color: 'box' },
        { box: [0.80, 0.16, 1.51, 0.40, 0.55, 0.24], color: 'pasta' },
        { box: [1.40, 0.16, 1.51, 0.40, 0.55, 0.24], color: 'tins' },
        { box: [2.00, 0.16, 1.51, 0.40, 0.55, 0.24], color: 'drinks' },
        { pole: [1.40, 0.50, 1.51, 1.40, 0.50, 2.05], color: 'frame', w: 2 },
        { box: [0.74, 0.42, 1.82, 1.32, 0.16, 0.30], color: 'priceStrip' },
        // oak cap board over the spine, reading as wood end cladding at close zoom
        { box: [0.02, 0.36, 1.50, 2.76, 0.14, 0.08], color: 'cap' },
      ],
      reach: { l: 8, t: 9, r: 24, b: 24 },
    },

    'chilled-case': {
      name: 'chilled-case', label: 'glass-door refrigerated cabinet', place: 'floor',
      against: true, size: [2.5, 0.88], height: 2.12, price: [1200, 4000],
      colors: { body: 'white', interior: 'sky', canopy: 'blue', strip: 'yellow',
                silver: 'silver', glass: 'glass', milk: 'white', yoghurt: 'cream',
                meat: 'coral', cheese: 'mustard' },
      shapes: [
        { box: [0, 0, 0, 2.5, 0.84, 2.08], color: 'body', shadow: true },
        { box: [0.08, 0.12, 0.28, 2.34, 0.70, 1.56], color: 'interior' },
        { box: [0.08, 0.14, 0.78, 2.34, 0.66, 0.05], color: 'silver' },
        { box: [0.08, 0.14, 1.32, 2.34, 0.66, 0.05], color: 'silver' },
        // dairy and meat products stacked on the shelves
        { box: [0.18, 0.30, 0.32, 0.30, 0.30, 0.42], color: 'milk' },
        { box: [0.62, 0.30, 0.32, 0.30, 0.30, 0.42], color: 'yoghurt' },
        { box: [1.06, 0.30, 0.32, 0.30, 0.30, 0.42], color: 'cheese' },
        { box: [1.50, 0.30, 0.32, 0.30, 0.30, 0.42], color: 'milk' },
        { box: [1.94, 0.30, 0.30, 0.30, 0.30, 0.42], color: 'yoghurt' },
        { box: [0.18, 0.30, 0.85, 0.44, 0.34, 0.32], color: 'meat' },
        { box: [0.78, 0.30, 0.85, 0.44, 0.34, 0.32], color: 'cheese' },
        { box: [1.38, 0.30, 0.85, 0.44, 0.34, 0.32], color: 'meat' },
        { box: [1.98, 0.30, 0.85, 0.42, 0.34, 0.32], color: 'milk' },
        { box: [0.22, 0.30, 1.40, 0.32, 0.30, 0.38], color: 'cheese' },
        { box: [0.78, 0.30, 1.40, 0.32, 0.30, 0.38], color: 'yoghurt' },
        { box: [1.34, 0.30, 1.40, 0.32, 0.30, 0.38], color: 'meat' },
        { box: [1.90, 0.30, 1.40, 0.32, 0.30, 0.38], color: 'cheese' },
        // glass doors: slim mullions and a horizontal handle
        { box: [0.10, 0.84, 0.28, 0.045, 0.05, 1.56], color: 'glass' },
        { box: [1.24, 0.84, 0.28, 0.045, 0.05, 1.56], color: 'glass' },
        { box: [2.38, 0.84, 0.28, 0.045, 0.05, 1.56], color: 'glass' },
        { box: [1.18, 0.85, 0.95, 0.14, 0.05, 0.06], color: 'silver' },
        // blue canopy with a bright price rail
        { box: [0, 0, 1.88, 2.5, 0.88, 0.20], color: 'canopy' },
        { box: [0, 0.85, 1.84, 2.5, 0.04, 0.07], color: 'strip' },
      ],
      reach: { l: 8, t: 6, r: 24, b: 26 },
    },

    'produce-island': {
      name: 'produce-island', label: 'fresh produce crate island', place: 'floor',
      size: [1.9, 1.25], height: 0.98, price: [200, 800],
      colors: { base: 'oak', bin: 'oak', tag: 'yellow', terracotta: 'tan',
                plum: 'oak', orange: 'orange', green: 'green', coral: 'red' },
      shapes: [
        { box: [0, 0, 0, 1.9, 1.25, 0.58], color: 'base', shadow: true },
        { box: [0.06, 0.06, 0.58, 0.86, 0.54, 0.28], color: 'bin' },
        { box: [0.98, 0.06, 0.58, 0.86, 0.54, 0.28], color: 'terracotta' },
        { box: [0.06, 0.65, 0.58, 0.86, 0.54, 0.28], color: 'yellow' },
        { box: [0.98, 0.65, 0.58, 0.86, 0.54, 0.28], color: 'plum' },
        // Bio bananas, lemons, tomatoes, carrots: fruit heaped over the crate rims
        { ball: [0.35, 0.32, 0.88, 0.14], color: 'yellow' },
        { ball: [0.62, 0.34, 0.88, 0.14], color: 'yellow' },
        { ball: [1.28, 0.32, 0.88, 0.14], color: 'coral' },
        { ball: [1.55, 0.34, 0.88, 0.14], color: 'orange' },
        { ball: [0.38, 0.90, 0.88, 0.14], color: 'green' },
        { ball: [1.35, 0.90, 0.88, 0.14], color: 'coral' },
        { box: [0.20, 0.14, 0.60, 0.30, 0.04, 0.04], color: 'tag' },
        { box: [1.10, 0.14, 0.60, 0.30, 0.04, 0.04], color: 'tag' },
      ],
      reach: { l: 7, t: 5, r: 18, b: 16 },
    },

    'apple-crate': {
      name: 'apple-crate', label: 'low wooden crate of red apples', place: 'floor',
      size: [0.9, 0.65], height: 0.52, price: [30, 140],
      colors: { wood: 'oak', slat: 'tan', apple: 'red', shade: 'coral',
                strip: 'green', tag: 'white' },
      shapes: [
        { box: [0, 0, 0, 0.9, 0.65, 0.12], color: 'wood', shadow: true },
        { box: [0, 0.60, 0.12, 0.9, 0.05, 0.18], color: 'slat' },
        { box: [0, 0, 0.12, 0.9, 0.05, 0.18], color: 'slat' },
        { box: [0, 0.05, 0.12, 0.05, 0.55, 0.18], color: 'slat' },
        { box: [0.85, 0.05, 0.12, 0.05, 0.55, 0.18], color: 'slat' },
        { pole: [0.025, 0.025, 0, 0.025, 0.025, 0.36], color: 'wood', w: 2 },
        { pole: [0.875, 0.025, 0, 0.875, 0.025, 0.36], color: 'wood', w: 2 },
        { pole: [0.025, 0.625, 0, 0.025, 0.625, 0.36], color: 'wood', w: 2 },
        { pole: [0.875, 0.625, 0, 0.875, 0.625, 0.36], color: 'wood', w: 2 },
        // two layers of red apples piled over the rim
        { cyl: [0.18, 0.18, 0.22, 0.10, 0.16], color: 'apple' },
        { cyl: [0.46, 0.17, 0.23, 0.10, 0.16], color: 'shade' },
        { cyl: [0.72, 0.19, 0.22, 0.10, 0.16], color: 'apple' },
        { cyl: [0.18, 0.45, 0.23, 0.10, 0.16], color: 'shade' },
        { cyl: [0.46, 0.46, 0.22, 0.10, 0.16], color: 'apple' },
        { cyl: [0.72, 0.44, 0.23, 0.10, 0.16], color: 'shade' },
        { cyl: [0.32, 0.32, 0.34, 0.09, 0.14], color: 'apple' },
        { cyl: [0.60, 0.31, 0.35, 0.09, 0.14], color: 'shade' },
        // green price strip on the front slat with printed price dots
        { panel: [0.10, 0.65, 0.14, 0.70, 0.10], color: 'strip' },
        { dot: [0.26, 0.655, 0.19], color: 'tag', r: 1.1 },
        { dot: [0.36, 0.655, 0.19], color: 'tag', r: 1.1 },
        { dot: [0.60, 0.655, 0.19], color: 'tag', r: 1.1 },
      ],
      reach: { l: 6, t: 5, r: 14, b: 14 },
    },

    'bakery-rack': {
      name: 'bakery-rack', label: 'SB-Backwaren bread station', place: 'floor',
      against: true, size: [2.0, 0.85], height: 1.92, price: [600, 1800],
      colors: { wood: 'oak', header: 'mustard', bread: 'tan', crust: 'terracotta', strip: 'yellow' },
      shapes: [
        { box: [0, 0, 0, 2.0, 0.82, 1.82], color: 'wood', shadow: true },
        { box: [0, 0, 1.62, 2.0, 0.86, 0.22], color: 'header' },
        { box: [0, 0.86, 1.60, 2.0, 0.04, 0.06], color: 'strip' },
        { box: [0.12, 0.25, 0.45, 0.45, 0.42, 0.18], color: 'bread', soft: true },
        { box: [0.72, 0.25, 0.45, 0.42, 0.42, 0.18], color: 'crust', soft: true },
        { box: [1.32, 0.25, 0.45, 0.42, 0.42, 0.18], color: 'bread', soft: true },
        { box: [0.12, 0.25, 0.98, 0.45, 0.42, 0.18], color: 'crust', soft: true },
        { box: [0.72, 0.25, 0.98, 0.45, 0.42, 0.18], color: 'mustard', soft: true },
        { box: [1.32, 0.25, 0.98, 0.45, 0.42, 0.18], color: 'bread', soft: true },
        { box: [0.16, 0.22, 1.34, 0.40, 0.06, 0.04], color: 'strip' },
        { box: [0.76, 0.22, 1.34, 0.40, 0.06, 0.04], color: 'strip' },
      ],
      reach: { l: 7, t: 5, r: 20, b: 22 },
    },

    'action-table': {
      name: 'action-table', label: 'Aktionsware discount bin', place: 'floor',
      size: [2.1, 1.15], height: 1.70, price: [150, 900],
      colors: { pallet: 'oak', bin: 'blue', carton1: 'tan', carton2: 'mustard',
                sign: 'yellow', charcoal: 'charcoal', stripe: 'coral' },
      shapes: [
        { box: [0, 0, 0, 2.1, 1.15, 0.18], color: 'pallet', shadow: true },
        { box: [0.05, 0.05, 0.18, 2.0, 1.05, 0.52], color: 'bin' },
        { box: [0.05, 0.05, 0.66, 2.0, 1.05, 0.05], color: 'charcoal' },
        { box: [0.14, 0.16, 0.71, 0.48, 0.38, 0.34], color: 'carton1' },
        { box: [0.72, 0.16, 0.71, 0.48, 0.38, 0.34], color: 'carton2' },
        { box: [1.30, 0.16, 0.71, 0.48, 0.38, 0.34], color: 'carton1' },
        { box: [0.14, 0.62, 0.71, 0.48, 0.38, 0.34], color: 'carton2' },
        { box: [0.72, 0.62, 0.71, 0.48, 0.38, 0.34], color: 'carton1' },
        { pole: [1.05, 0.55, 0.73, 1.05, 0.55, 1.54], color: 'charcoal', w: 2 },
        { box: [0.45, 0.45, 1.32, 1.20, 0.16, 0.38], color: 'sign' },
        { box: [0.50, 0.47, 1.12, 1.10, 0.05, 0.08], color: 'stripe' },
      ],
      reach: { l: 7, t: 7, r: 18, b: 18 },
    },

    'liquor-cabinet': {
      name: 'liquor-cabinet', label: 'locked spirits and electronics vitrine', place: 'floor',
      against: true, size: [1.8, 0.75], height: 2.22, price: [800, 3500],
      colors: { frame: 'charcoal', shelf: 'brass', cream: 'cream', glass: 'glass',
                teal: 'teal', walnut: 'walnut', mustard: 'mustard', navy: 'navy',
                coral: 'coral', lock: 'sun' },
      shapes: [
        { box: [0, 0, 0, 1.8, 0.75, 2.12], color: 'frame', shadow: true },
        { box: [0.08, 0.10, 0.25, 1.64, 0.60, 1.65], color: 'cream' },
        { box: [0.08, 0.12, 0.80, 1.64, 0.56, 0.05], color: 'shelf' },
        { box: [0.08, 0.12, 1.35, 1.64, 0.56, 0.05], color: 'shelf' },
        { cyl: [0.36, 0.38, 0.28, 0.11, 0.44], color: 'teal' },
        { cyl: [0.78, 0.38, 0.28, 0.11, 0.44], color: 'walnut' },
        { cyl: [1.20, 0.38, 0.28, 0.11, 0.44], color: 'mustard' },
        { cyl: [0.46, 0.38, 0.85, 0.11, 0.44], color: 'coral' },
        { cyl: [0.96, 0.38, 0.85, 0.11, 0.44], color: 'navy' },
        { cyl: [1.42, 0.38, 0.85, 0.11, 0.44], color: 'brass' },
        { box: [0.22, 0.22, 1.42, 0.52, 0.36, 0.34], color: 'coral' },
        { box: [0.96, 0.22, 1.42, 0.58, 0.36, 0.34], color: 'navy' },
        // locked glass door
        { box: [0.88, 0.72, 0.25, 0.05, 0.05, 1.65], color: 'glass' },
        { dot: [1.70, 0.74, 1.05], color: 'lock', r: 2.8 },
        // red restricted-goods header
        { box: [0, 0, 1.90, 1.8, 0.80, 0.22], color: 'frame' },
        { box: [0.12, 0.02, 1.92, 1.56, 0.72, 0.16], color: 'coral' },
      ],
      reach: { l: 7, t: 7, r: 22, b: 25 },
    },

    'checkout-lane': {
      name: 'checkout-lane', label: 'checkout conveyor and register', place: 'floor',
      size: [2.6, 1.0], height: 1.85, price: [1500, 4500],
      colors: { body: 'blue', belt: 'charcoal', scanner: 'teal', screen: 'yellow',
                silver: 'silver', grocery1: 'mustard', grocery2: 'coral', sign: 'yellow' },
      shapes: [
        { box: [0, 0, 0, 2.6, 0.96, 0.86], color: 'body', shadow: true },
        { box: [0.08, 0.10, 0.86, 1.65, 0.76, 0.06], color: 'belt' },
        { box: [0.32, 0.28, 0.92, 0.32, 0.30, 0.26], color: 'grocery1' },
        { box: [0.90, 0.28, 0.92, 0.30, 0.30, 0.24], color: 'grocery2' },
        { box: [1.78, 0.14, 0.86, 0.42, 0.68, 0.06], color: 'scanner' },
        { box: [1.84, 0.18, 0.92, 0.54, 0.50, 0.66], color: 'silver' },
        { box: [1.90, 0.20, 1.32, 0.42, 0.44, 0.06], color: 'screen' },
        { pole: [2.06, 0.26, 0.92, 2.06, 0.26, 1.52], color: 'charcoal', w: 2 },
        { box: [1.82, 0.16, 1.46, 0.48, 0.30, 0.22], color: 'screen' },
        { box: [2.24, 0.08, 0.86, 0.34, 0.80, 0.08], color: 'silver' },
        { box: [1.66, 0.50, 1.58, 0.74, 0.14, 0.28], color: 'sign' },
      ],
      reach: { l: 8, t: 8, r: 22, b: 18 },
    },

    'eas-gate': {
      name: 'eas-gate', label: 'EAS anti-theft security gate', place: 'floor',
      size: [0.4, 1.6], height: 1.52, price: [900, 2200],
      colors: { pillar: 'silver', core: 'white', led: 'coral', stripe: 'yellow' },
      shapes: [
        { box: [0.05, 0.02, 0, 0.28, 0.14, 1.42], color: 'pillar', shadow: true },
        { box: [0.08, 0.04, 0.18, 0.22, 0.10, 1.05], color: 'core' },
        { dot: [0.19, 0.09, 1.44], color: 'led', r: 3.2 },
        { box: [0.05, 1.42, 0, 0.28, 0.14, 1.42], color: 'pillar', shadow: true },
        { box: [0.08, 1.44, 0.18, 0.22, 0.10, 1.05], color: 'core' },
        { dot: [0.19, 1.49, 1.44], color: 'led', r: 3.2 },
        { box: [0.05, 0.10, 1.40, 0.28, 1.40, 0.12], color: 'pillar' },
        { box: [0.05, 0.10, 1.42, 0.28, 1.36, 0.04], color: 'stripe' },
      ],
      reach: { l: 6, t: 5, r: 16, b: 18 },
    },

    'pallet-stack': {
      name: 'pallet-stack', label: 'Euro-pallet wholesale stack', place: 'floor',
      size: [1.3, 1.1], height: 1.25, price: [80, 400],
      colors: { pallet: 'oak', carton1: 'tan', carton2: 'mustard', band: 'teal' },
      shapes: [
        { box: [0, 0, 0, 1.3, 1.1, 0.14], color: 'pallet', shadow: true },
        { box: [0.06, 0.06, 0.14, 0.58, 0.48, 0.52], color: 'carton1' },
        { box: [0.66, 0.06, 0.14, 0.58, 0.48, 0.52], color: 'carton2' },
        { box: [0.06, 0.56, 0.14, 0.58, 0.48, 0.52], color: 'carton2' },
        { box: [0.66, 0.56, 0.14, 0.58, 0.48, 0.52], color: 'carton1' },
        { box: [0.18, 0.18, 0.66, 0.92, 0.72, 0.52], color: 'band' },
      ],
      reach: { l: 6, t: 5, r: 16, b: 16 },
    },

    'shopping-cart': {
      "name": "shopping-cart",
      "label": "wire shopping trolley",
      "place": "floor",
      "size": [
        1.1,
        1.6
      ],
      "height": 1.05,
      "price": [
        0,
        0
      ],
      "colors": {
        "metal": "silver",
        "basket": "blue",
        "handle": "red",
        "wheel": "black",
        "stripe": "yellow"
      },
      "shapes": [
        {
          "cyl": [
            0.16,
            0.16,
            0,
            0.08,
            0.14
          ],
          "color": "wheel"
        },
        {
          "cyl": [
            0.94,
            0.16,
            0,
            0.08,
            0.14
          ],
          "color": "wheel"
        },
        {
          "cyl": [
            0.16,
            1.44,
            0,
            0.08,
            0.14
          ],
          "color": "wheel"
        },
        {
          "cyl": [
            0.94,
            1.44,
            0,
            0.08,
            0.14
          ],
          "color": "wheel"
        },
        {
          "legs": [
            0.13,
            0.13,
            0.14,
            0.84,
            1.34,
            0.24
          ],
          "color": "metal",
          "t": 0.06
        },
        {
          "box": [
            0.13,
            0.13,
            0.16,
            0.84,
            0.05,
            0.04
          ],
          "color": "metal"
        },
        {
          "box": [
            0.13,
            1.42,
            0.16,
            0.84,
            0.05,
            0.04
          ],
          "color": "metal"
        },
        {
          "box": [
            0.13,
            0.13,
            0.16,
            0.05,
            1.34,
            0.04
          ],
          "color": "metal"
        },
        {
          "box": [
            0.92,
            0.13,
            0.16,
            0.05,
            1.34,
            0.04
          ],
          "color": "metal"
        },
        {
          "box": [
            0.06,
            0.06,
            0.38,
            0.98,
            1.44,
            0.07
          ],
          "color": "basket",
          "shadow": true
        },
        {
          "legs": [
            0.06,
            0.06,
            0.45,
            0.98,
            1.44,
            0.43
          ],
          "color": "metal",
          "t": 0.06
        },
        {
          "box": [
            0.06,
            0.06,
            0.58,
            0.98,
            0.05,
            0.05
          ],
          "color": "metal"
        },
        {
          "box": [
            0.06,
            1.45,
            0.58,
            0.98,
            0.05,
            0.05
          ],
          "color": "metal"
        },
        {
          "box": [
            0.06,
            0.06,
            0.58,
            0.05,
            1.44,
            0.05
          ],
          "color": "metal"
        },
        {
          "box": [
            0.99,
            0.06,
            0.58,
            0.05,
            1.44,
            0.05
          ],
          "color": "metal"
        },
        {
          "box": [
            0.06,
            0.06,
            0.82,
            0.98,
            0.06,
            0.06
          ],
          "color": "metal"
        },
        {
          "box": [
            0.06,
            1.44,
            0.82,
            0.98,
            0.06,
            0.06
          ],
          "color": "metal"
        },
        {
          "box": [
            0.06,
            0.06,
            0.82,
            0.06,
            1.44,
            0.06
          ],
          "color": "metal"
        },
        {
          "box": [
            0.98,
            0.06,
            0.82,
            0.06,
            1.44,
            0.06
          ],
          "color": "metal"
        },
        {
          "box": [
            0.06,
            1.04,
            0.58,
            0.98,
            0.04,
            0.28
          ],
          "color": "metal"
        },
        {
          "pole": [
            0.12,
            1.47,
            0.45,
            0.12,
            1.54,
            1
          ],
          "color": "metal",
          "w": 2
        },
        {
          "pole": [
            0.98,
            1.47,
            0.45,
            0.98,
            1.54,
            1
          ],
          "color": "metal",
          "w": 2
        },
        {
          "box": [
            0.08,
            1.48,
            0.97,
            0.94,
            0.1,
            0.08
          ],
          "color": "handle"
        }
      ],
      "reach": {
        "l": 8,
        "t": 8,
        "r": 18,
        "b": 18
      }
    },

    'hand-basket': {
      name: 'hand-basket', label: 'yellow shopping basket', place: 'floor',
      size: [0.7, 0.5], height: 0.42, price: [0, 0],
      colors: { body: 'yellow', rim: 'charcoal' },
      shapes: [
        { box: [0, 0, 0, 0.7, 0.5, 0.24], color: 'body', shadow: true },
        { box: [0, 0, 0.24, 0.7, 0.5, 0.04], color: 'rim' },
        { pole: [0.16, 0.25, 0.28, 0.30, 0.25, 0.42], color: 'rim', w: 1.6 },
        { pole: [0.54, 0.25, 0.28, 0.40, 0.25, 0.42], color: 'rim', w: 1.6 },
      ],
      reach: { l: 6, t: 6, r: 12, b: 12 },
    },

    'pfand-machine': {
      name: 'pfand-machine', label: 'reverse vending bottle return', place: 'floor',
      against: true, size: [1.2, 0.8], height: 1.95, price: [0, 0],
      colors: { body: 'sun', face: 'charcoal', slot: 'black', screen: 'teal', bottle: 'glass' },
      shapes: [
        { box: [0, 0, 0, 1.2, 0.8, 1.92], color: 'body', shadow: true },
        { box: [0.10, 0.78, 0.30, 1.0, 0.05, 1.05], color: 'face' },
        { box: [0.22, 0.80, 1.30, 0.76, 0.03, 0.26], color: 'screen' },
        { box: [0.30, 0.80, 0.52, 0.60, 0.03, 0.14], color: 'slot' },
        { cyl: [0.40, 0.40, 0.62, 0.13, 0.42], color: 'bottle' },
        { dot: [1.02, 0.82, 0.80], color: 'teal', r: 2.4 },
        { box: [0, 0, 1.92, 1.2, 0.84, 0.12], color: 'sun' },
      ],
      reach: { l: 7, t: 6, r: 18, b: 20 },
    },

    'aisle-sign': {
      name: 'aisle-sign', label: 'hanging aisle number sign', place: 'floor',
      size: [0.1, 0.1], height: 2.5, price: [0, 0],
      colors: { pole: 'silver', board: 'yellow', edge: 'blue' },
      shapes: [
        { pole: [0, 0, 0, 0, 0, 2.35], color: 'pole', w: 2 },
        { box: [0.0, 0.0, 2.10, 1.30, 0.10, 0.46], color: 'board' },
        { box: [0.0, 0.0, 2.04, 1.30, 0.12, 0.06], color: 'edge' },
      ],
      reach: { l: 14, t: 8, r: 14, b: 10 },
    },

    'store-sign': {
      name: 'store-sign', label: 'market wall sign', place: 'wall',
      size: [1.6, 0.08], z: 1.95, price: [0, 0],
      colors: { panel: 'red', disc: 'white', edge: 'sun' },
      shapes: [
        { box: [0, 0, 0, 1.6, 0.06, 0.62], color: 'panel' },
        { cyl: [0.50, 0.03, 0.12, 0.20, 0.40], color: 'disc' },
        { box: [0.86, 0.03, 0.18, 0.56, 0.03, 0.07], color: 'edge' },
        { box: [0.86, 0.03, 0.34, 0.44, 0.03, 0.07], color: 'edge' },
      ],
      reach: { l: 8, t: 6, r: 8, b: 8 },
    },
    'rewe-arch': {
      name: 'rewe-arch', label: 'illuminated red entrance portal', place: 'floor',
      size: [2.6, 0.5], height: 2.8, price: [0, 0],
      colors: { red: 'red', light: 'sun', trim: 'white', dark: 'charcoal' },
      shapes: [
        { box: [0, 0, 0, 0.22, 0.5, 2.5], color: 'red', shadow: true },
        { box: [2.38, 0, 0, 0.22, 0.5, 2.5], color: 'red', shadow: true },
        { box: [0, 0.05, 2.35, 2.6, 0.40, 0.28], color: 'red' },
        { box: [0.10, 0.05, 2.20, 2.40, 0.34, 0.08], color: 'light' },
        { box: [0.30, 0.06, 2.40, 2.00, 0.30, 0.10], color: 'trim' },
        { box: [0.55, 0.02, 1.92, 1.50, 0.12, 0.30], color: 'trim' },
        { glow: [1.30, 0.25, 2.16], r: 1.7, color: 'light', tone: 0.5 },
      ],
      reach: { l: 10, t: 10, r: 10, b: 10 },
    },

    'coffee-counter': {
      name: 'coffee-counter', label: 'Coffee-to-Go station', place: 'floor',
      size: [1.4, 0.8], height: 1.65, price: [0, 0],
      colors: { counter: 'red', top: 'white', machine: 'charcoal', cup: 'cream', sign: 'sun' },
      shapes: [
        { box: [0, 0, 0, 1.4, 0.8, 1.05], color: 'counter', shadow: true },
        { box: [0, 0, 1.05, 1.4, 0.8, 0.08], color: 'top' },
        { box: [0.18, 0.18, 1.13, 0.52, 0.44, 0.42], color: 'machine' },
        { box: [0.26, 0.24, 1.30, 0.36, 0.28, 0.06], color: 'sign' },
        { cyl: [0.95, 0.28, 1.13, 0.09, 0.20], color: 'cup' },
        { cyl: [1.18, 0.28, 1.13, 0.09, 0.20], color: 'cup' },
        { box: [0.18, 0.20, 1.48, 1.04, 0.12, 0.20], color: 'sign' },
        { pole: [1.10, 0.40, 1.13, 1.10, 0.40, 1.55], color: 'charcoal', w: 1.6 },
      ],
      reach: { l: 7, t: 8, r: 12, b: 12 },
    },

    'service-counter': {
      name: 'service-counter', label: 'staffed fresh counter with striped awning', place: 'floor',
      size: [2.0, 0.9], height: 1.62, price: [0, 0],
      colors: { base: 'white', glass: 'glass', red: 'red', cream: 'white',
                meat: 'coral', cheese: 'mustard', fish: 'silver', tray: 'tan' },
      shapes: [
        { box: [0, 0, 0, 2.0, 0.9, 1.12], color: 'base', shadow: true },
        { box: [0.08, 0.82, 0.30, 1.84, 0.05, 0.72], color: 'glass' },
        { box: [0.16, 0.20, 1.12, 0.50, 0.46, 0.10], color: 'tray' },
        { box: [0.76, 0.20, 1.12, 0.50, 0.46, 0.10], color: 'tray' },
        { box: [1.36, 0.20, 1.12, 0.50, 0.46, 0.10], color: 'tray' },
        { box: [0.20, 0.26, 1.22, 0.42, 0.32, 0.12], color: 'meat' },
        { box: [0.80, 0.26, 1.22, 0.42, 0.32, 0.12], color: 'cheese' },
        { box: [1.40, 0.26, 1.22, 0.42, 0.32, 0.12], color: 'fish' },
        { pole: [0.06, 0.04, 0.60, 0.06, 0.04, 1.52], color: 'charcoal', w: 1.8 },
        { pole: [1.94, 0.04, 0.60, 1.94, 0.04, 1.52], color: 'charcoal', w: 1.8 },
        { box: [0, 0.04, 1.44, 0.50, 0.86, 0.07], color: 'red' },
        { box: [0.50, 0.04, 1.44, 0.50, 0.86, 0.07], color: 'cream' },
        { box: [1.00, 0.04, 1.44, 0.50, 0.86, 0.07], color: 'red' },
        { box: [1.50, 0.04, 1.44, 0.50, 0.86, 0.07], color: 'cream' },
      ],
      reach: { l: 8, t: 9, r: 18, b: 16 },
    },

    'self-checkout': {
      name: 'self-checkout', label: 'self-checkout terminal with receipt gate', place: 'floor',
      size: [1.1, 0.95], height: 1.95, price: [0, 0],
      colors: { body: 'blue', screen: 'teal', scanner: 'charcoal', light: 'sun', post: 'silver' },
      shapes: [
        { box: [0, 0, 0, 0.72, 0.90, 1.32], color: 'body', shadow: true },
        { box: [0.04, 0.06, 0.78, 0.64, 0.06, 0.50], color: 'scanner' },
        { pole: [0.36, 0.20, 1.32, 0.36, 0.20, 1.76], color: 'charcoal', w: 2 },
        { box: [0.10, 0.08, 1.56, 0.52, 0.16, 0.34], color: 'screen' },
        { box: [0.20, 0.10, 1.42, 0.32, 0.05, 0.08], color: 'light' },
        { box: [0.80, 0.02, 0, 0.10, 0.10, 1.42], color: 'post', shadow: true },
        { box: [0.80, 0.82, 0, 0.10, 0.10, 1.42], color: 'post', shadow: true },
        { box: [0.80, 0.02, 1.36, 0.10, 0.90, 0.08], color: 'post' },
        { dot: [0.86, 0.07, 1.40], color: 'light', r: 2.6 },
      ],
      reach: { l: 7, t: 9, r: 14, b: 14 },
    },

    'impulse-shelf': {
      name: 'impulse-shelf', label: 'checkout impulse module', place: 'floor',
      size: [0.9, 0.45], height: 1.25, price: [0, 0],
      colors: { frame: 'charcoal', strip: 'yellow', gum: 'coral', chocolate: 'walnut',
                batteries: 'sun', mint: 'teal' },
      shapes: [
        { box: [0, 0, 0, 0.9, 0.45, 0.12], color: 'frame', shadow: true },
        { box: [0.04, 0.06, 0.36, 0.82, 0.34, 0.05], color: 'frame' },
        { box: [0.04, 0.06, 0.86, 0.82, 0.34, 0.05], color: 'frame' },
        { box: [0.04, 0.38, 0.34, 0.82, 0.03, 0.05], color: 'strip' },
        { box: [0.04, 0.38, 0.84, 0.82, 0.03, 0.05], color: 'strip' },
        { box: [0.10, 0.10, 0.42, 0.14, 0.24, 0.26], color: 'gum' },
        { box: [0.32, 0.10, 0.42, 0.14, 0.24, 0.26], color: 'chocolate' },
        { box: [0.54, 0.10, 0.42, 0.14, 0.24, 0.26], color: 'batteries' },
        { box: [0.74, 0.10, 0.42, 0.10, 0.24, 0.26], color: 'mint' },
        { box: [0.10, 0.10, 0.92, 0.18, 0.24, 0.24], color: 'chocolate' },
        { box: [0.38, 0.10, 0.92, 0.18, 0.24, 0.24], color: 'gum' },
        { box: [0.66, 0.10, 0.92, 0.18, 0.24, 0.24], color: 'batteries' },
      ],
      reach: { l: 6, t: 7, r: 12, b: 12 },
    },

    'freezer-chest': {
      name: 'freezer-chest', label: 'chest freezer with glass lid', place: 'floor',
      size: [1.6, 0.95], height: 1.05, price: [0, 0],
      colors: { body: 'blue', lid: 'glass', frame: 'silver', ice: 'sky',
                pizza: 'mustard', icecream: 'pink' },
      shapes: [
        { box: [0, 0, 0, 1.6, 0.95, 0.82], color: 'body', shadow: true },
        { box: [0.06, 0.08, 0.82, 1.48, 0.79, 0.06], color: 'ice' },
        { box: [0.14, 0.20, 0.88, 0.42, 0.30, 0.12], color: 'pizza' },
        { box: [0.66, 0.20, 0.88, 0.42, 0.30, 0.12], color: 'icecream' },
        { box: [1.10, 0.20, 0.88, 0.38, 0.30, 0.12], color: 'pizza' },
        { box: [0, 0, 0.98, 1.6, 0.95, 0.07], color: 'lid' },
        { box: [0, 0, 0.90, 1.6, 0.06, 0.10], color: 'frame' },
        { box: [0, 0.89, 0.90, 1.6, 0.06, 0.10], color: 'frame' },
      ],
      reach: { l: 7, t: 7, r: 14, b: 14 },
    },

    'beverage-shelf': {
      name: 'beverage-shelf', label: 'beverage and wine aisle', place: 'floor',
      size: [2.2, 0.85], height: 1.90, price: [0, 0],
      colors: { frame: 'charcoal', rail: 'yellow', water: 'sky', cola: 'charcoal',
                juice: 'orange', wine: 'plum', beer: 'mustard' },
      shapes: [
        { box: [0, 0.04, 0, 2.2, 0.80, 0.14], color: 'frame', shadow: true },
        { box: [0, 0.04, 0.62, 2.2, 0.80, 0.05], color: 'frame' },
        { box: [0, 0.80, 0.60, 2.2, 0.04, 0.06], color: 'rail' },
        { box: [0, 0.04, 1.20, 2.2, 0.80, 0.05], color: 'frame' },
        { box: [0, 0.80, 1.18, 2.2, 0.04, 0.06], color: 'rail' },
        { box: [0, 0.04, 1.78, 2.2, 0.80, 0.06], color: 'frame' },
        { cyl: [0.18, 0.38, 0.14, 0.11, 0.44], color: 'water' },
        { cyl: [0.62, 0.38, 0.14, 0.11, 0.44], color: 'cola' },
        { cyl: [1.06, 0.38, 0.14, 0.11, 0.44], color: 'juice' },
        { cyl: [1.50, 0.38, 0.14, 0.11, 0.44], color: 'beer' },
        { cyl: [0.26, 0.38, 0.68, 0.11, 0.48], color: 'wine' },
        { cyl: [0.78, 0.38, 0.68, 0.11, 0.48], color: 'water' },
        { cyl: [1.30, 0.38, 0.68, 0.11, 0.48], color: 'wine' },
        { cyl: [1.82, 0.38, 0.68, 0.11, 0.48], color: 'juice' },
        { box: [0.20, 0.30, 1.26, 0.40, 0.34, 0.42], color: 'beer' },
        { box: [0.80, 0.30, 1.26, 0.40, 0.34, 0.42], color: 'wine' },
        { box: [1.40, 0.30, 1.26, 0.40, 0.34, 0.42], color: 'water' },
      ],
      reach: { l: 8, t: 8, r: 20, b: 18 },
    },

    'bistro-counter': {
      name: 'bistro-counter', label: 'Vorkassenzone snack bistro', place: 'floor',
      size: [1.8, 0.9], height: 1.55, price: [0, 0],
      colors: { counter: 'red', top: 'white', machine: 'charcoal', stool: 'tan',
                cup: 'cream', sign: 'sun' },
      shapes: [
        { box: [0, 0, 0, 1.8, 0.9, 1.12], color: 'counter', shadow: true },
        { box: [0, 0, 1.12, 1.8, 0.9, 0.08], color: 'top' },
        { box: [0.16, 0.16, 1.20, 0.44, 0.40, 0.38], color: 'machine' },
        { cyl: [0.86, 0.28, 1.20, 0.09, 0.20], color: 'cup' },
        { cyl: [1.14, 0.28, 1.20, 0.09, 0.20], color: 'cup' },
        { box: [0.20, 0.20, 1.44, 1.40, 0.12, 0.22], color: 'sign' },
        { cyl: [0.40, 1.05, 0, 0.20, 0.62], color: 'stool' },
        { cyl: [1.30, 1.05, 0, 0.20, 0.62], color: 'stool' },
      ],
      reach: { l: 8, t: 8, r: 16, b: 16 },
    },

    'deli-counter': {
      name: 'deli-counter', label: 'staffed deli and cold cuts counter', place: 'floor',
      size: [1.8, 0.9], height: 1.52, price: [600, 1800],
      colors: { base: 'white', glass: 'glass', trim: 'coral', tray: 'silver', ham: 'coral', cheese: 'mustard' },
      shapes: [
        { box: [0, 0, 0, 1.8, 0.86, 1.40], color: 'base', shadow: true },
        { box: [0.08, 0.10, 0.88, 1.64, 0.64, 0.48], color: 'glass' },
        { box: [0, 0.86, 0.86, 1.8, 0.06, 0.10], color: 'trim' },
        { box: [0.18, 0.18, 1.42, 0.38, 0.40, 0.28], color: 'ham' },
        { box: [0.66, 0.18, 1.42, 0.38, 0.40, 0.28], color: 'cheese' },
        { box: [1.14, 0.18, 1.42, 0.38, 0.40, 0.28], color: 'tray' },
      ], reach: { l: 8, t: 10, r: 16, b: 16 },
    },

    'wine-rack': {
      name: 'wine-rack', label: 'tall wine and prosecco rack', place: 'floor', against: true,
      size: [1.6, 0.6], height: 1.95, price: [500, 1600],
      colors: { frame: 'charcoal', rail: 'brass', red: 'plum', white: 'mustard', rose: 'coral' },
      shapes: [
        { box: [0, 0, 0, 1.6, 0.58, 1.88], color: 'frame', shadow: true },
        { box: [0.06, 0.06, 0.52, 1.48, 0.06, 0.10], color: 'rail' },
        { box: [0.06, 0.06, 1.06, 1.48, 0.06, 0.10], color: 'rail' },
        { cyl: [0.22, 0.14, 0.58, 0.07, 0.44], color: 'red' },
        { cyl: [0.52, 0.14, 0.58, 0.07, 0.44], color: 'white' },
        { cyl: [0.82, 0.14, 0.58, 0.07, 0.44], color: 'red' },
        { cyl: [1.12, 0.14, 0.58, 0.07, 0.44], color: 'rose' },
        { cyl: [0.22, 0.14, 1.12, 0.07, 0.44], color: 'white' },
        { cyl: [0.52, 0.14, 1.12, 0.07, 0.44], color: 'red' },
        { cyl: [0.82, 0.14, 1.12, 0.07, 0.44], color: 'rose' },
        { cyl: [1.12, 0.14, 1.12, 0.07, 0.44], color: 'white' },
      ], reach: { l: 8, t: 10, r: 14, b: 14 },
    },

    'freezer-wall': {
      name: 'freezer-wall', label: 'full-height glass-door freezer wall', place: 'floor', against: true,
      size: [2.4, 0.7], height: 2.05, price: [1600, 4200],
      colors: { body: 'blue', ice: 'sky', glass: 'glass', rail: 'silver', food: 'cream' },
      shapes: [
        { box: [0, 0, 0, 2.4, 0.66, 2.00], color: 'body', shadow: true },
        { box: [0.08, 0.08, 0.30, 2.24, 0.50, 1.54], color: 'ice' },
        { box: [0.10, 0.10, 0.84, 2.20, 0.46, 0.06], color: 'glass' },
        { box: [0.80, 0.10, 0.30, 0.06, 0.46, 1.54], color: 'rail' },
        { box: [1.56, 0.10, 0.30, 0.06, 0.46, 1.54], color: 'rail' },
        { box: [0.18, 0.20, 0.42, 0.44, 0.30, 0.34], color: 'food' },
        { box: [1.00, 0.20, 0.42, 0.44, 0.30, 0.34], color: 'food' },
        { box: [1.76, 0.20, 0.42, 0.44, 0.30, 0.34], color: 'food' },
      ], reach: { l: 8, t: 10, r: 20, b: 14 },
    },

    'pallet-cage': {
      name: 'pallet-cage', label: 'wire mesh back-of-house pallet cage', place: 'floor',
      size: [1.2, 1.2], height: 1.70, price: [200, 900],
      colors: { mesh: 'silver', band: 'teal', base: 'charcoal', goods: 'oak' },
      shapes: [
        { box: [0, 0, 0, 1.2, 1.16, 0.14], color: 'base', shadow: true },
        { box: [0, 0, 0.16, 0.06, 1.16, 1.04], color: 'mesh' },
        { box: [1.14, 0, 0.16, 0.06, 1.16, 1.04], color: 'mesh' },
        { box: [0, 0, 1.10, 1.2, 1.16, 0.06], color: 'mesh' },
        { box: [0.10, 0.60, 0.20, 1.0, 0.10, 0.90], color: 'band' },
        { box: [0.22, 0.12, 0.28, 0.72, 0.48, 0.66], color: 'goods' },
      ], reach: { l: 10, t: 12, r: 14, b: 14 },
    },

    'crate-tower': {
      name: 'crate-tower', label: 'stacked returnable beverage crates', place: 'floor',
      size: [1.3, 1.1], height: 1.62, price: [240, 1000],
      colors: { crate: 'blue', label: 'mustard', cap: 'orange', pallet: 'oak' },
      shapes: [
        { box: [0, 0, 0, 1.3, 1.06, 0.10], color: 'pallet', shadow: true },
        { box: [0.06, 0.10, 0.12, 1.18, 0.44, 0.90], color: 'crate' },
        { box: [0.06, 0.56, 0.12, 1.18, 0.44, 0.90], color: 'crate' },
        { box: [0.20, 0.24, 1.02, 0.88, 0.10, 0.06], color: 'label' },
        { box: [0.20, 0.70, 1.02, 0.88, 0.10, 0.06], color: 'cap' },
      ], reach: { l: 10, t: 12, r: 14, b: 14 },
    },

    'floral-stand': {
      name: 'floral-stand', label: 'bucket of cut flowers', place: 'floor',
      size: [0.8, 0.8], height: 1.30, price: [80, 400],
      colors: { bucket: 'oak', stem: 'green', bloom: 'coral', tag: 'sun' },
      shapes: [
        { cyl: [0.40, 0.02, 0.40, 0.34, 0.52], color: 'bucket', shadow: true },
        { pole: [0.40, 0.50, 0.40, 0.40, 0.50, 1.24], color: 'stem', w: 1.5 },
        { cyl: [0.40, 1.24, 0.40, 0.22, 0.14], color: 'bloom' },
        { box: [0.44, 0.20, 0.72, 0.28, 0.16, 0.04], color: 'tag' },
      ], reach: { l: 8, t: 12, r: 12, b: 12 },
    },

    'seasonal-display': {
      name: 'seasonal-display', label: 'seasonal octabin promotion', place: 'floor',
      size: [1.8, 1.2], height: 1.28, price: [180, 800],
      colors: { bin: 'oak', hot: 'coral', cool: 'mustard', accent: 'teal' },
      shapes: [
        { box: [0, 0, 0, 1.8, 0.66, 1.14], color: 'bin', shadow: true },
        { box: [0.14, 0.66, 0.16, 1.52, 0.18, 0.82], color: 'hot' },
        { box: [0.34, 0.84, 0.30, 1.12, 0.18, 0.60], color: 'cool' },
        { box: [0.58, 1.02, 0.46, 0.64, 0.20, 0.34], color: 'accent' },
      ], reach: { l: 10, t: 12, r: 14, b: 14 },
    },

    'dump-bin': {
      name: 'dump-bin', label: 'cardboard discard bin', place: 'floor',
      size: [1.4, 0.9], height: 1.10, price: [60, 300],
      colors: { bin: 'blue', carton: 'tan', sign: 'sun' },
      shapes: [
        { box: [0, 0, 0, 1.4, 0.84, 0.86], color: 'bin', shadow: true },
        { box: [0.12, 0.84, 0.10, 1.16, 0.10, 0.66], color: 'carton' },
        { box: [0.24, 0.94, 0.18, 0.92, 0.10, 0.50], color: 'carton' },
        { box: [0.20, 0.44, 0.86, 1.0, 0.18, 0.04], color: 'sign' },
      ], reach: { l: 8, t: 10, r: 14, b: 12 },
    },

    'hand-wash': {
      name: 'hand-wash', label: 'hygiene and hand wash station', place: 'floor', against: true,
      size: [0.7, 0.6], height: 1.60, price: [120, 500],
      colors: { body: 'white', tap: 'silver', mirror: 'teal', soap: 'coral' },
      shapes: [
        { box: [0, 0, 0, 0.7, 0.86, 0.56], color: 'body', shadow: true },
        { box: [0.10, 0.86, 0.10, 0.50, 0.70, 0.08], color: 'mirror' },
        { cyl: [0.35, 0.94, 0.40, 0.05, 0.30], color: 'tap' },
        { cyl: [0.50, 0.90, 0.46, 0.09, 0.12], color: 'soap' },
      ], reach: { l: 8, t: 10, r: 12, b: 12 },
    },
  };

  // REWE-style guided-path floor plan. Entrance at the LEFT with a red illuminated arch;
  // produce primes the welcome; the loop runs counter-clockwise through breakfast, dry goods,
  // dairy/meat on the right wall, beverages at the back, frozen, then the checkout zone at the
  // far end. The exit is separate from the entrance and sits beside the EAS gate.
  const MARKET_HOUSE = {
    rooms: [
      { id: 'r1', type: 'entrance', name: 'Entrance · Obst & Gemüse · Pfand', at: [0, 0], w: 9, d: 9,
        walls: { ink: 'coral', tone: 0.20 }, floor: { style: 'tiles', ink: 'teal', tone: 0.26, ink2: 'coral', tone2: 0.07 },
        windows: [{ side: 'nw', pos: 1.4, w: 2.6, h: 1.6 }], outlets: [], bulb: { side: 'ne', pos: 4.5 }, door: { side: 'nw', pos: 4.5 } },
      { id: 'r2', type: 'breakfast', name: 'Frühstück, Backwaren & Trockenwaren', at: [1, 0], w: 9, d: 9,
        walls: { ink: 'sun', tone: 0.22 }, floor: { style: 'planks', ink: 'sun', tone: 0.34 }, windows: [], outlets: [], bulb: { side: 'ne', pos: 4.5 } },
      { id: 'r3', type: 'dairy', name: 'Kühlregal & Frischetheken', at: [2, 0], w: 9, d: 9,
        walls: { ink: 'blue', tone: 0.18, style: 'tile' }, floor: { style: 'tiles', ink: 'blue', tone: 0.20, ink2: 'teal', tone2: 0.05 }, windows: [], outlets: [], bulb: { side: 'ne', pos: 4.5 } },
      { id: 'r4', type: 'beverages', name: 'Getränkemarkt & Wein (Back)', at: [0, 1], w: 9, d: 9,
        walls: { ink: 'navy', tone: 0.26 }, floor: { style: 'concrete', ink: 'blue', tone: 0.26, ink2: 'navy', tone2: 0.06 }, windows: [], outlets: [], bulb: { side: 'ne', pos: 4.5 } },
      { id: 'r5', type: 'frozen', name: 'Drogerie & Tiefkühl', at: [1, 1], w: 9, d: 9,
        walls: { ink: 'teal', tone: 0.22 }, floor: { style: 'tiles', ink: 'teal', tone: 0.12 }, windows: [], outlets: [], bulb: { side: 'ne', pos: 4.5 } },
      { id: 'r6', type: 'checkout', name: 'Kassenzone · SCO · Vorkassen-Bistro', at: [3, 2], w: 9, d: 9,
        walls: { ink: 'coral', tone: 0.22 }, floor: { style: 'checker', ink: 'sun', tone: 0.14, ink2: 'blue', tone2: 0.18 },
        windows: [{ side: 'ne', pos: 1.8, w: 3.6, h: 1.6 }], outlets: [], bulb: { side: 'ne', pos: 4.5 } },

      { id: 'r7', type: 'floral', name: 'Floral & Saison', at: [3, 0], w: 9, d: 9,
        walls: { ink: 'coral', tone: 0.20 }, floor: { style: 'planks', ink: 'sun', tone: 0.24 }, windows: [], outlets: [], bulb: { side: 'ne', pos: 4.5 } },
      { id: 'r8', type: 'stockroom', name: 'Lager & BOH', at: [3, 1], w: 9, d: 9,
        walls: { ink: 'teal', tone: 0.22 }, floor: { style: 'concrete', ink: 'blue', tone: 0.18 }, windows: [], outlets: [], bulb: { side: 'ne', pos: 4.5 } },
      { id: 'r9', type: 'backshop', name: 'Backshop', at: [0, 2], w: 9, d: 9,
        walls: { ink: 'mustard', tone: 0.22 }, floor: { style: 'planks', ink: 'sun', tone: 0.30 }, windows: [], outlets: [], bulb: { side: 'ne', pos: 4.5 } },
      { id: 'r10', type: 'wet', name: 'Fleisch & Fisch Vorbereitung', at: [1, 2], w: 9, d: 9,
        walls: { ink: 'plum', tone: 0.20 }, floor: { style: 'tiles', ink: 'blue', tone: 0.16 }, windows: [], outlets: [], bulb: { side: 'ne', pos: 4.5 } },
      { id: 'r11', type: 'wine', name: 'Getränke & Wein Annexe', at: [2, 2], w: 9, d: 9,
        walls: { ink: 'navy', tone: 0.24 }, floor: { style: 'concrete', ink: 'blue', tone: 0.20 }, windows: [], outlets: [], bulb: { side: 'ne', pos: 4.5 } },
      { id: 'r12', type: 'staff', name: 'Personal & Pausenraum', at: [2, 1], w: 9, d: 9,
        walls: { ink: 'teal', tone: 0.20 }, floor: { style: 'tiles', ink: 'teal', tone: 0.14 }, windows: [], outlets: [], bulb: { side: 'ne', pos: 4.5 } },
    ],
    items: [
      // r1 — fresh welcome: red portal, produce islands, Pfand, trolleys and baskets, coffee.
      { id: 'd_arch', kind: 'rewe-arch', name: 'Illuminated red REWE entrance arch', price: 0, room: 'r1', at: { i: 0.3, j: 3.2, face: 'nw' } },
      { id: 'm_produce1', kind: 'produce-island', name: 'REWE Bio Bananas & Carrots Crate', price: 22, room: 'r1', at: { i: 2.8, j: 1.2, face: 'ne' } },
      { id: 'd_pfand', kind: 'pfand-machine', name: 'Pfand Bottle Return Machine', price: 0, room: 'r1', at: { i: 0.3, j: 6.6, face: 'nw' } },
      { id: 'd_cart1', kind: 'shopping-cart', name: 'Shopping Trolley', price: 0, room: 'r1', at: { i: 5.6, j: 2.0, face: 'ne' } },

      // r2 — breakfast, bakery, and low 1.6 m dry-goods shelves; pasta sits beside sauces.
      { id: 'm_bakery', kind: 'bakery-rack', name: 'SB-Backwaren: Bio Krustenbrot & Brezeln', price: 14, room: 'r2', at: { i: 0.2, j: 0.6, face: 'ne' } },
      { id: 'm_gondola1', kind: 'gondola-shelf', name: 'Frühstück: REWE Bio Müsli & Lavazza Kaffee', price: 28, room: 'r2', at: { i: 2.2, j: 2.2, face: 'ne' } },
      { id: 'm_gondola2', kind: 'gondola-shelf', name: 'Trockenware: REWE Bio Fusilli & Spaghetti', price: 32, room: 'r2', at: { i: 2.2, j: 5.4, face: 'ne' } },
      { id: 'm_endcap1', kind: 'pallet-stack', name: 'Energy Drink Endcap Display', price: 36, room: 'r2', at: { i: 6.6, j: 1.6, face: 'nw' } },

      // r3 — dairy and self-service meat coolers against the RIGHT wall, plus staffed counters.
      { id: 'm_chill1', kind: 'chilled-case', name: 'Frischetheke: Dry-Aged Black Angus Ribeye', price: 46, room: 'r3', at: { i: 5.6, j: 0.0, face: 'nw' } },
      { id: 'm_chill2', kind: 'chilled-case', name: 'Kühlregal: Wild Smoked Salmon & Caviar', price: 34, room: 'r3', at: { i: 5.6, j: 5.4, face: 'nw' } },
      { id: 'm_cheese', kind: 'produce-island', name: 'REWE Bio Joghurt & Parmigiano Island', price: 29, room: 'r3', at: { i: 2.0, j: 5.0, face: 'ne' } },
      { id: 'd_meat', kind: 'service-counter', name: 'Bedientheke Fleisch & Wurst', price: 0, room: 'r3', at: { i: 0.4, j: 1.0, face: 'ne' } },
      { id: 'd_delifr', kind: 'service-counter', name: 'Käse- & Feinkosttheke', price: 0, room: 'r3', at: { i: 0.4, j: 2.7, face: 'ne' } },
      { id: 'd_fish', kind: 'service-counter', name: 'Fischtheke mit Marktdach', price: 0, room: 'r3', at: { i: 0.4, j: 7.0, face: 'ne' } },

      // r4 — beverages and wine at the BACK, with wholesale pallets and the locked spirits case.
      { id: 'd_bev1', kind: 'beverage-shelf', name: 'Wasser, Cola & Säfte', price: 0, room: 'r4', at: { i: 0.6, j: 0.0, face: 'ne' } },
      { id: 'm_spirits', kind: 'liquor-cabinet', name: 'Spirituosen Vitrine: 18yr Single Malt & Champagne', price: 68, room: 'r4', at: { i: 7.2, j: 1.0, face: 'nw' } },
      { id: 'm_pallet1', kind: 'pallet-stack', name: 'Wholesale Champagne Case', price: 54, room: 'r4', at: { i: 2.4, j: 2.0, face: 'ne' } },
      { id: 'm_pallet2', kind: 'pallet-stack', name: 'REWE Bio Milch & Chocolate Cartons', price: 30, room: 'r4', at: { i: 4.0, j: 6.2, face: 'ne' } },

      // r5 — drugstore and freezers immediately before the checkout.
      { id: 'd_freezer1', kind: 'freezer-chest', name: 'Tiefkühl Pizza & Eis', price: 0, room: 'r5', at: { i: 0.6, j: 1.4, face: 'ne' } },
      { id: 'm_aktion1', kind: 'action-table', name: 'Aktionsware: 20V Cordless Hammer Drill', price: 58, room: 'r5', at: { i: 3.8, j: 2.0, face: 'ne' } },
      { id: 'm_aktion2', kind: 'action-table', name: 'Aktionsware: ANC Wireless Headphones', price: 44, room: 'r5', at: { i: 3.8, j: 6.2, face: 'ne' } },

      // r6 — checkout zone: staffed lanes, self-checkout, impulse modules, bistro, EAS exit.
      { id: 'm_checkout1', kind: 'checkout-lane', name: 'Kasse 1 & Razor Blade Display', price: 38, room: 'r6', at: { i: 0.8, j: 1.2, face: 'ne' } },
      { id: 'm_checkout2', kind: 'checkout-lane', name: 'Kasse 2 Express Lane', price: 25, room: 'r6', at: { i: 0.8, j: 5.4, face: 'ne' } },
      { id: 'd_sco1', kind: 'self-checkout', name: 'Self-Checkout Terminal 1', price: 0, room: 'r6', at: { i: 4.2, j: 1.4, face: 'ne' } },
      { id: 'd_imp1', kind: 'impulse-shelf', name: 'Kassen Süßwaren: Kaugummi & Schokolade', price: 0, room: 'r6', at: { i: 3.0, j: 3.0, face: 'ne' } },
      { id: 'm_eas1', kind: 'eas-gate', name: 'RF Anti-Theft Exit Scanner Gate', price: 0, room: 'r6', at: { i: 7.2, j: 3.2, face: 'ne' } },
      { id: 'm_server', kind: 'server-rack', name: 'Security Office: EAS Deactivator & CCTV DVR', price: 0, room: 'r6', at: { i: 7.2, j: 6.8, face: 'ne' } },

      // r7 - floral welcome end cap, low obstacles and one tagged seasonal prize.
      { id: 'f7a', kind: 'floral-stand', name: 'Schnittblumen Eimer', price: 0, room: 'r7', at: { i: 0.6, j: 1.2, face: 'ne' } },
      { id: 'f7b', kind: 'floral-stand', name: 'Schnittblumen Eimer', price: 0, room: 'r7', at: { i: 0.6, j: 5.6, face: 'ne' } },
      { id: 'm_season', kind: 'seasonal-display', name: 'Advent Deko & Kerzen Set', price: 24, room: 'r7', at: { i: 3.0, j: 1.6, face: 'ne' } },
      { id: 'f7c', kind: 'dump-bin', name: 'Hydrangea Kartons', price: 0, room: 'r7', at: { i: 3.0, j: 4.8, face: 'ne' } },
      { id: 'f7d', kind: 'dump-bin', name: 'Gartenherbs Trays', price: 0, room: 'r7', at: { i: 5.8, j: 2.0, face: 'nw' } },
      { id: 'f7e', kind: 'pallet-cage', name: 'Gitterbox Tannen & Topfe', price: 0, room: 'r7', at: { i: 5.8, j: 5.6, face: 'nw' } },

      // r8 - back of house: mesh cages, one watched high-value cage.
      { id: 'd_cage1', kind: 'pallet-cage', name: 'Gitterbox Restposten', price: 0, room: 'r8', at: { i: 0.7, j: 1.2, face: 'ne' } },
      { id: 'd_cage2', kind: 'pallet-cage', name: 'Gitterbox Leergut', price: 0, room: 'r8', at: { i: 0.7, j: 6.4, face: 'ne' } },
      { id: 'm_cage', kind: 'pallet-cage', name: 'Gitterbox Charcoal BBQ & Grills', price: 51, room: 'r8', at: { i: 5.8, j: 4.2, face: 'ne' } },
      { id: 'd_shelf8', kind: 'gondola-shelf', name: 'Palette Restposten', price: 0, room: 'r8', at: { i: 7.0, j: 1.4, face: 'nw' } },

      // r9 - backshop bread wall.
      { id: 'd_br2a', kind: 'bakery-rack', name: 'SB-Backwaren Mischbrot', price: 0, room: 'r9', at: { i: 0.5, j: 1.2, face: 'ne' } },
      { id: 'd_br2b', kind: 'bakery-rack', name: 'SB-Backwaren Brezeln', price: 0, room: 'r9', at: { i: 0.5, j: 3.2, face: 'ne' } },
      { id: 'd_fr9', kind: 'freezer-wall', name: 'TK Backwaren Wand', price: 0, room: 'r9', at: { i: 6.4, j: 7.0, face: 'ne' } },

      // r10 - wet sales: counters and freezer walls make a sightline maze.
      { id: 'd_deli1', kind: 'deli-counter', name: 'Wursttheke Am Kostanteil', price: 0, room: 'r10', at: { i: 0.6, j: 1.2, face: 'ne' } },
      { id: 'm_ham', kind: 'deli-counter', name: 'Truffelschinken Theke', price: 39, room: 'r10', at: { i: 0.6, j: 6.0, face: 'ne' } },
      { id: 'd_fish10', kind: 'service-counter', name: 'Fischtheke Nebentheke', price: 0, room: 'r10', at: { i: 3.4, j: 1.2, face: 'ne' } },
      { id: 'm_lango', kind: 'freezer-wall', name: 'TK Langoustinen Wand', price: 36, room: 'r10', at: { i: 4.0, j: 7.2, face: 'ne' } },
      { id: 'd_hw10', kind: 'hand-wash', name: 'Hygienebecken', price: 0, room: 'r10', at: { i: 7.6, j: 6.4, face: 'nw' } },

      // r11 - wine annexe with crate stacks.
      { id: 'm_prosecco', kind: 'wine-rack', name: 'Prosecco Superiore Rack', price: 42, room: 'r11', at: { i: 6.6, j: 1.4, face: 'nw' } },
      { id: 'd_wine1', kind: 'wine-rack', name: 'Weinregal Rotwein', price: 0, room: 'r11', at: { i: 0.6, j: 1.2, face: 'ne' } },
      { id: 'd_wine2', kind: 'wine-rack', name: 'Weinregal Weisswein', price: 0, room: 'r11', at: { i: 0.6, j: 2.6, face: 'ne' } },
      { id: 'd_kist1', kind: 'crate-tower', name: 'Getrankekisten Wasser', price: 0, room: 'r11', at: { i: 3.4, j: 3.4, face: 'ne' } },
      { id: 'm_kist', kind: 'crate-tower', name: 'Espresso 6er Kist', price: 33, room: 'r11', at: { i: 3.4, j: 6.2, face: 'ne' } },
      { id: 'd_kist2', kind: 'crate-tower', name: 'Getrankekisten Cola', price: 0, room: 'r11', at: { i: 6.4, j: 5.4, face: 'nw' } },

      // r12 - staff and break room, the quiet back corner.
      { id: 'd_hw12', kind: 'hand-wash', name: 'Personalhygiene Becken', price: 0, room: 'r12', at: { i: 0.7, j: 2.0, face: 'ne' } },
      { id: 'd_brk', kind: 'bistro-counter', name: 'Personal Break Theke', price: 0, room: 'r12', at: { i: 7.0, j: 2.4, face: 'nw' } },
      { id: 'd_srv2', kind: 'server-rack', name: 'BOH DVR Rack', price: 0, room: 'r12', at: { i: 7.0, j: 6.6, face: 'nw' } },


      // Department-specific stocking: each zone is themed to its trade.
      { id: 't1a', kind: 'floral-stand', name: 'Schnittblumen am Eingang', price: 0, room: 'r1', at: { i: 0.8, j: 1.2, face: 'ne' } },

      { id: 't2c', kind: 'pallet-stack', name: 'Muesli & Cornflakes Palette', price: 0, room: 'r2', at: { i: 4.6, j: 0.6, face: 'ne' } },


      { id: 't4a', kind: 'beverage-shelf', name: 'Mineralwasser & Säfte', price: 0, room: 'r4', at: { i: 0.6, j: 4.2, face: 'ne' } },
      { id: 't4b', kind: 'beverage-shelf', name: 'Bier & Alkoholfrei', price: 0, room: 'r4', at: { i: 0.6, j: 7.2, face: 'ne' } },

      { id: 't5b', kind: 'gondola-shelf', name: 'Drogerie: Pflegeprodukte', price: 0, room: 'r5', at: { i: 6.6, j: 1.2, face: 'nw' } },
      { id: 't5d', kind: 'dump-bin', name: 'Leergut Karton', price: 0, room: 'r5', at: { i: 6.6, j: 6.6, face: 'nw' } },

      { id: 't6a', kind: 'checkout-lane', name: 'Kasse 3', price: 0, room: 'r6', at: { i: 0.8, j: 7.4, face: 'ne' } },
      { id: 't6b', kind: 'self-checkout', name: 'Self-Checkout Terminal 3', price: 0, room: 'r6', at: { i: 4.2, j: 5.4, face: 'ne' } },

      { id: 't7a', kind: 'floral-stand', name: 'Schnittblumen Regal', price: 0, room: 'r7', at: { i: 0.6, j: 3.2, face: 'ne' } },

      { id: 't8a', kind: 'crate-tower', name: 'Leergut Kisten', price: 0, room: 'r8', at: { i: 2.4, j: 1.2, face: 'ne' } },
      { id: 't8b', kind: 'pallet-stack', name: 'Vorrat Kartons', price: 0, room: 'r8', at: { i: 4.2, j: 6.6, face: 'ne' } },

      { id: 't9a', kind: 'bakery-rack', name: 'Backshop Brotkorb', price: 0, room: 'r9', at: { i: 0.5, j: 5.4, face: 'ne' } },


      { id: 't11a', kind: 'wine-rack', name: 'Weinregal: Merlot', price: 0, room: 'r11', at: { i: 0.6, j: 5.6, face: 'ne' } },

      { id: 't12a', kind: 'bistro-counter', name: 'Personalkuche Theke', price: 0, room: 'r12', at: { i: 4.0, j: 2.4, face: 'ne' } },

      // Aisle signage in the expanded wings (passable markers).
      { id: 'd_sign7', kind: 'aisle-sign', name: 'Aisle 7 · Saison', price: 0, room: 'r7', at: { i: 4.5, j: 0.6, face: 'ne' } },
      { id: 'd_sign8', kind: 'aisle-sign', name: 'Aisle 8 · Lager', price: 0, room: 'r8', at: { i: 4.5, j: 0.6, face: 'ne' } },
      { id: 'd_sign9', kind: 'aisle-sign', name: 'Aisle 9 · Backshop', price: 0, room: 'r9', at: { i: 4.5, j: 0.6, face: 'ne' } },
      { id: 'd_sign10', kind: 'aisle-sign', name: 'Aisle 10 · Fleisch & Fisch', price: 0, room: 'r10', at: { i: 4.5, j: 0.6, face: 'ne' } },
      { id: 'd_sign11', kind: 'aisle-sign', name: 'Aisle 11 · Wein', price: 0, room: 'r11', at: { i: 4.5, j: 0.6, face: 'ne' } },
      { id: 'd_sign12', kind: 'aisle-sign', name: 'Aisle 12 · Personal', price: 0, room: 'r12', at: { i: 4.5, j: 0.6, face: 'ne' } },

      // A few solids in old rooms to give the larger map more texture.
      { id: 'd_fr5', kind: 'freezer-wall', name: 'TK Drogerie Wand', price: 0, room: 'r5', at: { i: 0.6, j: 7.0, face: 'ne' } },
      { id: 'd_bin2', kind: 'dump-bin', name: 'SB Kaffee Pallette', price: 0, room: 'r2', at: { i: 6.6, j: 7.0, face: 'nw' } },
      { id: 'd_bs1', kind: 'hand-basket', name: 'Korbstapel Eingang', price: 0, room: 'r1', at: { i: 6.0, j: 6.6, face: 'ne' } },
      { id: 'd_hw3', kind: 'hand-wash', name: 'Hygienebecken Kuhlregal', price: 0, room: 'r3', at: { i: 3.2, j: 7.0, face: 'nw' } },
    ],
  };

  // 10 Shoplifting Targets. `tagged` = active RF tag; the EAS exit alarms unless de-tagged.
  const MARKET_LOOT = new Map([
    ['m_spirits',   { label: '18yr Islay Single Malt [RF-TAG]', value: 68, noise: 3.4, tagged: true,  roomName: 'Drogerie & Tiefkühl' }],
    ['m_aktion1',   { label: 'Parkside 20V Cordless Drill [RF-TAG]', value: 58, noise: 3.8, tagged: true,  roomName: 'Drogerie & Tiefkühl' }],
    ['m_pallet1',   { label: 'Wholesale Champagne Box [RF-TAG]', value: 54, noise: 3.2, tagged: true,  roomName: 'Getränkemarkt & Wein' }],
    ['m_chill1',    { label: 'Dry-Aged Wagyu Ribeye Pack [RF-TAG]', value: 46, noise: 2.4, tagged: true,  roomName: 'Kühlregal & Frischetheken' }],
    ['m_aktion2',   { label: 'Silvercrest ANC Headphones [RF-TAG]', value: 44, noise: 2.8, tagged: true,  roomName: 'Drogerie & Tiefkühl' }],
    ['m_checkout1', { label: 'Gillette 12-Blade Razor Pack [RF-TAG]', value: 38, noise: 2.6, tagged: true,  roomName: 'Kassenzone & EAS Exit' }],
    ['m_chill2',    { label: 'Norwegian Smoked Salmon & Roe', value: 34, noise: 2.0, tagged: false, roomName: 'Kühlregal & Frischetheken' }],
    ['m_gondola2',  { label: 'Truffle Extra-Virgin Olive Oil', value: 32, noise: 2.2, tagged: false, roomName: 'Frühstück, Backwaren & Trockenwaren' }],
    ['m_cheese',    { label: '24-Month Parmigiano Wedge', value: 29, noise: 1.9, tagged: false, roomName: 'Kühlregal & Frischetheken' }],
    ['m_gondola1',  { label: 'Lavazza Crema Beans 1kg Bag', value: 28, noise: 2.1, tagged: false, roomName: 'Frühstück, Backwaren & Trockenwaren' }],

    ['m_season',    { label: 'Advent Deko & Kerzen Set [RF-TAG]', value: 24, noise: 1.6, tagged: true,  roomName: 'Floral & Saison' }],
    ['m_cage',      { label: 'Charcoal BBQ Kettle [RF-TAG]', value: 51, noise: 3.0, tagged: true,  roomName: 'Lager & BOH' }],
    ['m_prosecco',  { label: 'Prosecco Superiore 6-Pack [RF-TAG]', value: 42, noise: 2.6, tagged: true,  roomName: 'Getranke & Wein Annexe' }],
    ['m_ham',       { label: 'Black Forest Truffle Ham [RF-TAG]', value: 39, noise: 2.4, tagged: true,  roomName: 'Fleisch & Fisch Vorbereitung' }],
    ['m_lango',     { label: 'Frozen Langoustine Box', value: 36, noise: 2.2, tagged: false, roomName: 'Fleisch & Fisch Vorbereitung' }],
    ['m_kist',      { label: 'Espresso 6er Kist', value: 33, noise: 2.0, tagged: false, roomName: 'Getranke & Wein Annexe' }],
  ]);

  // Cameras cover the fresh welcome, the dairy wall, and the checkout exit.
  const MARKET_CAMERAS = [
    { id: 'CAM-01', label: 'CCTV 01 · Obst & Gemüse', I: 11.7, J: 0.35, baseAngle: Math.PI / 2, sweepAmp: 0.70, sweepSpeed: 0.85, range: 5.0, halfAngle: 0.42 },
    { id: 'CAM-02', label: 'CCTV 02 · Frischetheken', I: 26.65, J: 1.7, baseAngle: Math.PI, sweepAmp: 0.68, sweepSpeed: 0.72, range: 5.2, halfAngle: 0.42 },
    { id: 'CAM-03', label: 'CCTV 03 · Kassenzone & EAS Exit', I: 35.65, J: 19.7, baseAngle: Math.PI, sweepAmp: 0.75, sweepSpeed: 0.90, range: 5.2, halfAngle: 0.42 },

    { id: 'CAM-04', label: 'CCTV 04 · Lager & BOH', I: 35.65, J: 10.7, baseAngle: Math.PI, sweepAmp: 0.62, sweepSpeed: 0.80, range: 5.2, halfAngle: 0.42 },
    { id: 'CAM-05', label: 'CCTV 05 · Getranke Annexe', I: 20.7, J: 26.65, baseAngle: -Math.PI / 2, sweepAmp: 0.70, sweepSpeed: 0.78, range: 5.2, halfAngle: 0.42 },
    { id: 'CAM-06', label: 'CCTV 06 · Personal & Saison', I: 35.65, J: 1.7, baseAngle: Math.PI, sweepAmp: 0.66, sweepSpeed: 0.75, range: 5.4, halfAngle: 0.42 },
  ];

  // Store detective walks the guided loop; staff rotate through service counters and the bistro.
  const STAFF_WAYPOINTS = [
    [20.5, 4.5], [31.5, 6.5], [29.5, 13.5], [13.5, 13.5], [6.5, 4.5],
  ];

  const MARKET_GUARD_ROUTE = [
    [7.0, 4.5], [13.5, 4.5], [20.5, 4.5], [31.5, 6.5],
    [31.5, 13.5], [20.5, 13.5], [13.5, 13.5], [4.5, 13.5],
    [4.5, 22.5], [13.5, 22.5], [24.5, 22.5], [31.5, 22.5],
  ];

  globalThis.MARKET_CONFIG = {
    kinds: MARKET_KINDS,
    house: MARKET_HOUSE,
    quota: 190,
    bagCap: 6,
    objectives: [
      { id: 'power', label: 'Disable CCTV power panel' },
      { id: 'vitrine', label: 'Force the spirits vitrine' },
      { id: 'quota', label: 'Steal €190 of goods' },
      { id: 'detag', label: 'Strip all RF tags' },
      { id: 'escape', label: 'Leave through the EAS exit' },
    ],
    panelPos: { I: 29.0, J: 25.5, room: 'r6' },
    motionZones: [
      { I: 4.5, J: 13.5, r: 1.6, label: 'back aisle' },
      { I: 29.0, J: 21.0, r: 1.6, label: 'checkout corridor' },
      { I: 31.5, J: 22.5, r: 1.6, label: 'staff corridor' },
    ],
    lootTargets: MARKET_LOOT,
    entrancePos: { I: 1.3, J: 4.5, room: 'r1' },
    playerSpawnPos: { I: 2.8, J: 3.2, room: 'r1' },
    exitGatePos: { I: 32.4, J: 21.2, room: 'r6' },
    detaggerPos: { I: 32.2, J: 24.8, room: 'r6' },
    cameras: MARKET_CAMERAS,
    staffRoute: STAFF_WAYPOINTS,
    guardRoute: MARKET_GUARD_ROUTE,
  };
})();
