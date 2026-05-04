/**
 * Particle Renderer — draws particles on canvas.
 *
 * Phase 1 (drop forming): Draws growing dots at the start position.
 * Phase 2 (tracing): Each alive particle draws a polyline along the path,
 * offset from center by its (dx, dy) rotated by the path angle.
 */

import { depleteInk, isAlive } from './particle-life.js';

/**
 * Render particles on the canvas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{dx: number, dy: number, dist: number, phase: number, ink: number}>} cloud
 * @param {Array<{x: number, y: number, t: number, angle: number, nx: number, ny: number}>} samples
 * @param {{
 *   progress: number,        // 0-1: how far along the stroke (0 = still forming drop)
 *   dropProgress: number,    // 0-1: how much the drop has formed
 *   brushRadius: number,
 *   color: string,
 *   seed: number
 * }} opts
 */
export function renderParticles(ctx, cloud, samples, opts) {
  const { progress, dropProgress, brushRadius, color, seed } = opts;

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';

  if (progress <= 0) {
    // PHASE 1: Drop forming — draw growing dots at start position
    renderDropPhase(ctx, cloud, samples[0], dropProgress, brushRadius);
  } else {
    // PHASE 2: Tracing — each alive particle draws its trail
    const depleted = depleteInk(cloud, progress, brushRadius, seed);
    renderStrokePhase(ctx, depleted, samples, progress, brushRadius);
  }

  ctx.restore();
}

/**
 * Phase 1: Draw growing dots at the start position.
 */
/**
 * Phase 1: Each particle draws a growing circle (ring) at the start position.
 * All particles appear from the start — each ring expands like ink bleeding.
 */
function renderDropPhase(ctx, cloud, startSample, dropProgress, brushRadius) {
  const maxRadius = brushRadius * 0.12; // max expansion per bristle

  for (const p of cloud) {
    // All particles visible from the start — filled circle grows with dropProgress
    const radius = maxRadius * dropProgress;
    if (radius < 0.3) continue; // too small to render

    // Position: start sample center + particle offset (fixed position)
    const px = startSample.x + p.dx;
    const py = startSample.y + p.dy;

    // Alpha fades slightly as circle expands (ink thins at edges)
    ctx.globalAlpha = 0.6 + 0.4 * (1 - dropProgress);

    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Phase 2: Each alive particle traces its own polyline along the path.
 */
function renderStrokePhase(ctx, cloud, samples, progress, brushRadius) {
  const sampleCount = Math.max(2, Math.ceil(samples.length * progress));
  const lineWidth = brushRadius * 0.06; // thin individual strokes

  for (const p of cloud) {
    if (!isAlive(p)) continue;

    ctx.globalAlpha = p.ink * 0.9; // alpha proportional to remaining ink
    ctx.lineWidth = lineWidth * (0.5 + 0.5 * p.ink); // thinner as ink depletes

    ctx.beginPath();

    for (let i = 0; i < sampleCount; i++) {
      const s = samples[i];
      // Rotate particle offset by path angle
      const cos = Math.cos(s.angle);
      const sin = Math.sin(s.angle);
      const ox = p.dx * cos - p.dy * sin;
      const oy = p.dx * sin + p.dy * cos;

      const x = s.x + ox;
      const y = s.y + oy;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }
}

/**
 * Render only the NEW segment of the stroke (incremental buffer approach).
 * Draws from fromProgress to toProgress for each alive particle.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{dx: number, dy: number, dist: number, phase: number, ink: number}>} cloud
 * @param {Array<{x: number, y: number, t: number, angle: number, nx: number, ny: number}>} samples
 * @param {{
 *   fromProgress: number,
 *   toProgress: number,
 *   brushRadius: number,
 *   color: string,
 *   seed: number
 * }} opts
 */
export function renderStrokeIncrement(ctx, cloud, samples, opts) {
  const { fromProgress, toProgress, brushRadius, color, seed } = opts;

  const fromIndex = Math.max(0, Math.ceil(samples.length * fromProgress));
  const toIndex = Math.max(2, Math.ceil(samples.length * toProgress));

  // Nothing new to draw
  if (toIndex <= fromIndex) return;

  const depleted = depleteInk(cloud, toProgress, brushRadius, seed);
  const lineWidth = brushRadius * 0.06;

  // Start one sample back for line connection (unless at the very beginning)
  const startIndex = fromIndex > 0 ? fromIndex - 1 : 0;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';

  for (const p of depleted) {
    if (!isAlive(p)) continue;

    ctx.globalAlpha = p.ink * 0.9;
    ctx.lineWidth = lineWidth * (0.5 + 0.5 * p.ink);

    ctx.beginPath();

    for (let i = startIndex; i < toIndex; i++) {
      const s = samples[i];
      const cos = Math.cos(s.angle);
      const sin = Math.sin(s.angle);
      const ox = p.dx * cos - p.dy * sin;
      const oy = p.dx * sin + p.dy * cos;

      const x = s.x + ox;
      const y = s.y + oy;

      if (i === startIndex) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  ctx.restore();
}
