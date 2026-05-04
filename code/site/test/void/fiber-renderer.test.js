import { describe, it, expect, beforeEach } from 'vitest';
import { renderFibers } from '../../js/themes/void/fiber-renderer.js';

/**
 * Minimal Canvas2D mock that records draw operations.
 */
function createMockCtx() {
  const ops = [];
  return {
    ops,
    beginPath() { ops.push({ type: 'beginPath' }); },
    moveTo(x, y) { ops.push({ type: 'moveTo', x, y }); },
    lineTo(x, y) { ops.push({ type: 'lineTo', x, y }); },
    stroke() { ops.push({ type: 'stroke' }); },
    set strokeStyle(v) { ops.push({ type: 'strokeStyle', value: v }); },
    set lineWidth(v) { ops.push({ type: 'lineWidth', value: v }); },
    set lineCap(v) { ops.push({ type: 'lineCap', value: v }); },
    set globalAlpha(v) { ops.push({ type: 'globalAlpha', value: v }); },
    save() { ops.push({ type: 'save' }); },
    restore() { ops.push({ type: 'restore' }); },
  };
}

/** Minimal sample set — a straight horizontal line */
function makeSamples(n) {
  const samples = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    samples.push({ x: 100 + t * 200, y: 150, t, angle: 0, nx: 0, ny: -1 });
  }
  return samples;
}

describe('renderFibers', () => {
  let ctx;
  beforeEach(() => { ctx = createMockCtx(); });

  it('draws one polyline per fiber', () => {
    const fibers = [
      { id: 0, offset: 0, retention: 0.9, phase: 0 },
      { id: 1, offset: 0.3, retention: 0.8, phase: 1.2 },
    ];
    const samples = makeSamples(10);
    renderFibers(ctx, fibers, samples, { brushWidth: 20, seed: 42 });

    const strokes = ctx.ops.filter(o => o.type === 'stroke');
    expect(strokes.length).toBeGreaterThanOrEqual(2);
  });

  it('produces lineTo operations for each segment', () => {
    const fibers = [{ id: 0, offset: 0, retention: 0.9, phase: 0 }];
    const samples = makeSamples(10);
    renderFibers(ctx, fibers, samples, { brushWidth: 20, seed: 42 });

    const lineTos = ctx.ops.filter(o => o.type === 'lineTo');
    expect(lineTos.length).toBeGreaterThanOrEqual(8); // N-1 segments min
  });

  it('external fibers are offset from center in normal direction', () => {
    const fibers = [
      { id: 0, offset: 0.5, retention: 0.8, phase: 0 },
    ];
    const samples = makeSamples(5);
    renderFibers(ctx, fibers, samples, { brushWidth: 40, seed: 42 });

    const moveTos = ctx.ops.filter(o => o.type === 'moveTo');
    // With ny = -1 and offset = 0.5 and brushWidth = 40: displaced by ~10 px from y=150
    expect(moveTos.length).toBeGreaterThan(0);
    const firstMove = moveTos[0];
    // Should be offset from center line (y=150)
    expect(firstMove.y).not.toBeCloseTo(150, 0);
  });

  it('applies perlin wobble (non-straight fiber paths)', () => {
    const fibers = [{ id: 0, offset: 0, retention: 0.9, phase: 0 }];
    const samples = makeSamples(20);
    renderFibers(ctx, fibers, samples, { brushWidth: 20, seed: 42, wobbleFreq: 3, wobbleAmp: 5 });

    const lineTos = ctx.ops.filter(o => o.type === 'lineTo');
    // With wobble, y coords should vary (not all exactly 150)
    const yValues = lineTos.map(o => o.y);
    const allSameY = yValues.every(y => Math.abs(y - yValues[0]) < 0.001);
    expect(allSameY).toBe(false);
  });

  it('sets lineWidth from fiberWidth model', () => {
    const fibers = [{ id: 0, offset: 0, retention: 0.9, phase: 0 }];
    const samples = makeSamples(5);
    renderFibers(ctx, fibers, samples, { brushWidth: 20, seed: 42 });

    const widthOps = ctx.ops.filter(o => o.type === 'lineWidth');
    expect(widthOps.length).toBeGreaterThan(0);
    // Width should be positive and reasonable
    widthOps.forEach(op => {
      expect(op.value).toBeGreaterThan(0);
      expect(op.value).toBeLessThan(20);
    });
  });

  it('respects ink color option', () => {
    const fibers = [{ id: 0, offset: 0, retention: 0.9, phase: 0 }];
    const samples = makeSamples(5);
    renderFibers(ctx, fibers, samples, { brushWidth: 20, seed: 42, color: 'rgba(30,30,30,1)' });

    const styleOps = ctx.ops.filter(o => o.type === 'strokeStyle');
    expect(styleOps.length).toBeGreaterThan(0);
  });

  it('applies globalAlpha for ink depletion', () => {
    const fibers = [{ id: 0, offset: 0, retention: 0.9, phase: 0 }];
    const samples = makeSamples(10);
    renderFibers(ctx, fibers, samples, { brushWidth: 20, seed: 42 });

    const alphaOps = ctx.ops.filter(o => o.type === 'globalAlpha');
    expect(alphaOps.length).toBeGreaterThan(0);
    // Alpha should decrease over the stroke
    const alphaValues = alphaOps.map(o => o.value);
    expect(alphaValues[0]).toBeGreaterThanOrEqual(alphaValues[alphaValues.length - 1]);
  });

  it('draws nothing for zero fibers', () => {
    renderFibers(ctx, [], makeSamples(5), { brushWidth: 20, seed: 42 });
    const strokes = ctx.ops.filter(o => o.type === 'stroke');
    expect(strokes.length).toBe(0);
  });
});
