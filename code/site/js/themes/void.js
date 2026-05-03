/** @type {import('../main.js').Theme} */
export default {
  id: 'void',

  init(canvas, ctx) {
    this._ctx = ctx;
    this._canvas = canvas;
    this._w = canvas.width;
    this._h = canvas.height;

    // Timeline state
    this._startTime = null;
    this._drawn = false;
    this._noiseTimer = 0;

    // Generate ensō path (unique per init — each visit is a new breath)
    this._ensoPath = this._generateEnso();
    this._ensoLength = this._estimateLength();

    this._fill();
  },

  resize(width, height) {
    this._w = width;
    this._h = height;
    // Regenerate for new dimensions
    this._ensoPath = this._generateEnso();
    this._ensoLength = this._estimateLength();
    this._drawn = false;
    this._startTime = null;
  },

  frame(timestamp) {
    if (!this._ctx) return true;

    if (this._startTime === null) this._startTime = timestamp;
    const elapsed = (timestamp - this._startTime) / 1000; // seconds

    // Phase 1: pure black (0 - 0.5s)
    // Phase 2: noise awakens (0.5s+)
    // Phase 3: ensō draws (1.0s - 3.0s)
    // Phase 4: static forever

    // Background: living black
    if (elapsed > 0.5) {
      this._drawNoise(timestamp);
    } else {
      this._fill();
    }

    // Ensō stroke animation
    if (elapsed >= 1.0) {
      const drawDuration = 2.0; // seconds
      const drawElapsed = elapsed - 1.0;
      const progress = this._drawn ? 1 : Math.min(drawElapsed / drawDuration, 1);

      if (progress >= 1) this._drawn = true;

      this._drawEnso(this._easeInOut(progress));
    }

    return true;
  },

  destroy() {
    this._ctx = null;
    this._canvas = null;
    this._ensoPath = null;
    this._startTime = null;
    this._drawn = false;
  },

  reducedMotion() {
    if (!this._ctx) return;
    this._fill();
    this._drawEnso(1); // fully drawn, no animation
  },

  // --- Private ---

  _fill() {
    if (!this._ctx) return;
    this._ctx.fillStyle = '#000000';
    this._ctx.fillRect(0, 0, this._w, this._h);
  },

  _drawNoise(timestamp) {
    if (!this._ctx) return;
    const ctx = this._ctx;

    // Repaint full black first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this._w, this._h);

    // Subtle noise: update every ~3 seconds (very sparse)
    const cycle = Math.floor(timestamp / 3000);
    if (cycle !== this._noiseTimer) {
      this._noiseTimer = cycle;
      this._noiseSeed = Math.random();
    }

    // Draw sparse noise blocks (cheap: only ~200 blocks)
    const blockSize = Math.max(8, Math.floor(this._w / 120));
    const seed = this._noiseSeed || 0;
    for (let i = 0; i < 200; i++) {
      // Deterministic-ish scatter based on seed
      const x = ((seed * 1000 + i * 7919) % this._w) | 0;
      const y = ((seed * 2000 + i * 6271) % this._h) | 0;
      const l = (seed * 3 + i * 0.01) % 3 | 0; // 0, 1, or 2
      ctx.fillStyle = `rgb(${l},${l},${l})`;
      ctx.fillRect(x, y, blockSize, blockSize);
    }
  },

  _generateEnso() {
    // Center of canvas, slightly above geometric center (ma)
    const cx = this._w / 2;
    const cy = this._h * 0.46;
    const r = Math.min(this._w, this._h) * 0.18;

    // Generate imperfect control points (±jitter)
    const jitter = () => (Math.random() - 0.5) * r * 0.08;

    // Path: 4 cubic Béziers forming ~340° of a circle (gap at 10 o'clock)
    // Starting at ~10 o'clock (where gap ends), going clockwise
    const startAngle = (210 * Math.PI) / 180; // 10 o'clock = 210°
    const points = [];

    for (let i = 0; i < 5; i++) {
      const angle = startAngle + (i / 5) * (Math.PI * 2 * 0.94); // 94% of circle = gap
      points.push({
        x: cx + Math.cos(angle) * r + jitter(),
        y: cy + Math.sin(angle) * r + jitter(),
      });
    }

    // Build cubic Béziers between consecutive points
    const curves = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midAngle = startAngle + ((i + 0.5) / 5) * (Math.PI * 2 * 0.94);
      const cpDist = r * 0.55; // magic number for circle approximation
      curves.push({
        cp1x: p0.x + Math.cos(midAngle - 0.3) * cpDist + jitter(),
        cp1y: p0.y + Math.sin(midAngle - 0.3) * cpDist + jitter(),
        cp2x: p1.x + Math.cos(midAngle + 0.3) * -cpDist + jitter(),
        cp2y: p1.y + Math.sin(midAngle + 0.3) * -cpDist + jitter(),
        x: p1.x,
        y: p1.y,
      });
    }

    return { start: points[0], curves, cx, cy, r };
  },

  _estimateLength() {
    if (!this._ensoPath) return 1000;
    // Rough estimate: ~94% of circumference
    return 2 * Math.PI * this._ensoPath.r * 0.94;
  },

  _drawEnso(progress) {
    if (!this._ctx || !this._ensoPath) return;
    const ctx = this._ctx;
    const { start, curves } = this._ensoPath;

    const totalLength = this._ensoLength;
    const visibleLength = totalLength * progress;
    const dashOffset = totalLength - visibleLength;

    // Draw 3 layers for variable thickness (brush pressure simulation)
    const layers = [
      { width: 6, opacity: 0.25 },  // halo
      { width: 4, opacity: 0.5 },   // body
      { width: 2.5, opacity: 0.85 }, // center
    ];

    // Scale stroke to viewport
    const scale = Math.min(this._w, this._h) / 600;

    for (const layer of layers) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      for (const c of curves) {
        ctx.bezierCurveTo(c.cp1x, c.cp1y, c.cp2x, c.cp2y, c.x, c.y);
      }
      ctx.strokeStyle = `rgba(240, 240, 240, ${layer.opacity})`;
      ctx.lineWidth = layer.width * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([totalLength]);
      ctx.lineDashOffset = dashOffset;
      ctx.stroke();
      ctx.restore();
    }
  },

  _easeInOut(t) {
    // Cubic ease-in-out: slow start (brush touches), fast middle, slow end (brush lifts)
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
};
