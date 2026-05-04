/**
 * Kasure (掠れ) — Dry brush effect.
 *
 * Creates a fiber-banding mask that simulates the streaky gaps
 * appearing when the brush runs low on ink. The mask modulates
 * alpha across the brush width (perpendicular to stroke direction).
 */

/**
 * Simple seeded PRNG (mulberry32).
 * @param {number} seed
 * @returns {() => number}
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
 * Compute the kasure (dry brush) mask value for a point across the brush width.
 *
 * @param {number} offset - Normalized position across brush width, [-1, 1]
 *                          where 0 is center and ±1 are edges
 * @param {number} inkLevel - Current ink level [0, 1] (from inkDepletion)
 * @param {{ seed?: number, fiberCount?: number }} [opts]
 * @returns {number} Mask value in [0, 1], where 0 = gap (no ink), 1 = full ink
 */
export function kasureMask(offset, inkLevel, opts = {}) {
  const { seed = 0, fiberCount = 8 } = opts;

  // When ink is full, no dry effect
  if (inkLevel >= 1) return 1;

  // Dryness factor: how much the gaps show (0 = wet, 1 = bone dry)
  const dryness = 1 - inkLevel;

  // Map offset [-1, 1] to fiber space [0, fiberCount]
  const fiberPos = ((offset + 1) / 2) * fiberCount;

  // Each fiber has a random "retention" value (how well it holds ink)
  // Use integer part of fiberPos to identify which fiber
  const fiberIdx = Math.floor(fiberPos);
  const rng = mulberry32(seed * 31337 + fiberIdx * 7919);
  const fiberRetention = rng(); // [0, 1)

  // The fiber shows a gap when dryness exceeds its retention
  // Higher retention = fiber holds ink longer
  if (dryness <= fiberRetention) {
    return 1; // This fiber still has ink
  }

  // Smooth transition: partial drying
  const excess = dryness - fiberRetention;
  const fadeWidth = 0.2;
  if (excess < fadeWidth) {
    return 1 - (excess / fadeWidth);
  }

  return 0;
}
