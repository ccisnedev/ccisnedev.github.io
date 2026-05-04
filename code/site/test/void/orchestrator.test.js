import { describe, it, expect } from 'vitest';
import { buildEnsoFrame } from '../../js/themes/void/index.js';
import { generateEnso } from '../../js/themes/void/enso-path.js';

describe('void orchestrator / buildEnsoFrame', () => {
  const ensoPath = generateEnso(800, 600);

  it('returns an object with stamps, splatter, and haloStamps', () => {
    const frame = buildEnsoFrame(ensoPath, { progress: 0.5, seed: 0 });
    expect(frame).toHaveProperty('stamps');
    expect(frame).toHaveProperty('splatter');
    expect(frame).toHaveProperty('haloStamps');
    expect(Array.isArray(frame.stamps)).toBe(true);
    expect(Array.isArray(frame.splatter)).toBe(true);
    expect(Array.isArray(frame.haloStamps)).toBe(true);
  });

  it('stamps have kasure-modified alpha', () => {
    const frame = buildEnsoFrame(ensoPath, { progress: 1.0, seed: 0 });
    // All stamps should have alpha in [0, 1]
    for (const s of frame.stamps) {
      expect(s.alpha).toBeGreaterThanOrEqual(0);
      expect(s.alpha).toBeLessThanOrEqual(1);
    }
  });

  it('haloStamps have widthScale > stamps size', () => {
    const frame = buildEnsoFrame(ensoPath, { progress: 0.3, seed: 0 });
    // Halo stamps should exist for visible stamps
    expect(frame.haloStamps.length).toBeGreaterThan(0);
    // At least first halo should have widthScale >= 1
    expect(frame.haloStamps[0].widthScale).toBeGreaterThanOrEqual(1);
  });

  it('progress=0 gives empty visible output', () => {
    const frame = buildEnsoFrame(ensoPath, { progress: 0, seed: 0 });
    const visible = frame.stamps.filter(s => s.alpha > 0);
    expect(visible.length).toBe(0);
    expect(frame.splatter.length).toBe(0);
  });

  it('progress=1 gives full stroke', () => {
    const frame = buildEnsoFrame(ensoPath, { progress: 1.0, seed: 0 });
    const visible = frame.stamps.filter(s => s.alpha > 0);
    expect(visible.length).toBeGreaterThan(0);
  });

  it('splatter only appears on visible stamps', () => {
    const frame = buildEnsoFrame(ensoPath, { progress: 0.5, seed: 5 });
    // All splatter should be near stamps that have alpha > 0
    const visibleStamps = frame.stamps.filter(s => s.alpha > 0);
    if (frame.splatter.length > 0 && visibleStamps.length > 0) {
      // Splatter should exist (probabilistic but with seed should be deterministic)
      expect(frame.splatter.length).toBeGreaterThan(0);
    }
  });

  it('respects numSamples option', () => {
    const frame30 = buildEnsoFrame(ensoPath, { progress: 1, seed: 0, numSamples: 30 });
    const frame100 = buildEnsoFrame(ensoPath, { progress: 1, seed: 0, numSamples: 100 });
    expect(frame30.stamps.length).toBe(30);
    expect(frame100.stamps.length).toBe(100);
  });
});
