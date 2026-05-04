import { describe, it, expect } from 'vitest';
import { createPerlin1D } from '../../js/themes/void/perlin.js';

describe('createPerlin1D', () => {
  it('returns a function', () => {
    const noise = createPerlin1D(42);
    expect(typeof noise).toBe('function');
  });

  it('returns values in range [-1, 1]', () => {
    const noise = createPerlin1D(7);
    for (let x = -10; x <= 10; x += 0.1) {
      const v = noise(x);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic (same seed, same input = same output)', () => {
    const a = createPerlin1D(99);
    const b = createPerlin1D(99);
    expect(a(0.5)).toBe(b(0.5));
    expect(a(3.7)).toBe(b(3.7));
  });

  it('different seed produces different output for same x', () => {
    const a = createPerlin1D(1);
    const b = createPerlin1D(2);
    // At least some values should differ
    const diffs = [0.5, 1.5, 2.5].map(x => a(x) !== b(x));
    expect(diffs.some(d => d)).toBe(true);
  });

  it('is continuous (small input change = small output change)', () => {
    const noise = createPerlin1D(42);
    const epsilon = 0.001;
    for (let x = 0; x < 5; x += 0.5) {
      const diff = Math.abs(noise(x + epsilon) - noise(x));
      expect(diff).toBeLessThan(0.05);
    }
  });

  it('has variation (not constant)', () => {
    const noise = createPerlin1D(42);
    const values = [0.3, 1.2, 2.7, 3.1, 4.6].map(x => noise(x));
    const allSame = values.every(v => v === values[0]);
    expect(allSame).toBe(false);
  });

  it('changes sign at least once in [0, 4]', () => {
    const noise = createPerlin1D(42);
    const values = [];
    for (let x = 0; x <= 4; x += 0.1) {
      values.push(noise(x));
    }
    const hasPositive = values.some(v => v > 0);
    const hasNegative = values.some(v => v < 0);
    expect(hasPositive && hasNegative).toBe(true);
  });

  it('has no abrupt discontinuities between integers', () => {
    const noise = createPerlin1D(42);
    // Check that crossing integer boundaries is smooth
    for (let i = 0; i < 5; i++) {
      const before = noise(i - 0.01);
      const after = noise(i + 0.01);
      expect(Math.abs(after - before)).toBeLessThan(0.1);
    }
  });
});
