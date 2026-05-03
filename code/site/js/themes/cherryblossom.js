/**
 * Cherry Blossom theme — a contemplative spring morning.
 *
 * Layers:
 *  1. CSS gradient sky (handled by body[data-theme] CSS)
 *  2. SVG branch (positioned via CSS, not drawn on canvas)
 *  3. Canvas: falling petals (25-30 desktop, 10-12 mobile)
 *  4. Project bar (shared, CSS themed)
 *
 * The canvas only handles the petals. The sky gradient and branch are CSS/HTML.
 */

const PETAL_COLORS = ['#f2c4cc', '#e8a0b0', '#f5d5dc', '#edb3bf'];
const DESKTOP_COUNT = 28;
const MOBILE_COUNT = 11;

/** @type {import('../main.js').Theme} */
export default {
  id: 'cherryblossom',

  init(canvas, ctx) {
    this._ctx = ctx;
    this._canvas = canvas;
    this._w = canvas.width;
    this._h = canvas.height;
    this._petals = [];
    this._windPhase = 0;
    this._lastTime = null;

    this._spawnPetals();
  },

  resize(width, height) {
    this._w = width;
    this._h = height;
    this._spawnPetals();
  },

  frame(timestamp) {
    if (!this._ctx) return true;

    if (this._lastTime === null) this._lastTime = timestamp;
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.1); // cap dt
    this._lastTime = timestamp;

    this._windPhase += dt * 0.5;

    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._w, this._h);

    for (const p of this._petals) {
      this._updatePetal(p, dt);
      this._drawPetal(ctx, p);
    }

    return true;
  },

  destroy() {
    this._ctx = null;
    this._canvas = null;
    this._petals = [];
  },

  reducedMotion() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._w, this._h);
    // Draw 5 static petals frozen mid-fall
    for (let i = 0; i < 5; i++) {
      const p = this._petals[i];
      if (p) this._drawPetal(ctx, p);
    }
  },

  // --- Private ---

  _spawnPetals() {
    const count = this._w > 768 ? DESKTOP_COUNT : MOBILE_COUNT;
    this._petals = [];
    for (let i = 0; i < count; i++) {
      this._petals.push(this._createPetal(true));
    }
  },

  _createPetal(randomY) {
    const depth = Math.random(); // 0=far, 1=close
    const size = 4 + depth * 5; // 4-9px
    return {
      x: Math.random() * this._w,
      y: randomY ? Math.random() * this._h : -size * 2,
      size,
      depth,
      fallSpeed: 20 + depth * 30, // 20-50 px/s
      driftAmp: 30 + Math.random() * 50, // 30-80px amplitude
      driftFreq: 0.5 + Math.random() * 1.5,
      driftOffset: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: 0.5 + Math.random() * 1.5, // rad/s
      tumble: Math.random() * Math.PI * 2,
      tumbleSpeed: 0.3 + Math.random() * 0.7,
      color: PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0],
      opacity: 0.6 + depth * 0.3, // 0.6-0.9
    };
  },

  _updatePetal(p, dt) {
    p.y += p.fallSpeed * dt;
    p.rotation += p.rotSpeed * dt;
    p.tumble += p.tumbleSpeed * dt;

    // Wind gust: periodic acceleration
    const wind = Math.sin(this._windPhase * 0.7 + p.driftOffset) * 0.3;
    p.x += wind * p.driftAmp * dt;

    // Sinusoidal horizontal drift
    p.x += Math.sin(p.driftFreq * this._windPhase + p.driftOffset) * 0.5;

    // Reset if below viewport
    if (p.y > this._h + 20) {
      p.y = -p.size * 2;
      p.x = Math.random() * this._w;
    }
    // Wrap horizontal
    if (p.x > this._w + 20) p.x = -20;
    if (p.x < -20) p.x = this._w + 20;
  },

  _drawPetal(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    // Tumble effect: scale Y axis to simulate 3D rotation
    const scaleY = 0.4 + Math.abs(Math.sin(p.tumble)) * 0.6;
    ctx.scale(1, scaleY);

    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;

    // Petal shape: elongated ellipse with a point
    ctx.beginPath();
    const w = p.size;
    const h = p.size * 0.6;
    ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },
};
