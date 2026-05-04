/**
 * Seeded 1D Perlin noise — used for organic fiber wobble.
 *
 * Classic gradient noise: hash-based gradient at integer lattice points,
 * smoothstep interpolation between them.
 */

/**
 * Simple seeded PRNG (mulberry32).
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
 * Create a seeded 1D Perlin noise function.
 *
 * @param {number} seed
 * @returns {(x: number) => number} noise function returning values ∈ [-1, 1]
 */
export function createPerlin1D(seed) {
  const rng = mulberry32(seed);

  // Pre-compute 256 random gradients (-1 or +1 for 1D, but use continuous for smoothness)
  const gradients = new Float64Array(256);
  for (let i = 0; i < 256; i++) {
    gradients[i] = rng() * 2 - 1; // ∈ [-1, 1]
  }

  // Permutation table
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  // Fisher-Yates shuffle
  for (let i = 255; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }

  // Smoothstep (Hermite interpolation)
  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  return function noise(x) {
    const xi = Math.floor(x);
    const xf = x - xi; // fractional part ∈ [0, 1)

    const i0 = ((xi % 256) + 256) & 255;
    const i1 = ((xi + 1) % 256 + 256) & 255;

    const g0 = gradients[perm[i0]];
    const g1 = gradients[perm[i1]];

    // Dot product of gradient with distance
    const d0 = g0 * xf;
    const d1 = g1 * (xf - 1);

    // Interpolate
    const u = fade(xf);
    return d0 + u * (d1 - d0);
  };
}
