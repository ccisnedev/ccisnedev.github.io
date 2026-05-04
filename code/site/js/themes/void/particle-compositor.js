/**
 * Particle Compositor — unified entry point for the particle-based brush stroke.
 *
 * Replaces the old 3-layer system (mass + fiber + splatter) with a single
 * particle system where each "bristle" independently deposits ink.
 */

import { createParticleCloud } from './particle-cloud.js';
import { renderParticles } from './particle-renderer.js';

/**
 * Render a complete particle-based brush stroke.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x: number, y: number, t: number, angle: number, nx: number, ny: number}>} samples
 * @param {{
 *   brushRadius: number,
 *   particleCount: number,
 *   seed: number,
 *   color: string,
 *   progress: number,     // 0-1 stroke progress
 *   dropProgress: number, // 0-1 drop formation progress
 * }} opts
 */
export function compositeParticleStroke(ctx, samples, opts) {
  const { brushRadius, particleCount, seed, color, progress, dropProgress } = opts;

  // Create particle cloud (deterministic from seed)
  const cloud = createParticleCloud(particleCount, brushRadius, seed);

  // Render
  renderParticles(ctx, cloud, samples, {
    progress,
    dropProgress,
    brushRadius,
    color,
    seed,
  });
}
