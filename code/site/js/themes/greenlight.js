/**
 * The Green Light theme — Gatsby's dock at night.
 *
 * A painted scene on Canvas 2D:
 *  - Dark overcast sky (top 30%)
 *  - Distant shore silhouette (thin strip at horizon)
 *  - Green light pulsing on the horizon
 *  - Dark water with horizontal ripples (bottom 65%)
 *  - Green reflection column on water
 *
 * Forward movement illusion: parallax of haze, reflection width oscillation,
 * vignette cycle — the light never grows. You advance but never arrive.
 */

const GREEN = '#39ff85';
const SKY_TOP = '#0a0c10';
const SKY_HORIZON = '#151a22';
const WATER_BASE = '#0b0e14';
const WATER_ALT = '#0f1319';
const SHORE = '#0d0f12';

/** @type {import('../main.js').Theme} */
export default {
  id: 'greenlight',

  init(canvas, ctx) {
    this._ctx = ctx;
    this._canvas = canvas;
    this._w = canvas.width;
    this._h = canvas.height;
    this._startTime = null;
    this._audioPlayed = false;
  },

  resize(width, height) {
    this._w = width;
    this._h = height;
  },

  frame(timestamp) {
    if (!this._ctx) return true;
    if (this._startTime === null) this._startTime = timestamp;

    const t = (timestamp - this._startTime) / 1000;
    const ctx = this._ctx;
    const w = this._w;
    const h = this._h;

    const horizonY = h * 0.30;
    const shoreH = Math.max(6, h * 0.015);

    // --- Sky ---
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, SKY_TOP);
    skyGrad.addColorStop(1, SKY_HORIZON);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonY);

    // --- Shore ---
    ctx.fillStyle = SHORE;
    ctx.fillRect(0, horizonY, w, shoreH);

    // --- Water ---
    const waterTop = horizonY + shoreH;
    ctx.fillStyle = WATER_BASE;
    ctx.fillRect(0, waterTop, w, h - waterTop);

    // Ripples: horizontal sine waves
    this._drawRipples(ctx, waterTop, t);

    // --- Green light ---
    const lightX = w / 2;
    const lightY = horizonY;
    this._drawGreenLight(ctx, lightX, lightY, t);

    // --- Reflection ---
    this._drawReflection(ctx, lightX, waterTop, h, t);

    // --- Haze (atmospheric scatter at horizon) ---
    this._drawHaze(ctx, lightX, horizonY, w, t);

    // --- Vignette (forward movement illusion) ---
    this._drawVignette(ctx, w, h, t);

    return true;
  },

  destroy() {
    this._ctx = null;
    this._canvas = null;
  },

  reducedMotion() {
    if (!this._ctx) return;
    // Draw static scene at t=0 (light at mid-pulse, no ripple movement)
    this.frame(this._startTime || 0);
  },

  // --- Private ---

  _drawRipples(ctx, waterTop, t) {
    const w = this._w;
    const h = this._h;
    const waterH = h - waterTop;
    const rippleCount = w > 768 ? 4 : 2;

    for (let layer = 0; layer < rippleCount; layer++) {
      const freq = 0.01 + layer * 0.005;
      const amp = 0.5 + layer * 0.3;
      const speed = 2 + layer * 0.5;
      const phase = t * speed + layer * 1.7;

      ctx.fillStyle = layer % 2 === 0 ? WATER_ALT : WATER_BASE;

      for (let y = 0; y < waterH; y += 8) {
        const offset = Math.sin((y + waterTop) * freq + phase) * amp;
        ctx.fillRect(0, waterTop + y + offset, w, 1);
      }
    }
  },

  _drawGreenLight(ctx, x, y, t) {
    // Breathing pulse: 4-6s cycle
    const breathe = Math.sin(t * (Math.PI * 2) / 5) * 0.5 + 0.5; // 0-1, 5s cycle

    // Core
    const coreR = 2.5 + breathe * 1;
    ctx.beginPath();
    ctx.arc(x, y, coreR, 0, Math.PI * 2);
    ctx.fillStyle = GREEN;
    ctx.fill();

    // Inner glow
    const innerR = 12 + breathe * 8;
    const innerGrad = ctx.createRadialGradient(x, y, 0, x, y, innerR);
    innerGrad.addColorStop(0, 'rgba(57, 255, 133, 0.4)');
    innerGrad.addColorStop(1, 'rgba(57, 255, 133, 0)');
    ctx.fillStyle = innerGrad;
    ctx.fillRect(x - innerR, y - innerR, innerR * 2, innerR * 2);

    // Outer bloom
    const outerR = 60 + breathe * 20;
    const outerOpacity = 0.05 + breathe * 0.07;
    const outerGrad = ctx.createRadialGradient(x, y, 0, x, y, outerR);
    outerGrad.addColorStop(0, `rgba(57, 255, 133, ${outerOpacity})`);
    outerGrad.addColorStop(1, 'rgba(57, 255, 133, 0)');
    ctx.fillStyle = outerGrad;
    ctx.fillRect(x - outerR, y - outerR, outerR * 2, outerR * 2);
  },

  _drawReflection(ctx, lightX, waterTop, h, t) {
    const breathe = Math.sin(t * (Math.PI * 2) / 5) * 0.5 + 0.5;
    const reflH = (h - waterTop) * 0.7;

    // Reflection column: inverted triangle of green light on water
    const topW = 2 + breathe * 2;
    const botW = 15 + breathe * 10 + Math.sin(t * 0.3) * 3; // oscillates

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let y = 0; y < reflH; y += 3) {
      const progress = y / reflH;
      const width = topW + (botW - topW) * progress;
      const opacity = 0.06 * (1 - progress * 0.8);

      // Wobble with ripples
      const wobble = Math.sin(y * 0.05 + t * 1.5) * 2 * progress;

      ctx.fillStyle = `rgba(57, 255, 133, ${opacity})`;
      ctx.fillRect(lightX - width / 2 + wobble, waterTop + y, width, 2);
    }

    ctx.restore();
  },

  _drawHaze(ctx, lightX, horizonY, w, t) {
    // Atmospheric scatter: faint green smear at horizon
    const hazeW = w * 0.3;
    const hazeH = 20;
    // Parallax: shifts slightly over time (forward movement illusion)
    const parallaxShift = Math.sin(t * 0.1) * 5;

    const hazeGrad = ctx.createRadialGradient(
      lightX + parallaxShift, horizonY, 0,
      lightX + parallaxShift, horizonY, hazeW / 2
    );
    hazeGrad.addColorStop(0, 'rgba(57, 255, 133, 0.03)');
    hazeGrad.addColorStop(1, 'rgba(57, 255, 133, 0)');

    ctx.fillStyle = hazeGrad;
    ctx.fillRect(lightX - hazeW / 2, horizonY - hazeH / 2, hazeW, hazeH);
  },

  _drawVignette(ctx, w, h, t) {
    // Cyclic vignette darkening at edges (forward movement)
    const intensity = 0.15 + Math.sin(t * 0.08) * 0.05;

    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  },
};
