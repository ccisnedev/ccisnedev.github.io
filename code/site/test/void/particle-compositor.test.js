import { describe, it, expect, beforeEach } from 'vitest';
import { compositeParticleStroke } from '../../js/themes/void/particle-compositor.js';

function createMockCtx() {
  const ops = [];
  return {
    ops,
    beginPath() { ops.push({ type: 'beginPath' }); },
    moveTo(x, y) { ops.push({ type: 'moveTo', x, y }); },
    lineTo(x, y) { ops.push({ type: 'lineTo', x, y }); },
    arc(x, y, r, a0, a1) { ops.push({ type: 'arc', x, y, r }); },
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
    const angle = t * Math.PI * 2 * 0.8;
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

describe('compositeParticleStroke', () => {
  let ctx;
  beforeEach(() => { ctx = createMockCtx(); });

  it('creates a particle cloud and renders it', () => {
    const samples = makeSamples(50);
    compositeParticleStroke(ctx, samples, {
      brushRadius: 15,
      particleCount: 80,
      seed: 42,
      color: 'white',
      progress: 0.5,
      dropProgress: 1,
    });

    // Should produce rendering ops
    expect(ctx.ops.length).toBeGreaterThan(10);
  });

  it('in drop phase only (progress=0), renders filled circle arcs', () => {
    const samples = makeSamples(50);
    compositeParticleStroke(ctx, samples, {
      brushRadius: 15,
      particleCount: 40,
      seed: 42,
      color: 'white',
      progress: 0,
      dropProgress: 0.7,
    });

    const arcs = ctx.ops.filter(o => o.type === 'arc');
    expect(arcs.length).toBeGreaterThan(0);
    // Drop phase renders filled circles (arc + fill pairs)
    const fills = ctx.ops.filter(o => o.type === 'fill');
    expect(fills.length).toBe(arcs.length);
    // No lineTo ops (that's stroke phase polylines)
    const lineTos = ctx.ops.filter(o => o.type === 'lineTo');
    expect(lineTos.length).toBe(0);
  });

  it('in stroke phase (progress>0), renders polylines', () => {
    const samples = makeSamples(50);
    compositeParticleStroke(ctx, samples, {
      brushRadius: 15,
      particleCount: 40,
      seed: 42,
      color: 'white',
      progress: 0.5,
      dropProgress: 1,
    });

    const strokes = ctx.ops.filter(o => o.type === 'stroke');
    expect(strokes.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const samples = makeSamples(50);
    const opts = { brushRadius: 15, particleCount: 40, seed: 42, color: 'white', progress: 0.5, dropProgress: 1 };

    compositeParticleStroke(ctx, samples, opts);
    const ops1 = [...ctx.ops];

    ctx.ops.length = 0;
    compositeParticleStroke(ctx, samples, opts);
    const ops2 = [...ctx.ops];

    expect(ops1).toEqual(ops2);
  });

  it('uses save/restore', () => {
    const samples = makeSamples(50);
    compositeParticleStroke(ctx, samples, {
      brushRadius: 15, particleCount: 40, seed: 42, color: 'white', progress: 0.3, dropProgress: 1,
    });

    const saves = ctx.ops.filter(o => o.type === 'save').length;
    const restores = ctx.ops.filter(o => o.type === 'restore').length;
    expect(saves).toBe(restores);
  });
});
