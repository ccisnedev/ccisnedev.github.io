import { describe, it, expect, beforeEach } from 'vitest';
import { compositeStroke } from '../../js/themes/void/stroke-compositor.js';

function createMockCtx() {
  const ops = [];
  return {
    ops,
    beginPath() { ops.push({ type: 'beginPath' }); },
    moveTo(x, y) { ops.push({ type: 'moveTo', x, y }); },
    lineTo(x, y) { ops.push({ type: 'lineTo', x, y }); },
    arc(x, y, r, s, e) { ops.push({ type: 'arc', x, y, r }); },
    ellipse(x, y, rx, ry, rot, s, e) { ops.push({ type: 'ellipse' }); },
    quadraticCurveTo(cpx, cpy, x, y) { ops.push({ type: 'quadraticCurveTo' }); },
    closePath() { ops.push({ type: 'closePath' }); },
    fill() { ops.push({ type: 'fill' }); },
    stroke() { ops.push({ type: 'stroke' }); },
    drawImage() { ops.push({ type: 'drawImage' }); },
    putImageData() { ops.push({ type: 'putImageData' }); },
    getImageData() { return { data: new Uint8ClampedArray(4) }; },
    set fillStyle(v) { ops.push({ type: 'fillStyle', value: v }); },
    set strokeStyle(v) { ops.push({ type: 'strokeStyle', value: v }); },
    set lineWidth(v) { ops.push({ type: 'lineWidth', value: v }); },
    set lineCap(v) { ops.push({ type: 'lineCap', value: v }); },
    set globalAlpha(v) { ops.push({ type: 'globalAlpha', value: v }); },
    set globalCompositeOperation(v) { ops.push({ type: 'compositeOp', value: v }); },
    save() { ops.push({ type: 'save' }); },
    restore() { ops.push({ type: 'restore' }); },
    canvas: { width: 400, height: 400 },
  };
}

function makeSamples(n) {
  const samples = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    samples.push({ x: 100 + t * 200, y: 200, t, angle: 0, nx: 0, ny: -1 });
  }
  return samples;
}

describe('compositeStroke', () => {
  let ctx;
  beforeEach(() => { ctx = createMockCtx(); });

  it('calls mass layer (produces fill ops)', () => {
    const samples = makeSamples(20);
    compositeStroke(ctx, samples, { brushWidth: 30, seed: 42, fiberCount: 10 });

    const fills = ctx.ops.filter(o => o.type === 'fill');
    expect(fills.length).toBeGreaterThan(0);
  });

  it('calls fiber renderer (produces stroke ops)', () => {
    const samples = makeSamples(20);
    compositeStroke(ctx, samples, { brushWidth: 30, seed: 42, fiberCount: 10 });

    const strokes = ctx.ops.filter(o => o.type === 'stroke');
    expect(strokes.length).toBeGreaterThanOrEqual(10);
  });

  it('calls splatter (produces arc ops)', () => {
    const samples = makeSamples(40);
    compositeStroke(ctx, samples, { brushWidth: 30, seed: 42, fiberCount: 5, splatterDensity: 1.0 });

    const arcs = ctx.ops.filter(o => o.type === 'arc');
    expect(arcs.length).toBeGreaterThan(0);
  });

  it('renders layers in order: mass, fibers, splatter', () => {
    const samples = makeSamples(40);
    compositeStroke(ctx, samples, { brushWidth: 30, seed: 42, fiberCount: 5, splatterDensity: 1.0 });

    // First fill (mass) should come before first stroke (fibers)
    const firstFill = ctx.ops.findIndex(o => o.type === 'fill');
    const firstStroke = ctx.ops.findIndex(o => o.type === 'stroke');
    const firstArc = ctx.ops.findIndex(o => o.type === 'arc');

    expect(firstFill).toBeLessThan(firstStroke);
    expect(firstStroke).toBeLessThan(firstArc);
  });

  it('uses save/restore around each layer', () => {
    const samples = makeSamples(10);
    compositeStroke(ctx, samples, { brushWidth: 30, seed: 42, fiberCount: 3 });

    const saves = ctx.ops.filter(o => o.type === 'save').length;
    const restores = ctx.ops.filter(o => o.type === 'restore').length;
    expect(saves).toBe(restores);
    expect(saves).toBeGreaterThanOrEqual(3); // mass + fibers (each) + splatter
  });

  it('works with zero fibers (mass + splatter only)', () => {
    const samples = makeSamples(10);
    compositeStroke(ctx, samples, { brushWidth: 30, seed: 42, fiberCount: 0, splatterDensity: 0.5 });

    const fills = ctx.ops.filter(o => o.type === 'fill');
    expect(fills.length).toBeGreaterThan(0);
  });
});
