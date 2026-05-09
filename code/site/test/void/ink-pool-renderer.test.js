import { describe, it, expect, beforeEach } from 'vitest';
import { createInkPool } from '../../js/themes/void/ink-pool.js';
import { renderInkPool } from '../../js/themes/void/ink-pool-renderer.js';

function createMockCtx() {
  const ops = [];
  return {
    ops,
    fillRect(x, y, w, h) { ops.push({ type: 'fillRect', x, y, w, h }); },
    set fillStyle(value) { ops.push({ type: 'fillStyle', value }); },
    set globalAlpha(value) { ops.push({ type: 'globalAlpha', value }); },
    save() { ops.push({ type: 'save' }); },
    restore() { ops.push({ type: 'restore' }); },
  };
}

describe('renderInkPool', () => {
  let ctx;
  let pool;
  let startSample;

  beforeEach(() => {
    ctx = createMockCtx();
    pool = createInkPool(42, 20, { size: 32 });
    startSample = { x: 200, y: 180, angle: 0 };
  });

  it('uses save and restore for canvas state isolation', () => {
    renderInkPool(ctx, pool, startSample, { progress: 0.6, color: 'white' });

    expect(ctx.ops.filter(o => o.type === 'save').length).toBe(1);
    expect(ctx.ops.filter(o => o.type === 'restore').length).toBe(1);
  });

  it('renders cells rather than uniform bristle circles', () => {
    renderInkPool(ctx, pool, startSample, { progress: 0.6, color: 'white' });

    expect(ctx.ops.filter(o => o.type === 'fillRect').length).toBeGreaterThan(20);
    expect(ctx.ops.filter(o => o.type === 'arc').length).toBe(0);
  });

  it('draws multiple alpha levels for halo, pigment, and edge deposits', () => {
    renderInkPool(ctx, pool, startSample, { progress: 1, color: 'white' });

    const alphas = new Set(
      ctx.ops
        .filter(o => o.type === 'globalAlpha')
        .map(o => Math.round(o.value * 100) / 100),
    );
    expect(alphas.size).toBeGreaterThan(4);
  });

  it('expands the rendered footprint as drop progress increases', () => {
    renderInkPool(ctx, pool, startSample, { progress: 0.1, color: 'white' });
    const earlyRects = ctx.ops.filter(o => o.type === 'fillRect').length;

    ctx.ops.length = 0;
    renderInkPool(ctx, pool, startSample, { progress: 1, color: 'white' });
    const lateRects = ctx.ops.filter(o => o.type === 'fillRect').length;

    expect(lateRects).toBeGreaterThan(earlyRects);
  });
});

