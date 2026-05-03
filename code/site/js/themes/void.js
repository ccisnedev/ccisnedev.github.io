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

    // Small jitter for imperfection (hand-drawn feel)
    const jitter = () => (Math.random() - 0.5) * r * 0.06;

    // Standard 4-segment Bézier circle approximation
    // Magic number: (4/3)*tan(π/8) ≈ 0.5522847498
    const k = 0.5522847498 * r;

    // We draw ~93% of the circle (gap at top-left, ~10 o'clock)
    // Segments: bottom → right → top → left (skip last ~7%)
    // Start at bottom-left (7 o'clock position)
    const segments = [
      // Segment 1: bottom to right
      {
        cp1x: cx + k + jitter(), cp1y: cy + r + jitter(),
        cp2x: cx + r + jitter(), cp2y: cy + k + jitter(),
        x: cx + r + jitter(), y: cy + jitter(),
      },
      // Segment 2: right to top
      {
        cp1x: cx + r + jitter(), cp1y: cy - k + jitter(),
        cp2x: cx + k + jitter(), cp2y: cy - r + jitter(),
        x: cx + jitter(), y: cy - r + jitter(),
      },
      // Segment 3: top to left
      {
        cp1x: cx - k + jitter(), cp1y: cy - r + jitter(),
        cp2x: cx - r + jitter(), cp2y: cy - k + jitter(),
        x: cx - r + jitter(), y: cy + jitter(),
      },
      // Segment 4: left to bottom (partial — stop at ~75% to leave gap)
      {
        cp1x: cx - r + jitter(), cp1y: cy + k * 0.75 + jitter(),
        cp2x: cx - k * 0.85 + jitter(), cp2y: cy + r * 0.85 + jitter(),
        x: cx - r * 0.4 + jitter(), y: cy + r * 0.9 + jitter(),
      },
    ];

    // Start point: bottom of circle (6 o'clock shifted slightly toward 7)
    const start = {
      x: cx + jitter(),
      y: cy + r + jitter(),
    };

    return { start, curves: segments, cx, cy, r };
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
