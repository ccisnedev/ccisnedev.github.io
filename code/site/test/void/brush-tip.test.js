import { describe, it, expect } from 'vitest';
import { computeBrushAlpha, createBrushTip } from '../../js/themes/void/brush-tip.js';

describe('brush-tip / computeBrushAlpha', () => {
  const size = 64;

  it('center pixel has maximum alpha (close to 1)', () => {
    const alpha = computeBrushAlpha(32, 32, size, { seed: 0 });
    expect(alpha).toBeGreaterThan(0.8);
    expect(alpha).toBeLessThanOrEqual(1);
  });

  it('edge pixels (at radius boundary) have alpha ≈ 0', () => {
    // top-center is at distance = radius from center
    const alpha = computeBrushAlpha(32, 0, size, { seed: 0 });
    expect(alpha).toBeLessThan(0.1);
  });

  it('alpha decreases radially from center to edge', () => {
    const center = computeBrushAlpha(32, 32, size, { seed: 0 });
    const mid = computeBrushAlpha(32, 16, size, { seed: 0 });
    const outer = computeBrushAlpha(32, 4, size, { seed: 0 });
    expect(center).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(outer);
  });

  it('returns 0 for pixels outside the radius', () => {
    // corner pixel is sqrt(32^2 + 32^2) ≈ 45 away, radius = 32
    const alpha = computeBrushAlpha(0, 0, size, { seed: 0 });
    expect(alpha).toBe(0);
  });

  it('returns values in [0, 1]', () => {
    for (let y = 0; y < size; y += 8) {
      for (let x = 0; x < size; x += 8) {
        const a = computeBrushAlpha(x, y, size, { seed: 7 });
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is deterministic with same seed', () => {
    const a1 = computeBrushAlpha(20, 25, size, { seed: 42 });
    const a2 = computeBrushAlpha(20, 25, size, { seed: 42 });
    expect(a1).toBe(a2);
  });

  it('different seeds produce different fiber noise', () => {
    const a1 = computeBrushAlpha(20, 25, size, { seed: 1 });
    const a2 = computeBrushAlpha(20, 25, size, { seed: 999 });
    expect(a1).not.toBe(a2);
  });

  it('has fiber-like irregularity (not perfectly smooth radial)', () => {
    // Two pixels at same radius but different angles should differ
    // radius ~16: (48, 32) and (32, 48) are both 16px from center
    const a1 = computeBrushAlpha(48, 32, size, { seed: 5 });
    const a2 = computeBrushAlpha(32, 48, size, { seed: 5 });
    // They should be similar-ish but not identical (fiber noise breaks symmetry)
    expect(Math.abs(a1 - a2)).toBeGreaterThan(0);
  });
});

describe('brush-tip / createBrushTip', () => {
  it('returns object with width, height, and alphaData', () => {
    const tip = createBrushTip(32, { seed: 0 });
    expect(tip.width).toBe(32);
    expect(tip.height).toBe(32);
    expect(tip.alphaData).toBeInstanceOf(Float32Array);
    expect(tip.alphaData.length).toBe(32 * 32);
  });

  it('alphaData matches computeBrushAlpha pixel-by-pixel', () => {
    const s = 16;
    const tip = createBrushTip(s, { seed: 3 });
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const expected = computeBrushAlpha(x, y, s, { seed: 3 });
        expect(tip.alphaData[y * s + x]).toBeCloseTo(expected, 5);
      }
    }
  });
});
