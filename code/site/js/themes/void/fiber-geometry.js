/**
 * Fiber Geometry — distribution and positioning of individual brush fibers.
 *
 * Each fiber has a perpendicular offset from the stroke center,
 * with non-uniform distribution (denser at center, sparser at edges).
 */

/**
 * Simple seeded PRNG (mulberry32).
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
 * Generate the spatial layout of N fibers across the brush width.
 *
 * @param {number} fiberCount
 * @param {{ seed?: number }} [opts]
 * @returns {Array<{ id: number, offset: number, retention: number, phase: number }>}
 */
export function generateFiberLayout(fiberCount, opts = {}) {
  const { seed = 0 } = opts;
  const rng = mulberry32(seed * 73856093 + 11);

  const fibers = [];
  const half = fiberCount / 2;

  for (let i = 0; i < fiberCount; i++) {
    // Non-linear distribution: denser near center
    // Map i to [-1, 1] centered, then apply power curve
    const normalized = (i - half + 0.5) / half; // ∈ (-1, 1)
    const sign = Math.sign(normalized);
    const mag = Math.abs(normalized);
    // Add small seed-dependent jitter to offset (±5% of spacing)
    const jitter = (rng() - 0.5) * (0.5 / half) * 0.3;
    const offset = Math.max(-0.5, Math.min(0.5, sign * Math.pow(mag, 1.3) * 0.5 + jitter));

    // Each fiber has intrinsic ink retention [0.6, 1.0]
    const retention = 0.6 + rng() * 0.4;

    // Random phase for Perlin noise jitter
    const phase = rng() * 100;

    fibers.push({ id: i, offset, retention, phase });
  }

  return fibers;
}

/**
 * Compute the world position of a fiber at a given path sample point.
 *
 * @param {{ offset: number }} fiber
 * @param {{ x: number, y: number, nx: number, ny: number }} sample
 * @param {number} width - Stroke width at this point
 * @param {number} jitter - Extra perpendicular displacement
 * @returns {{ x: number, y: number }}
 */
export function fiberPosition(fiber, sample, width, jitter) {
  const displacement = fiber.offset * width + jitter;
  return {
    x: sample.x + sample.nx * displacement,
    y: sample.y + sample.ny * displacement,
  };
}
