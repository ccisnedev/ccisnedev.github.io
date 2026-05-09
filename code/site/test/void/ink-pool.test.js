import { describe, it, expect } from 'vitest';
import { createInkPool, evolveInkPool, radialExtent, sampleInkPool } from '../../js/themes/void/ink-pool.js';

describe('ink-pool model', () => {
  it('creates deterministic paper, water, and pigment fields from the same seed', () => {
    const a = createInkPool(42, 20, { size: 32 });
    const b = createInkPool(42, 20, { size: 32 });

    expect([...a.water]).toEqual([...b.water]);
    expect([...a.pigment]).toEqual([...b.pigment]);
    expect([...a.paper]).toEqual([...b.paper]);
  });

  it('starts with more pigment at the brush contact center than near the edge', () => {
    const pool = createInkPool(7, 20, { size: 48 });
    const center = sampleInkPool(pool, 24, 24);
    const edge = sampleInkPool(pool, 24, 6);

    expect(center.pigment).toBeGreaterThan(0.8);
    expect(center.pigment).toBeGreaterThan(edge.pigment);
  });

  it('expands water beyond the initial footprint after evolution', () => {
    const pool = createInkPool(12, 20, { size: 48 });
    const initial = countWetCells(pool, 0.01);
    const evolved = evolveInkPool(pool, 12);
    const after = countWetCells(evolved, 0.01);

    expect(after).toBeGreaterThan(initial);
  });

  it('keeps pigment behind the water front', () => {
    const pool = evolveInkPool(createInkPool(19, 20, { size: 48 }), 16);
    const waterExtent = radialExtent(pool, 'water', 0.04, Math.PI * 0.3);
    const pigmentExtent = radialExtent(pool, 'pigment', 0.04, Math.PI * 0.3);

    expect(waterExtent).toBeGreaterThan(pigmentExtent);
  });

  it('does not expand as a perfect circle', () => {
    const pool = evolveInkPool(createInkPool(25, 20, { size: 48 }), 14);
    const extents = [0, Math.PI / 4, Math.PI / 2, Math.PI * 0.75].map((angle) => (
      radialExtent(pool, 'water', 0.04, angle)
    ));

    expect(Math.max(...extents) - Math.min(...extents)).toBeGreaterThan(1);
  });

  it('deposits pigment on stalled wet edges', () => {
    const pool = evolveInkPool(createInkPool(31, 20, { size: 48 }), 18);
    const edgeMass = [...pool.edge].reduce((sum, value) => sum + value, 0);

    expect(edgeMass).toBeGreaterThan(0);
  });
});

function countWetCells(pool, threshold) {
  return [...pool.water].filter(value => value >= threshold).length;
}
