/**
 * Fiber Renderer — draws individual fiber polylines onto a Canvas 2D context.
 *
 * Each fiber is rendered segment-by-segment with per-segment width and alpha,
 * creating natural tapering as ink depletes along the stroke.
 */

import { fiberAlpha, fiberWidth } from './fiber-ink.js';
import { createPerlin1D } from './perlin.js';

/**
 * Render all fibers as tapered polylines on the given Canvas 2D context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{id: number, offset: number, retention: number, phase: number}>} fibers
 * @param {Array<{x: number, y: number, t: number, angle: number, nx: number, ny: number}>} samples
 * @param {{
 *   brushWidth: number,
 *   seed: number,
 *   color?: string,
 *   wobbleFreq?: number,
 *   wobbleAmp?: number,
 *   decayRate?: number,
 *   baseWidth?: number
 * }} opts
 */
export function renderFibers(ctx, fibers, samples, opts) {
  if (fibers.length === 0 || samples.length < 2) return;

  const {
    brushWidth,
    seed,
    color = 'rgba(20,20,20,1)',
    wobbleFreq = 2,
    wobbleAmp = 3,
    decayRate = 4,
    baseWidth = 1.5,
  } = opts;

  for (const fiber of fibers) {
    const noise = createPerlin1D(seed * 127 + fiber.id * 31);

    // Pre-compute positions for this fiber
    const points = [];
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const alpha = fiberAlpha(s.t, fiber, { decayRate });
      if (alpha < 0.005) continue;

      const wobble = noise(s.t * wobbleFreq + fiber.phase) * wobbleAmp;

      // Start spread: fibers are wider apart at start (brush pressed)
      // then converge to normal spacing
      let offsetScale = 1;
      if (s.t < 0.02) {
        offsetScale = 1.3; // pressed brush = wider spread
      } else if (s.t < 0.08) {
        const p = (s.t - 0.02) / 0.06;
        offsetScale = 1.3 - 0.3 * (1 - Math.pow(1 - p, 3));
      }

      // End taper: fibers converge to center in last 5%
      if (s.t > 0.95) {
        offsetScale = 1 - ((s.t - 0.95) / 0.05) * 0.8;
      }

      const perpOffset = (fiber.offset * brushWidth + wobble) * offsetScale;
      const px = s.x + s.nx * perpOffset;
      const py = s.y + s.ny * perpOffset;
      const w = baseWidth * fiberWidth(s.t, fiber);

      points.push({ x: px, y: py, alpha, width: w });
    }

    if (points.length < 2) continue;

    // Draw segment-by-segment with varying width and alpha
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      // Average alpha and width for this segment
      const segAlpha = (p0.alpha + p1.alpha) / 2;
      const segWidth = (p0.width + p1.width) / 2;

      if (segAlpha < 0.005 || segWidth < 0.1) continue;

      ctx.globalAlpha = segAlpha;
      ctx.lineWidth = segWidth;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    ctx.restore();
  }
}
