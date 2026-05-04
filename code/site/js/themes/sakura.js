/**
 * Sakura theme — a contemplative spring morning.
 *
 * Layers (rendered to offscreen buffer once, then animated petals on top):
 *  1. CSS gradient sky (handled by body[data-theme] CSS)
 *  2. Forest backdrop: layered blurry tree silhouettes (canvas buffer)
 *  3. Branches: recursive bezier curves (canvas buffer)
 *  4. Blossoms: cherry blossom clusters at branch tips (canvas buffer)
 *  5. Falling petals: animated each frame (canvas live)
 */

import { generateBranches } from './sakura/branch-generator.js';
import { generateBlossoms, drawBlossom } from './sakura/blossom-renderer.js';
import { generateForestLayers, drawForestLayer } from './sakura/forest-backdrop.js';

const PETAL_COLORS = ['#ffffff', '#fff5f7', '#fce4ec', '#f8bbd0', '#ffffff'];
const DESKTOP_COUNT = 28;
const MOBILE_COUNT = 11;
const BLOSSOM_APPEAR_INTERVAL = 80; // ms between each flower appearing

/** @type {import('../main.js').Theme} */
export default {
  id: 'sakura',

  init(canvas, ctx) {
    this._ctx = ctx;
    this._canvas = canvas;
    this._w = canvas.width;
    this._h = canvas.height;
    this._petals = [];
    this._windPhase = 0;
    this._lastTime = null;
    this._buffer = null;
    this._blossoms = [];       // all blossom objects
    this._visibleCount = 0;    // how many blossoms are currently visible
    this._blossomTimer = 0;    // accumulator for staggered reveal

    this._buildBuffer();
    this._spawnPetals();
  },

  resize(width, height) {
    this._w = width;
    this._h = height;
    this._buildBuffer();
    this._spawnPetals();
    this._visibleCount = 0;
    this._blossomTimer = 0;
  },

  frame(timestamp) {
    if (!this._ctx) return true;

    if (this._lastTime === null) this._lastTime = timestamp;
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.1); // cap dt
    this._lastTime = timestamp;

    this._windPhase += dt * 0.5;

    // Progressively reveal blossoms one by one
    if (this._visibleCount < this._blossoms.length) {
      this._blossomTimer += dt * 1000;
      while (this._blossomTimer >= BLOSSOM_APPEAR_INTERVAL &&
             this._visibleCount < this._blossoms.length) {
        this._blossomTimer -= BLOSSOM_APPEAR_INTERVAL;
        this._visibleCount++;
      }
    }

    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._w, this._h);

    // Draw static buffer (forest + branches, NO blossoms)
    if (this._buffer) {
      ctx.drawImage(this._buffer, 0, 0);
    }

    // Draw visible blossoms with fade-in
    for (let i = 0; i < this._visibleCount; i++) {
      drawBlossom(ctx, this._blossoms[i]);
    }

    // Animated falling petals — only after all blossoms have appeared
    if (this._visibleCount >= this._blossoms.length) {
      for (const p of this._petals) {
        this._updatePetal(p, dt);
        this._drawPetal(ctx, p);
      }
    }

    return true;
  },

  destroy() {
    this._ctx = null;
    this._canvas = null;
    this._petals = [];
    this._blossoms = [];
    this._buffer = null;
  },

  reducedMotion() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._w, this._h);
    // Draw static scene
    if (this._buffer) {
      ctx.drawImage(this._buffer, 0, 0);
    }
    // Draw all blossoms immediately (no animation for reduced-motion)
    for (const b of this._blossoms) {
      drawBlossom(ctx, b);
    }
    // Draw 5 static petals frozen mid-fall
    for (let i = 0; i < 5; i++) {
      const p = this._petals[i];
      if (p) this._drawPetal(ctx, p);
    }
  },

  // --- Private ---

  _buildBuffer() {
    const w = this._w;
    const h = this._h;

    // Random seed each time — every load is unique
    const seed = (Math.random() * 0xffffffff) >>> 0;

    let buffer, bCtx;
    try {
      buffer = (typeof OffscreenCanvas !== 'undefined')
        ? new OffscreenCanvas(w, h)
        : (() => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; })();
      bCtx = buffer.getContext('2d');
      if (!bCtx || typeof bCtx.save !== 'function') {
        this._buffer = null;
        return;
      }
    } catch (_) {
      this._buffer = null;
      return;
    }

    // Layer 1: Forest backdrop
    const forestLayers = generateForestLayers(w, h, seed);
    for (const layer of forestLayers) {
      drawForestLayer(bCtx, layer);
    }

    // Layer 2: Branches
    const branches = generateBranches(w, h, seed);
    this._drawBranches(bCtx, branches);

    // Layer 3: Blossoms — stored for animated reveal (not drawn to buffer)
    this._blossoms = generateBlossoms(branches, seed + 1);
    this._visibleCount = 0;
    this._blossomTimer = 0;

    this._buffer = buffer;
  },

  _drawBranches(ctx, branches) {
    for (const b of branches) {
      ctx.save();
      ctx.strokeStyle = b.depth < 2 ? '#4a3f3a' : '#6b5f58';
      ctx.lineWidth = b.width;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.9;

      ctx.beginPath();
      ctx.moveTo(b.x0, b.y0);
      ctx.bezierCurveTo(b.cx0, b.cy0, b.cx1, b.cy1, b.x1, b.y1);
      ctx.stroke();

      // Second pass: thinner highlight for bark texture
      if (b.width > 2) {
        ctx.strokeStyle = '#8b6f5e';
        ctx.lineWidth = b.width * 0.3;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
      }

      ctx.restore();
    }
  },

  _spawnPetals() {
    const count = this._w > 768 ? DESKTOP_COUNT : MOBILE_COUNT;
    this._petals = [];
    for (let i = 0; i < count; i++) {
      this._petals.push(this._createPetal(true));
    }
  },

  _createPetal(randomY) {
    const depth = Math.random(); // 0=far, 1=close
    const size = 8 + depth * 7; // 8-15px
    return {
      x: Math.random() * this._w,
      y: randomY ? Math.random() * this._h : -size * 2,
      size,
      depth,
      fallSpeed: 15 + depth * 25, // 15-40 px/s (slower, more graceful)
      driftAmp: 40 + Math.random() * 60, // 40-100px amplitude
      driftFreq: 0.4 + Math.random() * 1.2,
      driftOffset: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: 0.5 + Math.random() * 1.5, // rad/s
      tumble: Math.random() * Math.PI * 2,
      tumbleSpeed: 0.3 + Math.random() * 0.7,
      color: PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0],
      opacity: 0.7 + depth * 0.25, // 0.7-0.95
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

    // Petal shape with sakura notch
    const s = p.size;
    const w = s * 0.42;
    const h = s * 0.9;
    const notch = s * 0.12;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-w * 0.6, -h * 0.3, -w * 1.1, -h * 0.65, -w * 0.35, -h);
    ctx.quadraticCurveTo(0, -h + notch, w * 0.35, -h);
    ctx.bezierCurveTo(w * 1.1, -h * 0.65, w * 0.6, -h * 0.3, 0, 0);
    ctx.fill();

    ctx.restore();
  },
};
