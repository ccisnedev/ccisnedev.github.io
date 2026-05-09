import { evolveInkPool } from './ink-pool.js';

/**
 * Render the initial ink deposit as a wet paper event: halo, dense pigment,
 * and edge deposits. Uses small cells instead of per-bristle circles.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ size: number, brushRadius: number, water: Float32Array, pigment: Float32Array, edge: Float32Array }} pool
 * @param {{ x: number, y: number, angle?: number }} startSample
 * @param {{ progress: number, color?: string }} opts
 */
export function renderInkPool(ctx, pool, startSample, opts = {}) {
  const { progress = 1, color = 'rgba(240, 240, 240, 1)' } = opts;
  const steps = Math.max(0, Math.round(progress * 18));
  const state = evolveInkPool(pool, steps);
  const radius = pool.brushRadius * (1.05 + progress * 0.65);
  const cell = (radius * 2) / pool.size;
  const originX = startSample.x - radius;
  const originY = startSample.y - radius;

  ctx.save();

  drawField(ctx, state, {
    field: 'water',
    threshold: 0.025,
    alpha: 0.18 + progress * 0.16,
    cell,
    originX,
    originY,
    color,
    scale: 1.08,
  });

  drawField(ctx, state, {
    field: 'pigment',
    threshold: 0.035,
    alpha: 0.78,
    cell,
    originX,
    originY,
    color,
    scale: 0.98,
  });

  drawField(ctx, state, {
    field: 'edge',
    threshold: 0.01,
    alpha: 0.45 + progress * 0.18,
    cell,
    originX,
    originY,
    color,
    scale: 1,
  });

  ctx.restore();
}

function drawField(ctx, pool, opts) {
  const { field, threshold, alpha, cell, originX, originY, color, scale } = opts;
  const values = pool[field];
  const c = (pool.size - 1) / 2;
  const scaledCell = cell * scale;
  ctx.fillStyle = color;

  for (let y = 0; y < pool.size; y++) {
    for (let x = 0; x < pool.size; x++) {
      const value = values[y * pool.size + x];
      if (value < threshold) continue;

      const dx = (x - c) * scale + c;
      const dy = (y - c) * scale + c;
      ctx.globalAlpha = Math.min(1, value * alpha);
      ctx.fillRect(
        originX + dx * cell,
        originY + dy * cell,
        scaledCell + 0.35,
        scaledCell + 0.35,
      );
    }
  }
}

