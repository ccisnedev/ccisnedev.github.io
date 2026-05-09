/**
 * Ink Pool - small local water/pigment simulation for the first brush contact.
 *
 * The brush deposits ink once; the paper expands the wet area by capillary
 * action. Water moves farther than pigment, pigment deposits near the center
 * and at stalled wet edges.
 */

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {number} seed
 * @param {number} brushRadius
 * @param {{ size?: number }} [opts]
 */
export function createInkPool(seed, brushRadius, opts = {}) {
  const size = opts.size || 48;
  const rng = mulberry32(seed);
  const water = new Float32Array(size * size);
  const pigment = new Float32Array(size * size);
  const paper = new Float32Array(size * size);
  const edge = new Float32Array(size * size);

  const c = (size - 1) / 2;
  const baseRadius = size * 0.18;
  const fiberAngle = rng() * Math.PI;
  const grainPhase = rng() * Math.PI * 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const dx = x - c;
      const dy = y - c;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);
      const directionalRadius = baseRadius * (
        1
        + Math.sin(angle * 3 + grainPhase) * 0.14
        + Math.cos(angle - fiberAngle) * 0.1
      );
      const r = dist / Math.max(1, directionalRadius);
      const grain = rng();

      paper[i] = 0.58 + grain * 0.34 + Math.sin((x * 0.37 + y * 0.19) + grainPhase) * 0.08;

      if (r < 1.35) {
        const falloff = Math.max(0, 1 - r);
        const wetFalloff = Math.max(0, 1 - r / 1.35);
        water[i] = Math.min(1, Math.pow(wetFalloff, 0.65) * (0.82 + grain * 0.18));
        pigment[i] = Math.min(1, Math.pow(falloff, 0.42) * (0.92 + grain * 0.08));
      }
    }
  }

  return { size, brushRadius, water, pigment, paper, edge };
}

/**
 * @param {{ size: number, water: Float32Array, pigment: Float32Array, paper: Float32Array, edge: Float32Array }} pool
 * @param {number} steps
 */
export function evolveInkPool(pool, steps) {
  let water = new Float32Array(pool.water);
  let pigment = new Float32Array(pool.pigment);
  let edge = new Float32Array(pool.edge);
  const { size, paper } = pool;

  const dirs = [
    [1, 0, 1.0],
    [-1, 0, 1.0],
    [0, 1, 0.78],
    [0, -1, 0.78],
  ];

  for (let step = 0; step < steps; step++) {
    const nextWater = new Float32Array(water);
    const nextPigment = new Float32Array(pigment);
    const nextEdge = new Float32Array(edge);

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const i = y * size + x;
        const w = water[i];
        if (w <= 0.002) continue;

        const absorb = 0.018 + paper[i] * 0.014;
        const mobileWater = Math.max(0, w - absorb);
        const flow = mobileWater * 0.105;
        nextWater[i] -= flow * 2.7 + absorb * 0.5;

        const pigmentFlow = pigment[i] * flow * 0.16;
        nextPigment[i] -= pigmentFlow;

        for (const [dx, dy, weight] of dirs) {
          const ni = (y + dy) * size + x + dx;
          const paperPull = 0.55 + paper[ni] * 0.65;
          const amount = flow * weight * paperPull;
          nextWater[ni] += amount;
          nextPigment[ni] += pigmentFlow * weight * paperPull * 0.48;
        }

        const stopped = Math.max(0, w - nextWater[i]);
        nextEdge[i] += stopped * pigment[i] * 0.18;
        nextPigment[i] += stopped * pigment[i] * 0.05;
      }
    }

    water = clampField(nextWater);
    pigment = clampField(nextPigment);
    edge = clampField(nextEdge);
  }

  return { ...pool, water, pigment, edge };
}

export function sampleInkPool(pool, x, y) {
  const ix = Math.max(0, Math.min(pool.size - 1, Math.round(x)));
  const iy = Math.max(0, Math.min(pool.size - 1, Math.round(y)));
  const i = iy * pool.size + ix;
  return {
    water: pool.water[i],
    pigment: pool.pigment[i],
    paper: pool.paper[i],
    edge: pool.edge[i],
  };
}

export function radialExtent(pool, fieldName, threshold, angle) {
  const c = (pool.size - 1) / 2;
  const field = pool[fieldName];
  let extent = 0;
  const maxR = pool.size / 2;

  for (let r = 0; r < maxR; r += 0.5) {
    const x = Math.round(c + Math.cos(angle) * r);
    const y = Math.round(c + Math.sin(angle) * r);
    if (x < 0 || x >= pool.size || y < 0 || y >= pool.size) break;
    if (field[y * pool.size + x] >= threshold) extent = r;
  }

  return extent;
}

function clampField(field) {
  for (let i = 0; i < field.length; i++) {
    field[i] = Math.max(0, Math.min(1, field[i]));
  }
  return field;
}
