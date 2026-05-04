/**
 * Organic Splatter — renders irregular ink droplets around the stroke path.
 *
 * Droplets are ellipses with random aspect ratio and rotation for organic feel.
 * Concentrated near stroke start (loaded brush) and at high-curvature points.
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
 * Render organic splatter droplets around the stroke.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x: number, y: number, t: number, angle: number, nx: number, ny: number}>} samples
 * @param {{
 *   brushWidth: number,
 *   seed: number,
 *   color?: string,
 *   density?: number,
 *   maxRadius?: number
 * }} opts
 */
export function renderOrganicSplatter(ctx, samples, opts) {
  const {
    brushWidth,
    seed,
    color = 'rgba(20,20,20,1)',
    density = 0.5,
    maxRadius = 4,
  } = opts;

  if (density <= 0 || samples.length < 2) return;

  const rng = mulberry32(seed * 97 + 13);

  // Only scatter around the start point (first 3% of stroke)
  const startSamples = samples.filter(s => s.t <= 0.03);
  if (startSamples.length === 0) startSamples.push(samples[0]);

  // Number of droplets proportional to density
  const count = Math.floor(density * 25);

  ctx.save();
  ctx.fillStyle = color;

  for (let i = 0; i < count; i++) {
    // Pick a random start sample as origin
    const sIdx = Math.floor(rng() * startSamples.length);
    const s = startSamples[sIdx];

    // Scatter distance from stroke center
    const scatterDist = (rng() * 0.3 + 0.3) * brushWidth * 2;
    const scatterAngle = rng() * Math.PI * 2;
    const dx = Math.cos(scatterAngle) * scatterDist;
    const dy = Math.sin(scatterAngle) * scatterDist;

    const dropX = s.x + dx;
    const dropY = s.y + dy;

    // Radius: smaller further from center
    const distFactor = 1 - (scatterDist / (brushWidth * 2)) * 0.6;
    const radius = Math.max(0.3, rng() * maxRadius * distFactor);

    // Alpha: varies randomly
    const alpha = distFactor * (0.3 + rng() * 0.5);

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(dropX, dropY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
