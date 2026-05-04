/**
 * Particle Cloud — creates a set of particles distributed within a disk.
 *
 * Each particle represents one "bristle" of the brush. Together they form
 * the brush footprint. Particles far from center will die sooner during
 * the stroke, creating natural kasure (dry brush) effects.
 */

/**
 * Seeded PRNG (mulberry32).
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
 * Create a cloud of particles distributed within a disk.
 *
 * @param {number} count - Number of particles
 * @param {number} radius - Radius of the disk
 * @param {number} seed - PRNG seed for determinism
 * @returns {Array<{dx: number, dy: number, dist: number, phase: number, ink: number, inkReserve: number, relightAt: number}>}
 */
export function createParticleCloud(count, radius, seed) {
  const rng = mulberry32(seed);
  const particles = [];

  // Generate 1-2 angular sectors for strong particle clusters
  // This creates cohesive "mechón" groups instead of scattered strong particles
  const strongAngle1 = rng() * Math.PI * 2;
  const strongAngle2 = strongAngle1 + Math.PI * (0.6 + rng() * 0.8); // 108°-252° away
  const strongSpread = Math.PI / 6; // ±30° sector width

  for (let i = 0; i < count; i++) {
    // Uniform distribution within disk: use sqrt(r) for uniform area sampling
    const r = Math.sqrt(rng()) * radius;
    const angle = rng() * Math.PI * 2;
    const dx = Math.cos(angle) * r;
    const dy = Math.sin(angle) * r;

    // inkReserve: biased toward high values (most bristles carry lots of ink,
    // a few carry little → sporadic early gaps)
    // Formula: rng()^0.4 gives distribution skewed to 1.0
    // Then scale to [0.3, 1.0] range
    const rawReserve = Math.pow(rng(), 0.4);
    const inkReserve = 0.3 + rawReserve * 0.7;

    // relightAt: ~25% of particles relight once after dying.
    // Longer window, more visible reconnection effect.
    const relightRoll = rng();
    const relightAt = relightRoll < 0.25
      ? 0.25 + rng() * 0.55  // relight somewhere between 25%-80% progress
      : 0; // no relight

    // strong: particles within the angular sector(s) are "strong bristles"
    // They form a cohesive cluster that survives to the end.
    const angleDiff1 = Math.abs(Math.atan2(Math.sin(angle - strongAngle1), Math.cos(angle - strongAngle1)));
    const angleDiff2 = Math.abs(Math.atan2(Math.sin(angle - strongAngle2), Math.cos(angle - strongAngle2)));
    const strong = angleDiff1 < strongSpread || angleDiff2 < strongSpread;

    // lateStartAt: ~5% of particles start dead and appear only later.
    // Mimics bristles that weren't touching the paper initially.
    const lateRoll = rng();
    const lateStartAt = lateRoll < 0.05
      ? 0.6 + rng() * 0.25  // appear between 60%-85% progress
      : 0; // normal start

    particles.push({
      dx,
      dy,
      dist: r,
      phase: rng(),
      ink: 1.0,
      inkReserve,
      relightAt,
      strong,
      lateStartAt,
    });
  }

  return particles;
}
