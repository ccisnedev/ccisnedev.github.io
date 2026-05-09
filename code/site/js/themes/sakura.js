/**
 * Sakura theme — a contemplative spring morning.
 *
 * Pipeline (one offscreen buffer, mutated as the scene matures):
 *  1. CSS gradient sky (handled by body[data-theme] CSS)
 *  2. Forest backdrop: layered bokeh — pre-baked once at scene init.
 *  3. Branches: cascading growth. The instant a branch reaches progress=1 it
 *     is committed to the buffer and marked `_baked`. There is no global
 *     branch-bake step that could later paint over already-committed flowers.
 *  4. Blossoms: each one is anchored to its host branch's completion time
 *     AND gated on `branch._baked`. A blossom can only fade in (and later be
 *     baked into the buffer) once its host branch has been placed on screen.
 *     Buffer raster order is therefore always: forest → branch → blossom.
 *  5. Falling petals: enter from the top one by one with their own fade-in,
 *     starting once enough blossoms are open.
 *
 * Hot path goal: in steady state the only per-frame work is `clearRect`,
 * one `drawImage(buffer)` and the petal animation.
 */

import { generateBranches, _bezierPoint } from './sakura/branch-generator.js';
import { generateBlossoms, drawBlossom } from './sakura/blossom-renderer.js';
import { generateForestLayers, drawForestLayer } from './sakura/forest-backdrop.js';

const PETAL_COLORS = ['#ffffff', '#fff5f7', '#fce4ec', '#f8bbd0', '#ffffff'];
const DESKTOP_COUNT = 28;
const MOBILE_COUNT = 11;

// Branch growth: total tree-growth duration randomized each scene
const GROWTH_DURATION_MIN_MS = 2000;
const GROWTH_DURATION_MAX_MS = 3000;
const BRANCH_BEZIER_SAMPLES = 22;

// Blossom blooming: each blossom is anchored to its host branch's end
const BLOSSOM_FADE_MS = 360;
const BLOSSOM_BRANCH_END_DELAY_MS = 90;
const BLOSSOM_INTRA_BRANCH_STAGGER_MS = 45;
const BLOSSOM_APPEAR_JITTER_MS = 40;

// Petals: when a fraction of blossoms have started appearing, the rain begins
const PETAL_PHASE_TRIGGER_FRACTION = 0.7;
const PETAL_SPAWN_DURATION_MIN_MS = 5000;
const PETAL_SPAWN_DURATION_MAX_MS = 7000;
const PETAL_APPEAR_JITTER_MS = 180;
const PETAL_FADE_MS = 600;

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
    this._branches = [];
    this._blossoms = [];
    this._elapsed = 0;
    this._growthTotalDuration = 0;
    this._petalsStartAt = 0;

    this._buildScene();
    this._spawnPetals();
  },

  resize(width, height) {
    this._w = width;
    this._h = height;
    this._lastTime = null;
    this._elapsed = 0;
    this._buildScene();
    this._spawnPetals();
  },

  frame(timestamp) {
    if (!this._ctx) return true;

    if (this._lastTime === null) this._lastTime = timestamp;
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    this._windPhase += dt * 0.5;
    this._elapsed += dt * 1000;

    const ctx = this._ctx;

    // --- Branch update: each branch bakes the moment it reaches progress=1.
    // Parents finish before children (cascade timing) so the buffer raster
    // order naturally follows the tree topology.
    for (const b of this._branches) {
      if (b._baked) continue;
      const local = this._elapsed - b._startTime;
      if (local >= b._duration) {
        b._progress = 1;
        this._bakeBranch(b);
      } else {
        b._progress = local <= 0 ? 0 : local / b._duration;
      }
    }

    // --- Blossom update: a blossom may only begin its fade once its host
    // branch is baked. This is the load-bearing invariant — without it,
    // flowers can be committed to the buffer ahead of their host branch
    // and the branch later paints over them.
    for (const blossom of this._blossoms) {
      if (blossom._baked) continue;
      const branch = this._branches[blossom.branchIndex];
      if (!branch || !branch._baked) {
        blossom._alpha = 0;
        continue;
      }
      const local = this._elapsed - blossom._appearAt;
      if (local <= 0) {
        blossom._alpha = 0;
      } else if (local >= BLOSSOM_FADE_MS) {
        blossom._alpha = 1;
        this._bakeBlossom(blossom);
      } else {
        blossom._alpha = local / BLOSSOM_FADE_MS;
      }
    }

    // --- Render ---
    ctx.clearRect(0, 0, this._w, this._h);
    if (this._buffer) ctx.drawImage(this._buffer, 0, 0);

    const hasBuffer = this._buffer != null;

    // Live (not-yet-baked) branches drawn on top of the buffer.
    // Buffer-less environments (tests) live-render baked items too, so the
    // scene is still visible even though the buffer optimization is bypassed.
    for (const b of this._branches) {
      if (b._baked && hasBuffer) continue;
      if (b._progress > 0) this._drawBranchPartial(ctx, b, b._progress);
    }

    // Live (fading-in) blossoms — only those not yet baked
    for (const blossom of this._blossoms) {
      if (blossom._baked && hasBuffer) continue;
      if (blossom._alpha <= 0) continue;
      drawBlossom(ctx, blossom, this._easeOut(blossom._alpha));
    }

    // Falling petals (with their own fade-in on first appearance)
    if (this._elapsed >= this._petalsStartAt) {
      for (const p of this._petals) {
        if (this._elapsed < p.appearAt) continue;
        this._updatePetal(p, dt);
        const life = this._elapsed - p.appearAt;
        const fade = life >= PETAL_FADE_MS ? 1 : life / PETAL_FADE_MS;
        this._drawPetal(ctx, p, fade);
      }
    }

    return true;
  },

  destroy() {
    this._ctx = null;
    this._canvas = null;
    this._petals = [];
    this._blossoms = [];
    this._branches = [];
    this._buffer = null;
  },

  reducedMotion() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    // Force every staged element into the visible state for one static frame
    for (const b of this._branches) {
      if (!b._baked) {
        b._progress = 1;
        this._bakeBranch(b);
      }
    }
    for (const blossom of this._blossoms) {
      if (!blossom._baked) {
        blossom._alpha = 1;
        this._bakeBlossom(blossom);
      }
    }
    ctx.clearRect(0, 0, this._w, this._h);
    if (this._buffer) {
      ctx.drawImage(this._buffer, 0, 0);
    } else {
      for (const b of this._branches) this._drawBranchPartial(ctx, b, 1);
      for (const blossom of this._blossoms) drawBlossom(ctx, blossom, 1);
    }
    for (let i = 0; i < 5; i++) {
      const p = this._petals[i];
      if (!p) continue;
      p.y = Math.random() * this._h;
      this._drawPetal(ctx, p, 1);
    }
  },

  // --- Private ---

  _easeOut(t) {
    return 1 - (1 - t) * (1 - t);
  },

  _buildScene() {
    const w = this._w;
    const h = this._h;
    const seed = (Math.random() * 0xffffffff) >>> 0;

    // Always generate scene data — even if the offscreen buffer cannot be
    // created, we still want to render the scene live each frame.
    this._branches = generateBranches(w, h, seed);
    this._assignBranchTiming(this._branches);
    this._blossoms = generateBlossoms(this._branches, seed + 1);
    this._assignBlossomTiming(this._blossoms);
    this._petalsStartAt = this._computePetalsStartAt(this._blossoms);

    // Forest backdrop is the only thing pre-baked at startup
    const forestLayers = generateForestLayers(w, h, seed);

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

    for (const layer of forestLayers) {
      drawForestLayer(bCtx, layer);
    }
    this._buffer = buffer;
  },

  /**
   * Cascade timing: each child branch starts when its parent finishes.
   * Total duration is scaled to a randomized window in [MIN_MS, MAX_MS].
   */
  _assignBranchTiming(branches) {
    const n = branches.length;
    if (n === 0) {
      this._growthTotalDuration = 0;
      return;
    }

    const tol = 0.5;
    const parent = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const b = branches[i];
      for (let j = i - 1; j >= 0; j--) {
        const p = branches[j];
        if (Math.abs(p.x1 - b.x0) < tol && Math.abs(p.y1 - b.y0) < tol) {
          parent[i] = j;
          break;
        }
      }
    }

    const rawDur = new Array(n);
    for (let i = 0; i < n; i++) {
      const b = branches[i];
      const len = Math.hypot(b.x1 - b.x0, b.y1 - b.y0);
      rawDur[i] = Math.max(90, Math.min(550, len * 3.5));
    }

    const start = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = parent[i];
      start[i] = p === -1 ? 0 : start[p] + rawDur[p];
    }

    let rawTotal = 0;
    for (let i = 0; i < n; i++) {
      const end = start[i] + rawDur[i];
      if (end > rawTotal) rawTotal = end;
    }
    if (rawTotal <= 0) rawTotal = 1;

    const target = GROWTH_DURATION_MIN_MS +
      Math.random() * (GROWTH_DURATION_MAX_MS - GROWTH_DURATION_MIN_MS);
    const scale = target / rawTotal;

    for (let i = 0; i < n; i++) {
      branches[i]._startTime = start[i] * scale;
      branches[i]._duration = rawDur[i] * scale;
      branches[i]._progress = 0;
      branches[i]._baked = false;
    }
    this._growthTotalDuration = target;
  },

  /**
   * Each blossom's appearAt is anchored to its host branch's end time, with
   * a small per-blossom stagger so flowers on the same branch open one after
   * the other instead of all at once.
   */
  _assignBlossomTiming(blossoms) {
    for (const blossom of blossoms) {
      const branch = this._branches[blossom.branchIndex];
      const base = branch
        ? (branch._startTime + branch._duration + BLOSSOM_BRANCH_END_DELAY_MS)
        : 0;
      const stagger = blossom.intraBranchOrder * BLOSSOM_INTRA_BRANCH_STAGGER_MS;
      const jitter = (Math.random() - 0.5) * 2 * BLOSSOM_APPEAR_JITTER_MS;
      blossom._appearAt = Math.max(0, base + stagger + jitter);
      blossom._alpha = 0;
      blossom._baked = false;
    }
  },

  _computePetalsStartAt(blossoms) {
    if (blossoms.length === 0) return this._growthTotalDuration;
    const sorted = blossoms.map(b => b._appearAt).sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1,
      Math.floor(sorted.length * PETAL_PHASE_TRIGGER_FRACTION));
    return sorted[idx];
  },

  /**
   * Mark a branch as fully placed. Writes to the offscreen buffer when one
   * exists; the `_baked` flag is set unconditionally so downstream gates
   * (blossom fade-in, render-skip) work even in buffer-less environments.
   */
  _bakeBranch(branch) {
    if (this._buffer) {
      const bCtx = this._buffer.getContext('2d');
      if (bCtx) this._drawBranchPartial(bCtx, branch, 1);
    }
    branch._baked = true;
  },

  _bakeBlossom(blossom) {
    if (this._buffer) {
      const bCtx = this._buffer.getContext('2d');
      if (bCtx) drawBlossom(bCtx, blossom, 1);
    }
    blossom._baked = true;
  },

  /**
   * Stroke a bezier branch from t=0 to t=progress as a 22-segment polyline,
   * with a slight ease-out so growth eases gently into place. Used both for
   * live partial draws and for the final progress=1 commit (so there's no
   * rasterization snap between the last live frame and the baked frame).
   */
  _drawBranchPartial(ctx, b, progress) {
    const eased = this._easeOut(Math.max(0, Math.min(1, progress)));
    if (eased <= 0) return;

    const N = BRANCH_BEZIER_SAMPLES;
    const steps = Math.max(1, Math.ceil(N * eased));

    ctx.save();
    ctx.strokeStyle = b.depth < 2 ? '#4a3f3a' : '#6b5f58';
    ctx.lineWidth = b.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.9;

    ctx.beginPath();
    ctx.moveTo(b.x0, b.y0);
    for (let i = 1; i <= steps; i++) {
      const t = Math.min(eased, i / N);
      const x = _bezierPoint(b.x0, b.cx0, b.cx1, b.x1, t);
      const y = _bezierPoint(b.y0, b.cy0, b.cy1, b.y1, t);
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (b.width > 2) {
      ctx.strokeStyle = '#8b6f5e';
      ctx.lineWidth = b.width * 0.3;
      ctx.globalAlpha = 0.3;
      ctx.stroke();
    }

    ctx.restore();
  },

  _spawnPetals() {
    const count = this._w > 768 ? DESKTOP_COUNT : MOBILE_COUNT;
    const totalSpawn = PETAL_SPAWN_DURATION_MIN_MS +
      Math.random() * (PETAL_SPAWN_DURATION_MAX_MS - PETAL_SPAWN_DURATION_MIN_MS);
    this._petals = [];
    for (let i = 0; i < count; i++) {
      const p = this._createPetal(false);
      const base = (i / count) * totalSpawn;
      const jitter = (Math.random() - 0.5) * 2 * PETAL_APPEAR_JITTER_MS;
      p.appearAt = this._petalsStartAt + Math.max(0, base + jitter);
      this._petals.push(p);
    }
  },

  _createPetal(randomY) {
    const depth = Math.random();
    const size = 8 + depth * 7;
    return {
      x: Math.random() * this._w,
      y: randomY ? Math.random() * this._h : -size * 2,
      size,
      depth,
      fallSpeed: 15 + depth * 25,
      driftAmp: 40 + Math.random() * 60,
      driftFreq: 0.4 + Math.random() * 1.2,
      driftOffset: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: 0.5 + Math.random() * 1.5,
      tumble: Math.random() * Math.PI * 2,
      tumbleSpeed: 0.3 + Math.random() * 0.7,
      color: PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0],
      opacity: 0.7 + depth * 0.25,
      appearAt: 0,
    };
  },

  _updatePetal(p, dt) {
    p.y += p.fallSpeed * dt;
    p.rotation += p.rotSpeed * dt;
    p.tumble += p.tumbleSpeed * dt;

    const wind = Math.sin(this._windPhase * 0.7 + p.driftOffset) * 0.3;
    p.x += wind * p.driftAmp * dt;
    p.x += Math.sin(p.driftFreq * this._windPhase + p.driftOffset) * 0.5;

    if (p.y > this._h + 20) {
      p.y = -p.size * 2;
      p.x = Math.random() * this._w;
    }
    if (p.x > this._w + 20) p.x = -20;
    if (p.x < -20) p.x = this._w + 20;
  },

  _drawPetal(ctx, p, fadeAlpha) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    const scaleY = 0.4 + Math.abs(Math.sin(p.tumble)) * 0.6;
    ctx.scale(1, scaleY);

    ctx.globalAlpha = p.opacity * fadeAlpha;
    ctx.fillStyle = p.color;

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
