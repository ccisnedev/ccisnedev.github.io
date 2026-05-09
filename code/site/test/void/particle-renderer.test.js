import { describe, it, expect, beforeEach } from 'vitest';
import { renderParticles, renderStrokeIncrement } from '../../js/themes/void/particle-renderer.js';
import { createParticleCloud } from '../../js/themes/void/particle-cloud.js';

function createMockCtx() {
  const ops = [];
  return {
    ops,
    beginPath() { ops.push({ type: 'beginPath' }); },
    moveTo(x, y) { ops.push({ type: 'moveTo', x, y }); },
    lineTo(x, y) { ops.push({ type: 'lineTo', x, y }); },
    arc(x, y, r, a0, a1) { ops.push({ type: 'arc', x, y, r }); },
    fillRect(x, y, w, h) { ops.push({ type: 'fillRect', x, y, w, h }); },
    fill() { ops.push({ type: 'fill' }); },
    stroke() { ops.push({ type: 'stroke' }); },
    closePath() { ops.push({ type: 'closePath' }); },
    set fillStyle(v) { ops.push({ type: 'fillStyle', value: v }); },
    set strokeStyle(v) { ops.push({ type: 'strokeStyle', value: v }); },
    set lineWidth(v) { ops.push({ type: 'lineWidth', value: v }); },
    set globalAlpha(v) { ops.push({ type: 'globalAlpha', value: v }); },
    set lineCap(v) { ops.push({ type: 'lineCap', value: v }); },
    save() { ops.push({ type: 'save' }); },
    restore() { ops.push({ type: 'restore' }); },
  };
}

function makeSamples(n) {
  const samples = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const angle = t * Math.PI * 2 * 0.8; // ~80% of a circle
    samples.push({
      x: 200 + Math.cos(angle) * 100,
      y: 200 + Math.sin(angle) * 100,
      t,
      angle,
      nx: -Math.sin(angle),
      ny: Math.cos(angle),
    });
  }
  return samples;
}

describe('renderParticles', () => {
  let ctx;
  beforeEach(() => { ctx = createMockCtx(); });

  it('renders an ink pool in phase 1 instead of per-bristle circles', () => {
    const cloud = createParticleCloud(20, 10, 42);
    const samples = makeSamples(50);

    renderParticles(ctx, cloud, samples, {
      progress: 0,
      dropProgress: 0.5, // halfway through drop formation
      brushRadius: 10,
      color: 'rgba(240,240,240,1)',
      seed: 42,
    });

    const cells = ctx.ops.filter(o => o.type === 'fillRect');
    const arcs = ctx.ops.filter(o => o.type === 'arc');
    expect(cells.length).toBeGreaterThan(20);
    expect(arcs.length).toBe(0);
  });

  it('ink pool footprint grows with dropProgress', () => {
    const cloud = createParticleCloud(5, 10, 42);
    const samples = makeSamples(50);

    // Smaller footprint at low dropProgress
    renderParticles(ctx, cloud, samples, {
      progress: 0, dropProgress: 0.1, brushRadius: 10, color: 'white', seed: 42,
    });
    const smallCells = ctx.ops.filter(o => o.type === 'fillRect').length;

    ctx.ops.length = 0;

    // Larger footprint at high dropProgress
    renderParticles(ctx, cloud, samples, {
      progress: 0, dropProgress: 0.9, brushRadius: 10, color: 'white', seed: 42,
    });
    const bigCells = ctx.ops.filter(o => o.type === 'fillRect').length;

    expect(bigCells).toBeGreaterThan(smallCells);
  });

  it('renders strokes in phase 2 (tracing)', () => {
    const cloud = createParticleCloud(10, 10, 42);
    const samples = makeSamples(50);

    renderParticles(ctx, cloud, samples, {
      progress: 0.5, // halfway through stroke
      dropProgress: 1,
      brushRadius: 10,
      color: 'rgba(240,240,240,1)',
      seed: 42,
    });

    // Should have stroke operations (polylines)
    const strokes = ctx.ops.filter(o => o.type === 'stroke');
    expect(strokes.length).toBeGreaterThan(0);
  });

  it('dead particles are not rendered in stroke phase', () => {
    const cloud = createParticleCloud(20, 10, 42).map(p => ({
      ...p,
      inkReserve: 0,
      strong: false,
      relightAt: 0,
    }));
    const samples = makeSamples(50);

    renderParticles(ctx, cloud, samples, {
      progress: 1.0,
      dropProgress: 1,
      brushRadius: 1, // tiny radius = most particles are "outer" = most die
      color: 'white',
      seed: 42,
    });

    const strokes = ctx.ops.filter(o => o.type === 'stroke');
    expect(strokes.length).toBe(0);
  });

  it('stroke opacity drops as ink depletes late in the stroke', () => {
    const cloud = createParticleCloud(50, 10, 42);
    const samples = makeSamples(100);

    renderParticles(ctx, cloud, samples, {
      progress: 0.35, dropProgress: 1, brushRadius: 10, color: 'white', seed: 42,
    });
    const earlyAlpha = Math.max(...ctx.ops.filter(o => o.type === 'globalAlpha').map(o => o.value));

    ctx.ops.length = 0;

    renderParticles(ctx, cloud, samples, {
      progress: 0.95, dropProgress: 1, brushRadius: 10, color: 'white', seed: 42,
    });
    const lateAlpha = Math.max(...ctx.ops.filter(o => o.type === 'globalAlpha').map(o => o.value));

    expect(earlyAlpha).toBeGreaterThan(lateAlpha);
  });

  it('uses save/restore for state isolation', () => {
    const cloud = createParticleCloud(10, 10, 42);
    const samples = makeSamples(50);

    renderParticles(ctx, cloud, samples, {
      progress: 0.5, dropProgress: 1, brushRadius: 10, color: 'white', seed: 42,
    });

    const saves = ctx.ops.filter(o => o.type === 'save').length;
    const restores = ctx.ops.filter(o => o.type === 'restore').length;
    expect(saves).toBe(restores);
    expect(saves).toBeGreaterThan(0);
  });
});

describe('renderStrokeIncrement', () => {
  let ctx;
  beforeEach(() => { ctx = createMockCtx(); });

  it('draws only the new segment between fromProgress and toProgress', () => {
    const cloud = createParticleCloud(10, 10, 42);
    const samples = makeSamples(100);

    renderStrokeIncrement(ctx, cloud, samples, {
      fromProgress: 0.2,
      toProgress: 0.4,
      brushRadius: 10,
      color: 'white',
      seed: 42,
    });

    // Should have strokes (alive particles draw segments)
    const strokes = ctx.ops.filter(o => o.type === 'stroke');
    expect(strokes.length).toBeGreaterThan(0);

    // Each polyline should have limited lineTo ops (not full path)
    const lineTos = ctx.ops.filter(o => o.type === 'lineTo');
    const moveTos = ctx.ops.filter(o => o.type === 'moveTo');
    // At most ~20 samples per particle (40% - 20% = 20% of 100 samples)
    // Plus connection sample, so ≈21 lineTos per particle
    for (const stroke of strokes) {
      // Not drawing the full 100 samples
    }
    expect(lineTos.length).toBeLessThan(strokes.length * 50);
  });

  it('does not draw if fromProgress equals toProgress', () => {
    const cloud = createParticleCloud(10, 10, 42);
    const samples = makeSamples(50);

    renderStrokeIncrement(ctx, cloud, samples, {
      fromProgress: 0.5,
      toProgress: 0.5,
      brushRadius: 10,
      color: 'white',
      seed: 42,
    });

    const strokes = ctx.ops.filter(o => o.type === 'stroke');
    expect(strokes.length).toBe(0);
  });

  it('skips dead particles', () => {
    const cloud = createParticleCloud(30, 10, 42).map(p => ({
      ...p,
      inkReserve: 0,
      strong: false,
      relightAt: 0,
    }));
    const samples = makeSamples(100);

    renderStrokeIncrement(ctx, cloud, samples, {
      fromProgress: 0.2,
      toProgress: 0.4,
      brushRadius: 10,
      color: 'white',
      seed: 42,
    });

    const strokes = ctx.ops.filter(o => o.type === 'stroke');
    expect(strokes.length).toBe(0);
  });

  it('connects to previous segment with moveTo at fromIndex', () => {
    const cloud = createParticleCloud(5, 10, 42);
    const samples = makeSamples(100);

    renderStrokeIncrement(ctx, cloud, samples, {
      fromProgress: 0.3,
      toProgress: 0.5,
      brushRadius: 10,
      color: 'white',
      seed: 42,
    });

    // Each alive particle should start with beginPath + moveTo
    const beginPaths = ctx.ops.filter(o => o.type === 'beginPath');
    const moveTos = ctx.ops.filter(o => o.type === 'moveTo');
    expect(beginPaths.length).toBe(moveTos.length);
  });

  it('uses save/restore for state isolation', () => {
    const cloud = createParticleCloud(10, 10, 42);
    const samples = makeSamples(50);

    renderStrokeIncrement(ctx, cloud, samples, {
      fromProgress: 0.1,
      toProgress: 0.3,
      brushRadius: 10,
      color: 'white',
      seed: 42,
    });

    const saves = ctx.ops.filter(o => o.type === 'save').length;
    const restores = ctx.ops.filter(o => o.type === 'restore').length;
    expect(saves).toBe(restores);
    expect(saves).toBeGreaterThan(0);
  });
});
