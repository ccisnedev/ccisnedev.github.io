/**
 * Fiber Ink Model — individual ink depletion per fiber.
 *
 * External fibers deplete faster than central ones.
 * Each fiber's retention determines how long it holds ink.
 */

/**
 * Compute the alpha (opacity) of a single fiber at stroke progress t.
 *
 * @param {number} t - Stroke progress [0, 1]
 * @param {{ offset: number, retention: number }} fiber
 * @param {{ decayRate?: number }} [opts]
 * @returns {number} Alpha ∈ [0, 1]
 */
export function fiberAlpha(t, fiber, opts = {}) {
  const { decayRate = 4 } = opts;

  // External fibers deplete faster (factor 1 + |offset| * 2)
  const positionFactor = 1 + Math.abs(fiber.offset) * 2;

  // Retention slows decay: higher retention = slower depletion
  // At t=0 all fibers start at full alpha (1.0)
  const effectiveDecay = decayRate * positionFactor / fiber.retention;
  const alpha = Math.exp(-effectiveDecay * t);

  return Math.max(0, Math.min(1, alpha));
}

/**
 * Compute the relative width of a fiber at stroke progress t.
 * Fibers thin out as they dry.
 *
 * @param {number} t - Stroke progress [0, 1]
 * @param {{ offset: number, retention: number }} fiber
 * @returns {number} Relative width ∈ [0.3, 1.0]
 */
export function fiberWidth(t, fiber) {
  const alpha = fiberAlpha(t, fiber);
  return 0.3 + 0.7 * alpha;
}
