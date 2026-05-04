/**
 * Sakura blossom renderer — botanically-informed flower placement.
 *
 * Based on research of Prunus serrulata (Japanese cherry):
 * - Flowers grow in cymose clusters of 2-5 at NODES along short spurs
 * - Spur nodes are spaced at semi-regular intervals along branches
 * - Flowers have 5 petals with a characteristic notch (wild type)
 * - Density increases toward branch tips (younger wood flowers more)
 *
 * Placement algorithm:
 * 1. Walk each branch bezier, placing "spur nodes" at intervals
 *    (interval ≈ golden angle ratio along the branch arc)
 * 2. At each spur node: spawn a cluster of 2-5 flowers (cymose pattern)
 * 3. Cluster flowers are offset radially around the spur point
 * 4. Buds appear at ~20% of positions (younger, still-opening flowers)
 *
 * Uses seeded PRNG for determinism.
 */

import { _bezierPoint } from './branch-generator.js';

function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FLOWER_PALETTE = ['#ffffff', '#fff5f7', '#fce4ec', '#f8bbd0', '#ffffff'];
const BUD_COLOR = '#e8607a';
const GOLDEN_ANGLE = 2.39996; // radians (137.5°)

/**
 * Generate blossom positions along branches using botanical spur-node model.
 * @param {Array} branches - Output from generateBranches
 * @param {number} seed - PRNG seed
 * @returns {Array<{x,y,size,rotation,petalCount,color,type,scaleX}>}
 */
export function generateBlossoms(branches, seed) {
  const rng = mulberry32(seed);
  const blossoms = [];

  for (const branch of branches) {
    // Determine spur node placement along each branch.
    // Botanical ref: Prunus serrulata flowers in clusters of 2-5 at nodes
    // on short spurs. Spurs arise at leaf axils at semi-regular intervals.
    const branchLen = Math.hypot(branch.x1 - branch.x0, branch.y1 - branch.y0);

    // Spur spacing: ~40-60px apart on screen — creates visible bare gaps
    // Shorter spacing on thin outer branches (they flower more densely)
    const baseSpacing = branch.depth === 0 ? 80 : 45 - branch.depth * 5;
    const spurSpacing = Math.max(baseSpacing, 30);
    const spurCount = Math.max(1, Math.floor(branchLen / spurSpacing));

    // Bloom probability per spur: not all nodes flower.
    // Trunk: sparse (40%); sub-branches: moderate-dense (65-80%)
    const spurBloomProb = branch.depth === 0
      ? 0.4
      : Math.min(0.8, 0.65 + branch.depth * 0.05);

    for (let s = 0; s < spurCount; s++) {
      // Stochastic skip — creates bare branch zones naturally
      if (rng() > spurBloomProb) continue;

      // Parametric position: avoid base of branch, concentrate mid-to-tip
      const tMin = branch.depth === 0 ? 0.3 : 0.15;
      const t = tMin + (s + 0.3 + rng() * 0.4) / spurCount * (1 - tMin);
      if (t > 1) continue;

      const spurX = _bezierPoint(branch.x0, branch.cx0, branch.cx1, branch.x1, t);
      const spurY = _bezierPoint(branch.y0, branch.cy0, branch.cy1, branch.y1, t);

      // Cymose cluster: 2-5 flowers per spur (Prunus serrulata botanical fact)
      const clusterSize = 2 + Math.floor(rng() * 4); // 2, 3, 4, or 5
      const clusterRadius = 8 + branch.width * 2 + rng() * 10;

      let angle = rng() * Math.PI * 2; // starting angle for cluster spiral

      for (let c = 0; c < clusterSize; c++) {
        // Arrange flowers in a spiral pattern (phyllotactic)
        angle += GOLDEN_ANGLE + (rng() - 0.5) * 0.3;
        const dist = clusterRadius * (0.3 + (c / clusterSize) * 0.7) * (0.7 + rng() * 0.3);
        const fx = spurX + Math.cos(angle) * dist;
        const fy = spurY + Math.sin(angle) * dist;

        // Decide type: 80% open flower, 20% bud
        const isBud = rng() < 0.2;

        if (isBud) {
          blossoms.push({
            x: fx, y: fy,
            size: 4 + rng() * 5,
            rotation: rng() * Math.PI * 2,
            petalCount: 5,
            color: BUD_COLOR,
            type: 'bud',
            scaleX: 1,
          });
        } else {
          // Size varies: closer to branch tip = slightly smaller (newer flowers)
          const size = 14 + rng() * 16;
          // Viewing angle variation
          const scaleX = 0.5 + rng() * 0.5;
          blossoms.push({
            x: fx, y: fy,
            size,
            rotation: rng() * Math.PI * 2,
            petalCount: 5,
            color: FLOWER_PALETTE[Math.floor(rng() * FLOWER_PALETTE.length)],
            type: 'flower',
            scaleX,
          });
        }
      }
    }
  }

  return blossoms;
}

/**
 * Draw a single sakura blossom on a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} blossom
 */
export function drawBlossom(ctx, blossom) {
  if (blossom.type === 'bud') {
    _drawBud(ctx, blossom);
  } else {
    _drawFlower(ctx, blossom);
  }
}

function _drawFlower(ctx, { x, y, size, rotation, petalCount, color, scaleX }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scaleX, 1);
  ctx.globalAlpha = 0.88;

  const angleStep = (Math.PI * 2) / petalCount;

  // Petals
  ctx.fillStyle = color;
  for (let i = 0; i < petalCount; i++) {
    ctx.save();
    ctx.rotate(i * angleStep);
    _drawPetal(ctx, size);
    ctx.restore();
  }

  // Pink center wash
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#f48fb1';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Stamens: 6-8 filaments with anther dots
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = '#c9a050';
  ctx.fillStyle = '#8b6914';
  ctx.lineWidth = 0.7;
  const stamenCount = 6 + Math.floor(Math.abs(scaleX) * 3);
  for (let i = 0; i < stamenCount; i++) {
    const a = (i / stamenCount) * Math.PI * 2;
    const len = size * (0.13 + Math.abs(Math.sin(a * 2.5)) * 0.1);
    const ex = Math.cos(a) * len;
    const ey = Math.sin(a) * len;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // Anther dot
    ctx.beginPath();
    ctx.arc(ex, ey, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function _drawBud(ctx, { x, y, size, rotation, color }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = color;

  // Elongated oval bud
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.4, size, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sepal (green cap)
  ctx.fillStyle = '#6b8f5e';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.7, size * 0.35, size * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a single petal with the characteristic sakura notch.
 */
function _drawPetal(ctx, size) {
  const w = size * 0.42;
  const h = size * 0.9;
  const notch = size * 0.12;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  // Left curve
  ctx.bezierCurveTo(-w * 0.6, -h * 0.3, -w * 1.1, -h * 0.65, -w * 0.35, -h);
  // Notch at tip
  ctx.quadraticCurveTo(0, -h + notch, w * 0.35, -h);
  // Right curve
  ctx.bezierCurveTo(w * 1.1, -h * 0.65, w * 0.6, -h * 0.3, 0, 0);
  ctx.fill();
}
