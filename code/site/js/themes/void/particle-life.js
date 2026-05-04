/**
 * Particle Life — manages ink depletion and death of particles.
 *
 * Core mechanic: each particle's ink depletes based on:
 *   - Its inkReserve (random per particle — the dominant factor for kasure)
 *   - Progress along the stroke (further = less ink)
 *   - Distance from center (mild bias — outer die slightly faster)
 *   - Relight: ~25% of particles briefly come back to life once after dying
 *   - Late-start: ~5% appear only in the last portion of the stroke
 *   - Strong: clustered particles that survive to the end
 *
 * This creates organic kasure: some bristles die early (low reserve),
 * most survive through the body, and the end is chaotic — some center
 * bristles die while some edge bristles survive unexpectedly.
 */

/**
 * Compute ink levels for all particles at a given progress.
 * Returns a NEW array (does not mutate input).
 *
 * @param {Array} cloud
 * @param {number} progress - 0 to 1 (how far along the stroke)
 * @param {number} radius - The brush radius (for normalizing distance)
 * @param {number} seed - For deterministic noise
 * @returns {Array}
 */
export function depleteInk(cloud, progress, radius, seed) {
  if (progress <= 0) {
    return cloud.map(p => ({ ...p }));
  }

  return cloud.map((p) => {
    // Late-start particles are dead until their start point
    if (p.lateStartAt > 0 && progress < p.lateStartAt) {
      return { ...p, ink: 0 };
    }

    // Normalized distance (0 = center, 1 = edge)
    const normDist = Math.min(p.dist / radius, 1);

    // Effective progress for late-start particles (they start fresh)
    const effectiveProgress = p.lateStartAt > 0
      ? (progress - p.lateStartAt) / (1 - p.lateStartAt)
      : progress;

    let consumption;
    if (p.strong) {
      // Strong bristles ignore distance — they survive to the end
      // but still lose ink (get thinner/fainter)
      consumption = effectiveProgress * 0.75;
    } else {
      // Normal bristles: edge particles die faster
      const distBias = 1.0 + normDist * 0.3; // 1.0 at center, 1.3 at edge
      consumption = effectiveProgress * 0.85 * distBias;
    }

    // Base ink from reserve minus consumption
    let ink = Math.max(0, p.inkReserve - consumption);

    // Relight: if particle has relightAt > 0, it briefly comes back
    // for a longer window (~15% of total progress) after its relightAt point
    if (p.relightAt > 0 && ink <= 0) {
      const relightDuration = 0.15;
      const relightEnd = p.relightAt + relightDuration;
      if (progress >= p.relightAt && progress <= relightEnd) {
        // Triangular pulse: rises then falls within the relight window
        const t = (progress - p.relightAt) / relightDuration;
        ink = 0.6 * (1 - Math.abs(2 * t - 1)); // peaks at 0.6 mid-window
      }
    }

    return { ...p, ink };
  });
}

/**
 * Check if a particle is still alive (has ink remaining).
 *
 * @param {{ink: number}} particle
 * @returns {boolean}
 */
export function isAlive(particle) {
  return particle.ink > 0;
}
