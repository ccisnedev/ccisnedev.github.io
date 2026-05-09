/**
 * Particle Renderer — draws particles on canvas.
 *
 * Phase 1 (drop forming): Draws a wet ink pool at the start position.
 * Phase 2 (tracing): Each alive particle draws a polyline along the path,
 * offset from center by its (dx, dy) rotated by the path angle.
 */

import { depleteInk, isAlive } from './particle-life.js';
import { createInkPool } from './ink-pool.js';
import { renderInkPool } from './ink-pool-renderer.js';

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
 *   seed: number,
 *   inkPool?: object
 * }} opts
 */
export function renderParticles(ctx, cloud, samples, opts) {
  const { progress, dropProgress, brushRadius, color, seed, inkPool } = opts;

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';

  if (progress <= 0) {
    // PHASE 1: Ink pool forming - paper absorbs and spreads the deposited ink.
    renderInkPool(
      ctx,
      inkPool || createInkPool(seed, brushRadius),
      samples[0],
      { progress: dropProgress, color },
    );
  } else {
    // PHASE 2: Tracing — each alive particle draws its trail
    const depleted = depleteInk(cloud, progress, brushRadius, seed);
    renderStrokePhase(ctx, depleted, samples, progress, brushRadius);
  }

  ctx.restore();
}

/**
 * Phase 2: Each alive particle traces its own polyline along the path.
 */
function renderStrokePhase(ctx, cloud, samples, progress, brushRadius) {
  const sampleCount = Math.max(2, Math.ceil(samples.length * progress));

  for (const p of cloud) {
    if (!isAlive(p)) continue;

    const bristleWidth = brushRadius * (0.035 + p.inkReserve * 0.04);

    for (let i = 0; i < sampleCount - 1; i++) {
      const s0 = samples[i];
      const s1 = samples[i + 1];
      const t = s1.t;
      const pressure = brushPressure(t);
      const dryGap = dryGapAt(p, t, brushRadius);
      if (dryGap > p.ink * pressure) continue;

      const a = bristlePoint(p, s0, brushRadius);
      const b = bristlePoint(p, s1, brushRadius);

      ctx.globalAlpha = Math.min(0.9, p.ink * pressure * 0.85);
      ctx.lineWidth = Math.max(0.35, bristleWidth * pressure * (0.45 + p.ink * 0.75));

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
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

  // Start one sample back for line connection (unless at the very beginning)
  const startIndex = fromIndex > 0 ? fromIndex - 1 : 0;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';

  for (const p of depleted) {
    if (!isAlive(p)) continue;

    const bristleWidth = brushRadius * (0.035 + p.inkReserve * 0.04);

    for (let i = startIndex; i < toIndex - 1; i++) {
      const s0 = samples[i];
      const s1 = samples[i + 1];
      const t = s1.t;
      const pressure = brushPressure(t);
      const dryGap = dryGapAt(p, t, brushRadius);
      if (dryGap > p.ink * pressure) continue;

      const a = bristlePoint(p, s0, brushRadius);
      const b = bristlePoint(p, s1, brushRadius);

      ctx.globalAlpha = Math.min(0.9, p.ink * pressure * 0.85);
      ctx.lineWidth = Math.max(0.35, bristleWidth * pressure * (0.45 + p.ink * 0.75));

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function brushPressure(t) {
  const pressIn = t < 0.08 ? 1.15 + (1 - t / 0.08) * 0.35 : 1;
  const lift = t > 0.82 ? Math.max(0.08, 1 - Math.pow((t - 0.82) / 0.18, 1.45)) : 1;
  const depletion = 1 - t * 0.2;
  return pressIn * lift * depletion;
}

function bristlePoint(p, s, brushRadius) {
  const cos = Math.cos(s.angle);
  const sin = Math.sin(s.angle);
  const ox = p.dx * cos - p.dy * sin;
  const oy = p.dx * sin + p.dy * cos;
  const wobble = Math.sin(s.t * 28 + p.phase * Math.PI * 2) * brushRadius * 0.018;
  const drag = Math.sin(s.t * 11 + p.phase * 5) * brushRadius * 0.012;

  return {
    x: s.x + ox + s.nx * wobble + Math.cos(s.angle) * drag,
    y: s.y + oy + s.ny * wobble + Math.sin(s.angle) * drag,
  };
}

function dryGapAt(p, t, brushRadius) {
  const edge = Math.min(p.dist / brushRadius, 1);
  const fiberNoise = Math.sin((t * 61 + p.phase * 17 + edge * 9) * 12.9898) * 43758.5453;
  const random = fiberNoise - Math.floor(fiberNoise);
  return random * (0.45 + edge * 0.35 + t * 0.25);
}
