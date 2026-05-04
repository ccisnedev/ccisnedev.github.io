import { describe, it, expect } from 'vitest';
import { createPaperTexture } from '../../js/themes/void/paper-texture.js';

describe('createPaperTexture', () => {
  it('returns an ImageData-like object with width, height, data', () => {
    const tex = createPaperTexture(64, 64, { seed: 42 });
    expect(tex.width).toBe(64);
    expect(tex.height).toBe(64);
    expect(tex.data).toBeInstanceOf(Uint8ClampedArray);
    expect(tex.data.length).toBe(64 * 64 * 4);
  });

  it('is deterministic (same seed = same output)', () => {
    const a = createPaperTexture(32, 32, { seed: 7 });
    const b = createPaperTexture(32, 32, { seed: 7 });
    expect(a.data).toEqual(b.data);
  });

  it('different seed produces different output', () => {
    const a = createPaperTexture(32, 32, { seed: 1 });
    const b = createPaperTexture(32, 32, { seed: 2 });
    let diffCount = 0;
    for (let i = 0; i < a.data.length; i++) {
      if (a.data[i] !== b.data[i]) diffCount++;
    }
    expect(diffCount).toBeGreaterThan(0);
  });

  it('pixel alpha channel has variation (not uniform)', () => {
    const tex = createPaperTexture(64, 64, { seed: 42 });
    const alphas = new Set();
    for (let i = 3; i < tex.data.length; i += 4) {
      alphas.add(tex.data[i]);
    }
    // Should have multiple distinct alpha values
    expect(alphas.size).toBeGreaterThan(5);
  });

  it('all RGB channels are 0 (black mask texture)', () => {
    const tex = createPaperTexture(32, 32, { seed: 42 });
    for (let i = 0; i < tex.data.length; i += 4) {
      expect(tex.data[i]).toBe(0);     // R
      expect(tex.data[i + 1]).toBe(0); // G
      expect(tex.data[i + 2]).toBe(0); // B
    }
  });

  it('alpha values are within [0, grainMax]', () => {
    const grainMax = 80;
    const tex = createPaperTexture(64, 64, { seed: 42, grainMax });
    for (let i = 3; i < tex.data.length; i += 4) {
      expect(tex.data[i]).toBeLessThanOrEqual(grainMax);
      expect(tex.data[i]).toBeGreaterThanOrEqual(0);
    }
  });
});
