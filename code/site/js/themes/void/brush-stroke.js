/**
 * Brush Stroke Renderer — combines path sampling, ink model, and pressure
 * to produce an array of stamp descriptors for rendering the ensō.
 */

import { samplePath } from './path-sampling.js';
import { pressureCurve, inkDepletion } from './ink-model.js';

/**
 * Generate stamp descriptors for a brush stroke along the ensō path.
 *
 * Each stamp describes where and how to render a brush-tip texture.
 *
 * @param {{ start: {x,y}, curves: Array, r: number }} ensoPath
 * @param {{
 *   numSamples?: number,
 *   baseSize?: number,
 *   progress?: number,
 * }} [opts]
 * @returns {Array<{ x: number, y: number, size: number, alpha: number, angle: number }>}
 */
export function renderStroke(ensoPath, opts = {}) {
  const {
    numSamples = 100,
    baseSize = 30,
    progress = 1.0,
  } = opts;

  const samples = samplePath(ensoPath, numSamples);
  const stamps = [];

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const t = sample.t; // [0, 1] along path

    // If beyond current drawing progress, stamp is invisible
    if (progress <= 0 || t > progress) {
      stamps.push({ x: sample.x, y: sample.y, size: 0, alpha: 0, angle: sample.angle });
      continue;
    }

    // Pressure determines width
    const pressure = pressureCurve(t);
    const size = baseSize * pressure;

    // Ink depletion determines opacity
    const ink = inkDepletion(t);
    const alpha = ink;

    stamps.push({
      x: sample.x,
      y: sample.y,
      size,
      alpha,
      angle: sample.angle,
    });
  }

  return stamps;
}
