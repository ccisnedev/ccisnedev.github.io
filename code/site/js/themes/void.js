import { generateEnso, estimateLength } from './void/enso-path.js';
import { samplePath } from './void/path-sampling.js';
import { createParticleCloud } from './void/particle-cloud.js';
import { createInkPool } from './void/ink-pool.js';
import { renderParticles, renderStrokeIncrement } from './void/particle-renderer.js';

export function strokeTiming(rawProgress) {
  const t = Math.max(0, Math.min(1, rawProgress));
  if (t <= 0.12) {
    return 0.02 * Math.pow(t / 0.12, 3);
  }
  if (t <= 0.38) {
    const p = (t - 0.12) / 0.26;
    return 0.02 + 0.38 * p * p;
  }
  const p = (t - 0.38) / 0.62;
  return 0.4 + 0.6 * (1 - Math.pow(1 - p, 3));
}

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
    this._ensoPath = generateEnso(this._w, this._h);
    this._ensoLength = estimateLength(this._ensoPath);
    this._ensoSeed = Math.floor(Math.random() * 100000);
    this._brushTip = null;
    this._inkPool = null;

    // Offscreen buffer for accumulative ink
    this._createBuffer();
    this._lastStrokeProgress = 0;

    this._fill();
  },

  resize(width, height) {
    this._w = width;
    this._h = height;
    // Regenerate for new dimensions
    this._ensoPath = generateEnso(this._w, this._h);
    this._ensoLength = estimateLength(this._ensoPath);
    this._drawn = false;
    this._startTime = null;
    this._cachedFrame = null;
    this._brushTip = null;
    this._pathSamples = null;
    this._paperTexture = null;
    this._lastStrokeProgress = 0;
    this._cloud = null;
    this._inkPool = null;
    this._createBuffer();
  },

  frame(timestamp) {
    if (!this._ctx) return true;

    if (this._startTime === null) this._startTime = timestamp;
    const elapsed = (timestamp - this._startTime) / 1000; // seconds

    // Phase 1: pure black (0 - 0.5s)
    // Phase 2: noise awakens (0.5 - 1.0s)
    // Phase 3: stroke traces (1.0 - 4.2s) with slow contact, acceleration,
    // and a long decelerating finish.

    const strokeStart = 1.0;
    const strokeDuration = 3.2;

    // Background: living black
    if (elapsed > 0.5 && !this._drawn) {
      this._drawNoise(timestamp);
    } else if (!this._drawn) {
      this._fill();
    }

    // Once fully drawn, stop re-rendering
    if (this._drawn && this._cachedFrame) {
      return true;
    }

    // Particle stroke animation
    if (elapsed > strokeStart) {
      const rawProgress = Math.min((elapsed - strokeStart) / strokeDuration, 1);
      const strokeProgress = strokeTiming(rawProgress);

      if (strokeProgress >= 1 && !this._drawn) {
        this._drawn = true;
      }

      // Render onto offscreen buffer (accumulative)
      this._renderToBuffer(strokeProgress);

      // Composite: background + buffer
      this._fill();
      if (this._bufferCanvas && this._bufferCtx) {
        this._ctx.drawImage(this._bufferCanvas, 0, 0);
      }

      if (this._drawn) this._cachedFrame = true;
    }

    return true;
  },

  destroy() {
    this._ctx = null;
    this._canvas = null;
    this._ensoPath = null;
    this._startTime = null;
    this._drawn = false;
    this._cachedFrame = null;
    this._brushTip = null;
    this._bufferCanvas = null;
    this._bufferCtx = null;
    this._cloud = null;
    this._inkPool = null;
  },

  reducedMotion() {
    if (!this._ctx) return;
    this._fill();
    // Simulate progressive rendering to accumulate ink in buffer
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      const strokeProgress = i / steps;
      this._renderToBuffer(strokeProgress);
    }
    if (this._bufferCanvas && this._bufferCtx) {
      this._ctx.drawImage(this._bufferCanvas, 0, 0);
    }
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

  _createBuffer() {
    try {
      if (typeof OffscreenCanvas !== 'undefined') {
        this._bufferCanvas = new OffscreenCanvas(this._w, this._h);
      } else {
        this._bufferCanvas = document.createElement('canvas');
        this._bufferCanvas.width = this._w;
        this._bufferCanvas.height = this._h;
      }
      this._bufferCtx = this._bufferCanvas.getContext('2d');
    } catch (e) {
      this._bufferCanvas = null;
      this._bufferCtx = null;
    }
  },

  _getCloud() {
    if (!this._cloud) {
      if (!this._pathSamples) {
        this._pathSamples = samplePath(this._ensoPath, 200);
      }
      const brushRadius = Math.min(this._w, this._h) * 0.025;
      this._cloud = createParticleCloud(150, brushRadius, this._ensoSeed || 0);
    }
    return this._cloud;
  },

  _getInkPool(brushRadius) {
    if (!this._inkPool) {
      this._inkPool = createInkPool((this._ensoSeed || 0) + 101, brushRadius);
    }
    return this._inkPool;
  },

  _renderToBuffer(strokeProgress) {
    // Use buffer ctx if available, fallback to main ctx (test environments)
    const ctx = this._bufferCtx || this._ctx;
    if (!ctx || !this._ensoPath) return;

    if (!this._pathSamples) {
      this._pathSamples = samplePath(this._ensoPath, 200);
    }

    const brushRadius = Math.min(this._w, this._h) * 0.025;
    const cloud = this._getCloud();
    const inkPool = this._getInkPool(brushRadius);
    const color = 'rgba(240, 240, 240, 1)';
    const seed = this._ensoSeed || 0;

    if (strokeProgress <= 0) return;

    // Stroke phase: draw only the NEW segment incrementally.
    if (this._lastStrokeProgress <= 0) {
      ctx.clearRect(0, 0, this._w, this._h);
      renderParticles(ctx, cloud, this._pathSamples, {
        progress: 0,
        dropProgress: 1,
        brushRadius,
        color,
        seed,
        inkPool,
      });
    }

    renderStrokeIncrement(ctx, cloud, this._pathSamples, {
      fromProgress: this._lastStrokeProgress,
      toProgress: strokeProgress,
      brushRadius,
      color,
      seed,
    });

    this._lastStrokeProgress = strokeProgress;
  },
};
