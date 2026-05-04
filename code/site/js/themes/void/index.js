/**
 * Void Theme Orchestrator — coordinates all brush sub-modules
 * to produce a complete ensō frame description.
 *
 * This is the single entry point used by the void theme renderer.
 */

import { renderStroke } from './brush-stroke.js';
import { inkDepletion } from './ink-model.js';
import { kasureMask } from './kasure.js';
import { generateSplatter } from './splatter.js';
import { nijimiHalo } from './nijimi.js';

/**
 * Build a complete ensō frame: stamps with kasure, splatter droplets, and halo.
 *
 * @param {{ start: {x,y}, curves: Array, r: number }} ensoPath
 * @param {{
 *   progress?: number,
 *   seed?: number,
 *   numSamples?: number,
 *   baseSize?: number,
 *   splatterProbability?: number,
 *   fiberCount?: number,
 * }} [opts]
 * @returns {{
 *   stamps: Array<{ x, y, size, alpha, angle }>,
 *   splatter: Array<{ x, y, radius, alpha }>,
 *   haloStamps: Array<{ x, y, size, widthScale, alpha }>,
 * }}
 */
export function buildEnsoFrame(ensoPath, opts = {}) {
  const {
    progress = 1.0,
    seed = 0,
    numSamples = 80,
    baseSize = 30,
    splatterProbability = 0.3,
    fiberCount = 10,
  } = opts;

  // 1. Get base stamps from brush-stroke renderer
  const rawStamps = renderStroke(ensoPath, { numSamples, baseSize, progress });

  // 2. Apply kasure (dry brush) to each stamp's alpha
  const stamps = rawStamps.map((stamp, i) => {
    if (stamp.alpha <= 0) return stamp;

    const t = i / (numSamples - 1);
    const inkLevel = inkDepletion(t);

    // Sample kasure across the brush width center (offset=0)
    // For full rendering, this would be per-pixel; here we use center as representative
    const kasure = kasureMask(0, inkLevel, { seed, fiberCount });

    return {
      ...stamp,
      alpha: stamp.alpha * kasure,
    };
  });

  // 3. Generate splatter for high-ink stamps
  const splatter = [];
  for (let i = 0; i < stamps.length; i++) {
    const stamp = stamps[i];
    if (stamp.alpha <= 0) continue;

    const t = i / (numSamples - 1);
    const inkLevel = inkDepletion(t);

    // Splatter is more likely when ink is loaded
    const splatterChance = splatterProbability * inkLevel;
    // Deterministic: use seed + index to decide
    const hashVal = ((seed * 73856093 + i * 19349663) >>> 0) / 4294967296;
    if (hashVal < splatterChance) {
      const drops = generateSplatter(stamp, { seed: seed + i, count: 3 });
      splatter.push(...drops);
    }
  }

  // 4. Generate nijimi (halo) for visible stamps
  const haloStamps = [];
  for (let i = 0; i < stamps.length; i++) {
    const stamp = stamps[i];
    if (stamp.alpha <= 0) continue;

    const t = i / (numSamples - 1);
    const inkLevel = inkDepletion(t);
    const halo = nijimiHalo(t, { inkLoad: inkLevel });

    if (halo.alpha > 0.01) {
      haloStamps.push({
        x: stamp.x,
        y: stamp.y,
        size: stamp.size,
        widthScale: halo.widthScale,
        alpha: halo.alpha,
      });
    }
  }

  return { stamps, splatter, haloStamps };
}
