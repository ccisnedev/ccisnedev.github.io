import { describe, it, expect } from 'vitest';
import { generateBranches } from '../../js/themes/sakura/branch-generator.js';

describe('branch-generator (stochastic L-system)', () => {
  const width = 1024;
  const height = 768;
  const seed = 42;

  it('returns an array of branch segments', () => {
    const branches = generateBranches(width, height, seed);
    expect(Array.isArray(branches)).toBe(true);
    expect(branches.length).toBeGreaterThan(0);
  });

  it('each segment has bezier control points, width and depth', () => {
    const branches = generateBranches(width, height, seed);
    for (const b of branches) {
      expect(b).toHaveProperty('x0');
      expect(b).toHaveProperty('y0');
      expect(b).toHaveProperty('cx0');
      expect(b).toHaveProperty('cy0');
      expect(b).toHaveProperty('cx1');
      expect(b).toHaveProperty('cy1');
      expect(b).toHaveProperty('x1');
      expect(b).toHaveProperty('y1');
      expect(b).toHaveProperty('width');
      expect(b).toHaveProperty('depth');
      expect(b.width).toBeGreaterThan(0);
    }
  });

  it('has trunk segments (depth 0) forming the main horizontal branch', () => {
    const branches = generateBranches(width, height, seed);
    const trunks = branches.filter(b => b.depth === 0);
    expect(trunks.length).toBeGreaterThanOrEqual(5);
  });

  it('trunk enters from left side and extends rightward', () => {
    const branches = generateBranches(width, height, seed);
    const trunks = branches.filter(b => b.depth === 0);
    expect(trunks[0].x0).toBeLessThan(width * 0.1);
    const lastTrunk = trunks[trunks.length - 1];
    expect(lastTrunk.x1).toBeGreaterThan(width * 0.4);
  });

  it('branch width decreases with depth', () => {
    const branches = generateBranches(width, height, seed);
    const byDepth = new Map();
    for (const b of branches) {
      if (!byDepth.has(b.depth)) byDepth.set(b.depth, []);
      byDepth.get(b.depth).push(b.width);
    }
    const depths = [...byDepth.keys()].sort((a, b) => a - b);
    for (let i = 1; i < depths.length; i++) {
      const avgPrev = byDepth.get(depths[i - 1]).reduce((s, w) => s + w, 0) / byDepth.get(depths[i - 1]).length;
      const avgCurr = byDepth.get(depths[i]).reduce((s, w) => s + w, 0) / byDepth.get(depths[i]).length;
      expect(avgCurr).toBeLessThan(avgPrev);
    }
  });

  it('max depth is <= 3 (trunk + sub + twig + micro-twig)', () => {
    const branches = generateBranches(width, height, seed);
    for (const b of branches) {
      expect(b.depth).toBeLessThanOrEqual(3);
    }
  });

  it('is deterministic with same seed', () => {
    const a = generateBranches(width, height, seed);
    const b = generateBranches(width, height, seed);
    expect(a).toEqual(b);
  });

  it('produces different results with different seeds', () => {
    const a = generateBranches(width, height, 42);
    const b = generateBranches(width, height, 43);
    expect(a).not.toEqual(b);
  });

  it('has sub-branches (depth >= 1)', () => {
    const branches = generateBranches(width, height, seed);
    const subs = branches.filter(b => b.depth >= 1);
    expect(subs.length).toBeGreaterThanOrEqual(3);
  });

  it('generates varied structure across multiple seeds', () => {
    const counts = [];
    for (let s = 0; s < 5; s++) {
      counts.push(generateBranches(width, height, s + 100).length);
    }
    // Not all the same (stochastic variation)
    const unique = new Set(counts);
    expect(unique.size).toBeGreaterThan(1);
  });
});
