/**
 * Sakura bokeh backdrop — soft diffuse circles simulating out-of-focus blossoms.
 *
 * Produces layered bokeh data for a shallow depth-of-field photographic look.
 * Uses seeded PRNG for determinism.
 */

function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BOKEH_COLORS = [
  'rgba(232, 180, 195, 0.15)',  // pink
  'rgba(255, 240, 245, 0.12)',  // white-pink
  'rgba(200, 160, 175, 0.10)',  // muted mauve
  'rgba(245, 220, 230, 0.13)',  // light rose
];

/**
 * Generate bokeh circle layers (background diffuse blossoms).
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} seed - PRNG seed
 * @returns {Array<{blur, opacity, color, points}>} Ordered back-to-front
 */
export function generateForestLayers(width, height, seed) {
  const rng = mulberry32(seed);
  const scale = Math.min(width, height);

  // 3 layers of bokeh: far (big blur), mid, near (less blur)
  const layerConfigs = [
    { blur: 12, opacity: 0.3, count: 8, sizeRange: [0.08, 0.18] },
    { blur: 6, opacity: 0.4, count: 12, sizeRange: [0.05, 0.12] },
    { blur: 3, opacity: 0.5, count: 6, sizeRange: [0.03, 0.07] },
  ];

  return layerConfigs.map(cfg => {
    const points = [];
    for (let i = 0; i < cfg.count; i++) {
      const x = rng() * width;
      const y = rng() * height;
      const radius = scale * (cfg.sizeRange[0] + rng() * (cfg.sizeRange[1] - cfg.sizeRange[0]));
      const color = BOKEH_COLORS[Math.floor(rng() * BOKEH_COLORS.length)];
      points.push({ x, y, radius, color });
    }
    return {
      blur: cfg.blur,
      opacity: cfg.opacity,
      color: BOKEH_COLORS[0], // kept for API compat
      points,
    };
  });
}

/**
 * Render a bokeh layer to a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{blur, opacity, points}} layer
 */
export function drawForestLayer(ctx, layer) {
  ctx.save();
  ctx.filter = `blur(${layer.blur}px)`;
  ctx.globalAlpha = layer.opacity;

  for (const pt of layer.points) {
    const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.radius);
    grad.addColorStop(0, pt.color);
    grad.addColorStop(1, 'rgba(255, 240, 245, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
