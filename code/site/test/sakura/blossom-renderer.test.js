import { describe, it, expect } from 'vitest';
import { generateBlossoms } from '../../js/themes/sakura/blossom-renderer.js';
import { generateBranches } from '../../js/themes/sakura/branch-generator.js';

describe('blossom-renderer (botanical spur-node placement)', () => {
  const seed = 42;
  // Use real branch output for realistic testing
  const branches = generateBranches(1024, 768, seed);

  it('returns an array of blossom positions', () => {
    const blossoms = generateBlossoms(branches, seed);
    expect(Array.isArray(blossoms)).toBe(true);
    expect(blossoms.length).toBeGreaterThan(0);
  });

  it('each blossom has required properties', () => {
    const blossoms = generateBlossoms(branches, seed);
    for (const b of blossoms) {
      expect(typeof b.x).toBe('number');
      expect(typeof b.y).toBe('number');
      expect(b.size).toBeGreaterThan(0);
      expect(b.rotation).toBeGreaterThanOrEqual(0);
      expect(b.rotation).toBeLessThan(Math.PI * 2);
      expect(b.petalCount).toBe(5);
      expect(['flower', 'bud']).toContain(b.type);
      expect(typeof b.scaleX).toBe('number');
    }
  });

  it('generates blossoms (sparse realistic flowering)', () => {
    const blossoms = generateBlossoms(branches, seed);
    expect(blossoms.length).toBeGreaterThan(5);
  });

  it('includes both flowers and buds', () => {
    const blossoms = generateBlossoms(branches, seed);
    const flowers = blossoms.filter(b => b.type === 'flower');
    const buds = blossoms.filter(b => b.type === 'bud');
    expect(flowers.length).toBeGreaterThan(0);
    expect(buds.length).toBeGreaterThan(0);
  });

  it('open flowers have size >= 14', () => {
    const blossoms = generateBlossoms(branches, seed);
    const flowers = blossoms.filter(b => b.type === 'flower');
    for (const f of flowers) {
      expect(f.size).toBeGreaterThanOrEqual(14);
    }
  });

  it('flowers have scaleX for perspective variation (0.5-1.0)', () => {
    const blossoms = generateBlossoms(branches, seed);
    const flowers = blossoms.filter(b => b.type === 'flower');
    for (const f of flowers) {
      expect(f.scaleX).toBeGreaterThanOrEqual(0.5);
      expect(f.scaleX).toBeLessThanOrEqual(1.0);
    }
  });

  it('is deterministic with same seed', () => {
    const a = generateBlossoms(branches, seed);
    const b = generateBlossoms(branches, seed);
    expect(a).toEqual(b);
  });

  it('produces different results with different seeds', () => {
    const a = generateBlossoms(branches, 42);
    const b = generateBlossoms(branches, 43);
    expect(a).not.toEqual(b);
  });

  it('flowers cluster near branch positions (botanical spur placement)', () => {
    const blossoms = generateBlossoms(branches, seed);
    // At least some blossoms should be within reasonable distance of branch endpoints
    let nearBranch = 0;
    for (const bl of blossoms.slice(0, 20)) {
      for (const br of branches) {
        const dist = Math.hypot(bl.x - br.x1, bl.y - br.y1);
        if (dist < 80) { nearBranch++; break; }
      }
    }
    expect(nearBranch).toBeGreaterThan(5);
  });
});
