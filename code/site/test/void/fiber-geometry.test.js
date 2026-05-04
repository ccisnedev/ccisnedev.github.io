import { describe, it, expect } from 'vitest';
import { generateFiberLayout, fiberPosition } from '../../js/themes/void/fiber-geometry.js';

describe('generateFiberLayout', () => {
  it('returns array of length fiberCount', () => {
    const fibers = generateFiberLayout(25);
    expect(fibers).toHaveLength(25);
  });

  it('each fiber has id, offset, retention, phase', () => {
    const fibers = generateFiberLayout(10);
    for (const f of fibers) {
      expect(f).toHaveProperty('id');
      expect(f).toHaveProperty('offset');
      expect(f).toHaveProperty('retention');
      expect(f).toHaveProperty('phase');
    }
  });

  it('offsets are in range [-0.5, 0.5]', () => {
    const fibers = generateFiberLayout(30);
    for (const f of fibers) {
      expect(f.offset).toBeGreaterThanOrEqual(-0.5);
      expect(f.offset).toBeLessThanOrEqual(0.5);
    }
  });

  it('distribution: more fibers near center than edges', () => {
    const fibers = generateFiberLayout(30);
    const nearCenter = fibers.filter(f => Math.abs(f.offset) < 0.25).length;
    const nearEdges = fibers.filter(f => Math.abs(f.offset) >= 0.25).length;
    expect(nearCenter).toBeGreaterThan(nearEdges);
  });

  it('retention is in [0.6, 1.0] for each fiber', () => {
    const fibers = generateFiberLayout(20);
    for (const f of fibers) {
      expect(f.retention).toBeGreaterThanOrEqual(0.6);
      expect(f.retention).toBeLessThanOrEqual(1.0);
    }
  });

  it('is deterministic with same seed', () => {
    const a = generateFiberLayout(20, { seed: 42 });
    const b = generateFiberLayout(20, { seed: 42 });
    expect(a).toEqual(b);
  });

  it('different seed produces different layout', () => {
    const a = generateFiberLayout(20, { seed: 1 });
    const b = generateFiberLayout(20, { seed: 2 });
    const sameOffsets = a.every((f, i) => f.offset === b[i].offset);
    expect(sameOffsets).toBe(false);
  });
});

describe('fiberPosition', () => {
  const sample = { x: 100, y: 200, nx: 0, ny: 1, angle: 0 };

  it('offset=0 returns the sample position exactly', () => {
    const pos = fiberPosition({ offset: 0 }, sample, 40, 0);
    expect(pos.x).toBeCloseTo(100);
    expect(pos.y).toBeCloseTo(200);
  });

  it('offset=0.5 displaces by +width/2 in normal direction', () => {
    const pos = fiberPosition({ offset: 0.5 }, sample, 40, 0);
    // normal is (0, 1), so displacement is (0, 20)
    expect(pos.x).toBeCloseTo(100);
    expect(pos.y).toBeCloseTo(220);
  });

  it('offset=-0.5 displaces by -width/2 in normal direction', () => {
    const pos = fiberPosition({ offset: -0.5 }, sample, 40, 0);
    expect(pos.x).toBeCloseTo(100);
    expect(pos.y).toBeCloseTo(180);
  });

  it('jitter > 0 displaces additionally in normal direction', () => {
    const pos = fiberPosition({ offset: 0 }, sample, 40, 5);
    expect(pos.x).toBeCloseTo(100);
    expect(pos.y).toBeCloseTo(205);
  });

  it('width=0 returns sample position regardless of offset', () => {
    const pos = fiberPosition({ offset: 0.5 }, sample, 0, 0);
    expect(pos.x).toBeCloseTo(100);
    expect(pos.y).toBeCloseTo(200);
  });

  it('works with non-axis-aligned normal', () => {
    const diag = { x: 50, y: 50, nx: 0.7071, ny: 0.7071, angle: Math.PI / 4 };
    const pos = fiberPosition({ offset: 0.5 }, diag, 20, 0);
    // displacement = 0.5 * 20 * (0.7071, 0.7071) = (7.07, 7.07)
    expect(pos.x).toBeCloseTo(57.07, 1);
    expect(pos.y).toBeCloseTo(57.07, 1);
  });
});
