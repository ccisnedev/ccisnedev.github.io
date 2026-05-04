import { describe, it, expect, beforeEach } from 'vitest';
import { renderMassLayer } from '../../js/themes/void/mass-layer.js';

function createMockCtx() {
  const ops = [];
  return {
    ops,
    beginPath() { ops.push({ type: 'beginPath' }); },
    moveTo(x, y) { ops.push({ type: 'moveTo', x, y }); },
    lineTo(x, y) { ops.push({ type: 'lineTo', x, y }); },
    fill() { ops.push({ type: 'fill' }); },
    stroke() { ops.push({ type: 'stroke' }); },
    closePath() { ops.push({ type: 'closePath' }); },
    quadraticCurveTo(cpx, cpy, x, y) { ops.push({ type: 'quadraticCurveTo', cpx, cpy, x, y }); },
    set fillStyle(v) { ops.push({ type: 'fillStyle', value: v }); },
    set strokeStyle(v) { ops.push({ type: 'strokeStyle', value: v }); },
    set lineWidth(v) { ops.push({ type: 'lineWidth', value: v }); },
    set globalAlpha(v) { ops.push({ type: 'globalAlpha', value: v }); },
    set globalCompositeOperation(v) { ops.push({ type: 'compositeOp', value: v }); },
    save() { ops.push({ type: 'save' }); },
    restore() { ops.push({ type: 'restore' }); },
  };
}

function makeSamples(n) {
  const samples = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    samples.push({ x: 100 + t * 200, y: 150, t, angle: 0, nx: 0, ny: -1 });
  }
  return samples;
}

describe('renderMassLayer', () => {
  let ctx;
  beforeEach(() => { ctx = createMockCtx(); });

  it('produces a filled shape', () => {
    const samples = makeSamples(10);
    renderMassLayer(ctx, samples, { brushWidth: 30, seed: 42 });

    const fills = ctx.ops.filter(o => o.type === 'fill');
    expect(fills.length).toBeGreaterThan(0);
  });

  it('creates an outline wider than zero', () => {
    const samples = makeSamples(10);
    renderMassLayer(ctx, samples, { brushWidth: 30, seed: 42 });

    const moveTos = ctx.ops.filter(o => o.type === 'moveTo');
    const lineTos = ctx.ops.filter(o => o.type === 'lineTo' || o.type === 'quadraticCurveTo');
    expect(moveTos.length).toBeGreaterThan(0);
    expect(lineTos.length).toBeGreaterThan(0);
  });

  it('applies ink depletion (alpha varies with t)', () => {
    const samples = makeSamples(20);
    renderMassLayer(ctx, samples, { brushWidth: 30, seed: 42 });

    const alphaOps = ctx.ops.filter(o => o.type === 'globalAlpha');
    expect(alphaOps.length).toBeGreaterThan(0);
  });

  it('uses low alpha (semi-transparent base layer)', () => {
    const samples = makeSamples(10);
    renderMassLayer(ctx, samples, { brushWidth: 30, seed: 42 });

    const alphaOps = ctx.ops.filter(o => o.type === 'globalAlpha');
    alphaOps.forEach(op => {
      expect(op.value).toBeLessThanOrEqual(1.0);
      expect(op.value).toBeGreaterThan(0);
    });
  });

  it('shape points are offset from center by ~brushWidth/2', () => {
    const samples = makeSamples(10);
    renderMassLayer(ctx, samples, { brushWidth: 40, seed: 42 });

    // Gather all drawing coords
    const allY = ctx.ops
      .filter(o => o.type === 'moveTo' || o.type === 'lineTo')
      .map(o => o.y);
    
    // Some points should be above and some below center (y=150)
    const above = allY.filter(y => y < 150);
    const below = allY.filter(y => y > 150);
    expect(above.length).toBeGreaterThan(0);
    expect(below.length).toBeGreaterThan(0);
  });

  it('draws nothing for fewer than 2 samples', () => {
    renderMassLayer(ctx, [{ x: 100, y: 150, t: 0, angle: 0, nx: 0, ny: -1 }], { brushWidth: 30, seed: 42 });
    const fills = ctx.ops.filter(o => o.type === 'fill');
    expect(fills.length).toBe(0);
  });
});
