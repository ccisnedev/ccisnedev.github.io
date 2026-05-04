import { describe, it, expect, beforeEach } from 'vitest';
import { renderOrganicSplatter } from '../../js/themes/void/organic-splatter.js';

function createMockCtx() {
  const ops = [];
  return {
    ops,
    beginPath() { ops.push({ type: 'beginPath' }); },
    arc(x, y, r, s, e) { ops.push({ type: 'arc', x, y, r }); },
    ellipse(x, y, rx, ry, rot, s, e) { ops.push({ type: 'ellipse', x, y, rx, ry }); },
    fill() { ops.push({ type: 'fill' }); },
    set fillStyle(v) { ops.push({ type: 'fillStyle', value: v }); },
    set globalAlpha(v) { ops.push({ type: 'globalAlpha', value: v }); },
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

describe('renderOrganicSplatter', () => {
  let ctx;
  beforeEach(() => { ctx = createMockCtx(); });

  it('produces fill operations', () => {
    const samples = makeSamples(10);
    renderOrganicSplatter(ctx, samples, { brushWidth: 30, seed: 42 });

    const fills = ctx.ops.filter(o => o.type === 'fill');
    expect(fills.length).toBeGreaterThan(0);
  });

  it('droplets are near the stroke path', () => {
    const samples = makeSamples(10);
    renderOrganicSplatter(ctx, samples, { brushWidth: 30, seed: 42 });

    const arcs = ctx.ops.filter(o => o.type === 'arc' || o.type === 'ellipse');
    expect(arcs.length).toBeGreaterThan(0);
    // All droplets should be within reasonable distance of path center (y=150)
    arcs.forEach(a => {
      expect(Math.abs(a.y - 150)).toBeLessThan(80);
    });
  });

  it('droplets have small radii', () => {
    const samples = makeSamples(10);
    renderOrganicSplatter(ctx, samples, { brushWidth: 30, seed: 42 });

    const arcs = ctx.ops.filter(o => o.type === 'arc' || o.type === 'ellipse');
    arcs.forEach(a => {
      const r = a.r || a.rx;
      expect(r).toBeLessThan(10);
      expect(r).toBeGreaterThan(0);
    });
  });

  it('is deterministic', () => {
    const samples = makeSamples(10);
    const ctx1 = createMockCtx();
    const ctx2 = createMockCtx();
    renderOrganicSplatter(ctx1, samples, { brushWidth: 30, seed: 42 });
    renderOrganicSplatter(ctx2, samples, { brushWidth: 30, seed: 42 });

    const arcs1 = ctx1.ops.filter(o => o.type === 'arc' || o.type === 'ellipse');
    const arcs2 = ctx2.ops.filter(o => o.type === 'arc' || o.type === 'ellipse');
    expect(arcs1).toEqual(arcs2);
  });

  it('density parameter controls droplet count', () => {
    const samples = makeSamples(10);
    const ctxLow = createMockCtx();
    const ctxHigh = createMockCtx();
    renderOrganicSplatter(ctxLow, samples, { brushWidth: 30, seed: 42, density: 0.2 });
    renderOrganicSplatter(ctxHigh, samples, { brushWidth: 30, seed: 42, density: 1.0 });

    const low = ctxLow.ops.filter(o => o.type === 'fill').length;
    const high = ctxHigh.ops.filter(o => o.type === 'fill').length;
    expect(high).toBeGreaterThan(low);
  });

  it('draws nothing when density is 0', () => {
    const samples = makeSamples(10);
    renderOrganicSplatter(ctx, samples, { brushWidth: 30, seed: 42, density: 0 });
    const fills = ctx.ops.filter(o => o.type === 'fill');
    expect(fills.length).toBe(0);
  });
});
