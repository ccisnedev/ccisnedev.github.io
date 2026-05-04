/**
 * Splatter — generates small ink droplets scattered around a brush stamp.
 *
 * Simulates the micro-splatter that occurs when a loaded brush
 * strikes the paper with velocity.
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
 * Generate splatter droplets around a given stamp.
 *
 * @param {{ x: number, y: number, size: number, alpha: number, angle: number }} stamp
 * @param {{ seed?: number, count?: number }} [opts]
 * @returns {Array<{ x: number, y: number, radius: number, alpha: number }>}
 */
export function generateSplatter(stamp, opts = {}) {
  const { seed = 0, count = 5 } = opts;
  const rng = mulberry32(seed);

  const droplets = [];
  const scatterRadius = stamp.size * 3; // Max distance from stamp center
  const maxDropRadius = stamp.size * 0.3;

  for (let i = 0; i < count; i++) {
    // Random angle and distance (biased toward further out)
    const angle = rng() * Math.PI * 2;
    const dist = (rng() * 0.8 + 0.2) * scatterRadius; // At least 20% away
    const x = stamp.x + Math.cos(angle) * dist;
    const y = stamp.y + Math.sin(angle) * dist;

    // Smaller drops further away
    const distFactor = 1 - (dist / scatterRadius) * 0.7;
    const radius = Math.max(0.5, rng() * maxDropRadius * distFactor);

    // Alpha attenuated by stamp alpha and distance
    const alpha = stamp.alpha * distFactor * (0.3 + rng() * 0.7);

    droplets.push({ x, y, radius, alpha });
  }

  return droplets;
}
