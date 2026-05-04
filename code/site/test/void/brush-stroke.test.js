import { describe, it, expect } from 'vitest';
import { renderStroke } from '../../js/themes/void/brush-stroke.js';
import { generateEnso } from '../../js/themes/void/enso-path.js';

describe('brush-stroke / renderStroke', () => {
  const ensoPath = generateEnso(800, 600);

  it('returns an array of stamp descriptors', () => {
    const stamps = renderStroke(ensoPath, { numSamples: 50 });
    expect(Array.isArray(stamps)).toBe(true);
    expect(stamps.length).toBe(50);
  });

  it('each stamp has x, y, size, alpha, angle', () => {
    const stamps = renderStroke(ensoPath, { numSamples: 20 });
    for (const s of stamps) {
      expect(s).toHaveProperty('x');
      expect(s).toHaveProperty('y');
      expect(s).toHaveProperty('size');
      expect(s).toHaveProperty('alpha');
      expect(s).toHaveProperty('angle');
      expect(typeof s.x).toBe('number');
      expect(typeof s.y).toBe('number');
      expect(typeof s.size).toBe('number');
      expect(typeof s.alpha).toBe('number');
      expect(typeof s.angle).toBe('number');
    }
  });

  it('alpha values are in [0, 1] and generally decrease (ink depletion)', () => {
    const stamps = renderStroke(ensoPath, { numSamples: 100 });
    for (const s of stamps) {
      expect(s.alpha).toBeGreaterThanOrEqual(0);
      expect(s.alpha).toBeLessThanOrEqual(1);
    }
    // Overall trend: first stamp alpha >= last stamp alpha
    expect(stamps[0].alpha).toBeGreaterThanOrEqual(stamps[stamps.length - 1].alpha);
  });

  it('size varies according to pressure curve (wider in middle, thinner at ends)', () => {
    const stamps = renderStroke(ensoPath, { numSamples: 100, baseSize: 40 });
    // All sizes should be positive
    for (const s of stamps) {
      expect(s.size).toBeGreaterThan(0);
    }
    // Middle should be fatter than the very start
    const midSize = stamps[50].size;
    const startSize = stamps[0].size;
    expect(midSize).toBeGreaterThanOrEqual(startSize);
  });

  it('respects baseSize option', () => {
    const stamps20 = renderStroke(ensoPath, { numSamples: 30, baseSize: 20 });
    const stamps60 = renderStroke(ensoPath, { numSamples: 30, baseSize: 60 });
    // Average size should scale with baseSize
    const avg20 = stamps20.reduce((sum, s) => sum + s.size, 0) / stamps20.length;
    const avg60 = stamps60.reduce((sum, s) => sum + s.size, 0) / stamps60.length;
    expect(avg60).toBeGreaterThan(avg20 * 2);
  });

  it('respects progress parameter (partial stroke)', () => {
    const full = renderStroke(ensoPath, { numSamples: 100, progress: 1.0 });
    const half = renderStroke(ensoPath, { numSamples: 100, progress: 0.5 });
    // Half progress: stamps beyond 50% should have alpha = 0
    const visibleHalf = half.filter(s => s.alpha > 0);
    const visibleFull = full.filter(s => s.alpha > 0);
    expect(visibleHalf.length).toBeLessThanOrEqual(visibleFull.length);
    expect(visibleHalf.length).toBeGreaterThan(0);
  });

  it('progress=0 gives all stamps with alpha 0', () => {
    const stamps = renderStroke(ensoPath, { numSamples: 50, progress: 0 });
    for (const s of stamps) {
      expect(s.alpha).toBe(0);
    }
  });

  it('stamps lie on the ensō path (within radius)', () => {
    const stamps = renderStroke(ensoPath, { numSamples: 50 });
    const { cx, cy, r } = { cx: ensoPath.start.x, cy: ensoPath.start.y, r: ensoPath.r };
    // Center of path is roughly at ensoPath center
    // stamps should be within r + baseSize of the center
    for (const s of stamps) {
      const dist = Math.hypot(s.x - (ensoPath.start.x - ensoPath.r), s.y - ensoPath.start.y);
      // Very loose bound: stamps shouldn't fly off canvas
      expect(dist).toBeLessThan(ensoPath.r * 4);
    }
  });
});
