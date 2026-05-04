/**
 * Ink behavior curves for Zen brush stroke simulation.
 * All functions map t ∈ [0, 1] (stroke progress) to a value in [0, 1].
 */

/**
 * Pressure curve — simulates how hard the brush presses against paper.
 * - t=0: brush barely touching (low pressure)
 * - t~0.05-0.1: full pressure reached quickly
 * - t~0.5: sustained high pressure
 * - t~0.9-1.0: brush lifting off (low pressure)
 *
 * @param {number} t - Progress along stroke [0, 1]
 * @returns {number} Pressure value [0, 1]
 */
export function pressureCurve(t) {
  if (t < 0.08) {
    // Quick attack: ease-out from 0.2 to ~1.0
    const n = t / 0.08;
    return 0.2 + 0.8 * (1 - (1 - n) * (1 - n));
  }
  if (t > 0.85) {
    // Lift-off: ease-in from ~0.9 down to ~0.2
    const n = (t - 0.85) / 0.15;
    return 0.9 * (1 - n) * (1 - n) + 0.1;
  }
  // Sustained body: gentle arc peaking at center
  return 0.85 + 0.15 * Math.sin((t - 0.08) / (0.85 - 0.08) * Math.PI);
}

/**
 * Ink depletion curve — simulates ink running out as the brush travels.
 * Monotonically non-increasing. Never reaches zero.
 *
 * @param {number} t - Progress along stroke [0, 1]
 * @returns {number} Ink remaining (0, 1]
 */
export function inkDepletion(t) {
  if (t <= 0.1) return 1.0;
  if (t <= 0.55) {
    // Gentle linear descent
    return 1.0 - (t - 0.1) * 0.2; // 1.0 → 0.91
  }
  // Exponential decay in the kasure zone
  const decay = Math.exp(-4 * (t - 0.55));
  // Map from ~1.0 at t=0.55 to ~0.15 at t=1.0, floor at 0.12
  return Math.max(0.12, 0.91 * decay);
}

/**
 * Fiber density curve — how tightly brush fibers stay together.
 * 1.0 = fibers fully united (wet ink), lower = fibers separating (dry brush).
 *
 * @param {number} t - Progress along stroke [0, 1]
 * @returns {number} Density [0.2, 1.0]
 */
export function fiberDensity(t) {
  if (t <= 0.5) return 1.0;
  // Linear descent from 1.0 to 0.3
  return Math.max(0.3, 1.0 - (t - 0.5) * 1.4);
}
