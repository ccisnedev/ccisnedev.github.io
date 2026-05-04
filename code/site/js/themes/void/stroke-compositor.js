/**
 * Stroke Compositor — orchestrates the 3-layer hybrid brush rendering.
 *
 * Layer order:
 *   1. Mass layer (filled body shape — base density, wider at start)
 *   2. Fiber layer (individual polylines — detail & kasure)
 *   3. Splatter (organic droplets at start point — energy)
 */

import { generateFiberLayout } from './fiber-geometry.js';
import { renderFibers } from './fiber-renderer.js';
import { renderMassLayer } from './mass-layer.js';
import { renderOrganicSplatter } from './organic-splatter.js';

/**
 * Composite all layers of the brush stroke.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x: number, y: number, t: number, angle: number, nx: number, ny: number}>} samples
 * @param {{
 *   brushWidth: number,
 *   seed: number,
 *   fiberCount?: number,
 *   color?: string,
 *   massAlpha?: number,
 *   splatterDensity?: number,
 *   wobbleFreq?: number,
 *   wobbleAmp?: number,
 *   decayRate?: number
 * }} opts
 */
export function compositeStroke(ctx, samples, opts) {
  if (samples.length < 2) return;

  const {
    brushWidth,
    seed,
    fiberCount = 30,
    color = 'rgba(20,20,20,1)',
    massAlpha = 0.35,
    splatterDensity = 0.4,
    wobbleFreq = 3,
    wobbleAmp = 2,
    decayRate = 4,
  } = opts;

  // Layer 1: Mass (body)
  renderMassLayer(ctx, samples, {
    brushWidth,
    seed,
    color,
    alpha: massAlpha,
  });

  // Layer 2: Fibers
  if (fiberCount > 0) {
    const fibers = generateFiberLayout(fiberCount, { seed });
    renderFibers(ctx, fibers, samples, {
      brushWidth,
      seed,
      color,
      wobbleFreq,
      wobbleAmp,
      decayRate,
      baseWidth: Math.max(1.2, brushWidth / 8),
    });
  }

  // Layer 3: Splatter
  if (splatterDensity > 0) {
    renderOrganicSplatter(ctx, samples, {
      brushWidth,
      seed,
      color,
      density: splatterDensity,
    });
  }
}
