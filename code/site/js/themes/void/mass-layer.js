/**
 * Mass Layer — renders the ink "body" as a filled shape that provides base density.
 *
 * Constructs a closed path by tracing the top edge (center + brushWidth/2 in normal direction)
 * and bottom edge (center - brushWidth/2), with slight Perlin variation on width for organics.
 */

import { createPerlin1D } from './perlin.js';

/**
 * Render the mass (body) layer of the brush stroke.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x: number, y: number, t: number, angle: number, nx: number, ny: number}>} samples
 * @param {{
 *   brushWidth: number,
 *   seed: number,
 *   color?: string,
 *   alpha?: number,
 *   edgeNoise?: number
 * }} opts
 */
export function renderMassLayer(ctx, samples, opts) {
  if (samples.length < 2) return;

  const {
    brushWidth,
    seed,
    color = 'rgba(20,20,20,1)',
    alpha = 0.4,
    edgeNoise = 0.15,
  } = opts;

  const noise = createPerlin1D(seed * 59);
  const halfW = brushWidth / 2;

  // Compute top and bottom edge points
  const topEdge = [];
  const bottomEdge = [];

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    // Width variation via noise
    const widthVar = 1 + noise(s.t * 4 + 0.5) * edgeNoise;
    const w = halfW * widthVar;

    // Start shape: first 5% is wider (brush pressed down = ink pool)
    // then narrows slightly to normal stroke width
    let startTaper = 1;
    if (s.t < 0.02) {
      // Initial press: 1.4x wider than normal
      startTaper = 1.4;
    } else if (s.t < 0.08) {
      // Transition: from 1.4x down to 1.0x (cubic ease-out)
      const p = (s.t - 0.02) / 0.06;
      startTaper = 1.4 - 0.4 * (1 - Math.pow(1 - p, 3));
    }

    // End taper: last 5% narrows quickly (brush lifts abruptly)
    let endTaper = 1;
    if (s.t > 0.95) {
      const liftProgress = (s.t - 0.95) / 0.05;
      endTaper = 1 - liftProgress * 0.92; // narrows to 8% of width
    }

    // Ink depletion narrows the stroke toward the end
    const depletionFactor = 1 - s.t * 0.2;
    const effectiveW = w * depletionFactor * startTaper * endTaper;

    topEdge.push({
      x: s.x + s.nx * effectiveW,
      y: s.y + s.ny * effectiveW,
    });
    bottomEdge.push({
      x: s.x - s.nx * effectiveW,
      y: s.y - s.ny * effectiveW,
    });
  }

  ctx.save();
  ctx.fillStyle = color;

  // The start point is a full circle at MAX opacity (brush pressed = dense ink pool).
  // Curved edge blends naturally with the stroke — no straight line artifact.
  const startCenter = samples[0];
  const startTop = topEdge[0];
  const startBottom = bottomEdge[0];
  const startRadius = Math.hypot(startTop.x - startCenter.x, startTop.y - startCenter.y);

  ctx.globalAlpha = 1.0;
  ctx.beginPath();
  const circleSegs = 16;
  for (let i = 0; i <= circleSegs; i++) {
    const angle = (i / circleSegs) * Math.PI * 2;
    const px = startCenter.x + Math.cos(angle) * startRadius;
    const py = startCenter.y + Math.sin(angle) * startRadius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Stroke body polygon at normal alpha
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(startTop.x, startTop.y);

  // TOP EDGE forward
  for (let i = 1; i < topEdge.length; i++) {
    ctx.lineTo(topEdge[i].x, topEdge[i].y);
  }

  // END: connect top end to bottom end
  const lastBottom = bottomEdge[bottomEdge.length - 1];
  ctx.lineTo(lastBottom.x, lastBottom.y);

  // BOTTOM EDGE in reverse
  for (let i = bottomEdge.length - 2; i >= 0; i--) {
    ctx.lineTo(bottomEdge[i].x, bottomEdge[i].y);
  }

  // START CAP: semicircular arc from bottomEdge[0] → behind start → topEdge[0]
  const capSegments = 10;
  const dx = startBottom.x - startCenter.x;
  const dy = startBottom.y - startCenter.y;
  for (let i = 1; i < capSegments; i++) {
    const t = i / capSegments;
    const angle = Math.PI * t;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    ctx.lineTo(startCenter.x + dx * cos - dy * sin, startCenter.y + dx * sin + dy * cos);
  }

  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
