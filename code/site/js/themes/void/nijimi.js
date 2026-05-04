/**
 * Nijimi (滲み) — Ink bleed / halo effect.
 *
 * Simulates the soft halo that forms around brush strokes on
 * absorbent paper (washi). The effect is stronger where ink is
 * heavier (start of stroke) and fades as ink depletes.
 */

/**
 * Compute the halo parameters for a given point along the stroke.
 *
 * @param {number} t - Position along stroke [0, 1]
 * @param {{ inkLoad?: number }} [opts]
 *   - inkLoad: how saturated the brush is [0, 1], affects bleed intensity
 * @returns {{ widthScale: number, alpha: number }}
 *   - widthScale: multiplier for brush size (1 = no halo, >1 = wider)
 *   - alpha: opacity of the halo layer [0, 1]
 */
export function nijimiHalo(t, opts = {}) {
  const { inkLoad = 0.5 } = opts;

  // Bleed diminishes along the stroke as ink depletes
  const inkFactor = inkLoad * (1 - t * 0.8); // Decays to 20% of inkLoad at t=1

  // Width expansion: subtle (max ~1.3x at full ink)
  const widthScale = 1 + inkFactor * 0.3;

  // Alpha: soft, translucent halo
  const alpha = inkFactor * 0.25;

  return { widthScale, alpha };
}
