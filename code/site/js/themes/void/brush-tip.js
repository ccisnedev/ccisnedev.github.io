/**
 * Brush Tip — procedural ink brush texture generator.
 *
 * Generates a radial brush profile with fiber noise to simulate
 * natural ink brush hair irregularity.
 */

/**
 * Simple seeded PRNG (mulberry32).
 * @param {number} seed
 * @returns {() => number} Returns values in [0, 1)
 */
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compute the alpha value for a single pixel of the brush tip.
 *
 * The brush is centered at (size/2, size/2) with radius = size/2.
 * Profile: smooth radial falloff * fiber noise.
 *
 * @param {number} x - Pixel x coordinate (0-based)
 * @param {number} y - Pixel y coordinate (0-based)
 * @param {number} size - Brush tip size (width = height = size)
 * @param {{ seed?: number }} [opts]
 * @returns {number} Alpha in [0, 1]
 */
export function computeBrushAlpha(x, y, size, opts = {}) {
  const seed = opts.seed ?? 0;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2;

  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Outside the brush circle
  if (dist >= radius) return 0;

  // Normalized distance [0, 1] from center to edge
  const r = dist / radius;

  // Radial profile: smooth bell-curve-ish falloff
  // Using a cubic ease: (1 - r^2)^2
  const radial = (1 - r * r) * (1 - r * r);

  // Fiber noise: seeded, position-dependent perturbation
  // Use a hash of (x, y, seed) for deterministic noise
  const rng = mulberry32(seed * 73856093 + x * 19349663 + y * 83492791);
  const noise = rng(); // [0, 1)

  // Fiber effect: modulate alpha with noise, stronger near edges
  const fiberStrength = r * 0.4; // More fiber noise toward edge
  const fiber = 1 - fiberStrength * (1 - noise);

  return Math.max(0, Math.min(1, radial * fiber));
}

/**
 * Create a complete brush tip as a Float32Array of alpha values.
 *
 * @param {number} size - Width and height of the brush tip
 * @param {{ seed?: number }} [opts]
 * @returns {{ width: number, height: number, alphaData: Float32Array }}
 */
export function createBrushTip(size, opts = {}) {
  const alphaData = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      alphaData[y * size + x] = computeBrushAlpha(x, y, size, opts);
    }
  }
  return { width: size, height: size, alphaData };
}
