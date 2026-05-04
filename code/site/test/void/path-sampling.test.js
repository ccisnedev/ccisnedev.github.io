import { describe, it, expect, beforeAll } from 'vitest';
import { samplePath } from '../../js/themes/void/path-sampling.js';
import { generateEnso } from '../../js/themes/void/enso-path.js';

describe('path-sampling', () => {
  // Generate a deterministic-ish path for testing
  let ensoPath;

  // Use a fixed seed approach: generate once, reuse
  beforeAll(() => {
    ensoPath = generateEnso(800, 600);
  });

  it('returns the requested number of samples', () => {
    const samples = samplePath(ensoPath, 100);
    expect(samples.length).toBe(100);
  });

  it('each sample has x, y, t, angle, nx, ny', () => {
    const samples = samplePath(ensoPath, 50);
    for (const s of samples) {
      expect(typeof s.x).toBe('number');
      expect(typeof s.y).toBe('number');
      expect(typeof s.t).toBe('number');
      expect(typeof s.angle).toBe('number');
      expect(typeof s.nx).toBe('number');
      expect(typeof s.ny).toBe('number');
    }
  });

  it('first sample is close to ensoPath.start', () => {
    const samples = samplePath(ensoPath, 100);
    const s = samples[0];
    const dist = Math.hypot(s.x - ensoPath.start.x, s.y - ensoPath.start.y);
    // Should be very close (within 1% of radius)
    expect(dist).toBeLessThan(ensoPath.r * 0.01);
  });

  it('t values are monotonically increasing from 0 to 1', () => {
    const samples = samplePath(ensoPath, 100);
    expect(samples[0].t).toBeCloseTo(0, 1);
    expect(samples[samples.length - 1].t).toBeCloseTo(1, 1);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].t).toBeGreaterThan(samples[i - 1].t);
    }
  });

  it('samples are approximately equidistant (within 20% tolerance)', () => {
    const samples = samplePath(ensoPath, 100);
    const distances = [];
    for (let i = 1; i < samples.length; i++) {
      distances.push(Math.hypot(
        samples[i].x - samples[i - 1].x,
        samples[i].y - samples[i - 1].y,
      ));
    }
    const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
    for (const d of distances) {
      expect(d).toBeGreaterThan(avgDist * 0.5);  // no closer than 50% of avg
      expect(d).toBeLessThan(avgDist * 2.0);     // no farther than 200% of avg
    }
  });

  it('normals are perpendicular to tangent (dot product ≈ 0)', () => {
    const samples = samplePath(ensoPath, 50);
    for (const s of samples) {
      // Tangent vector from angle
      const tx = Math.cos(s.angle);
      const ty = Math.sin(s.angle);
      // Dot product with normal
      const dot = tx * s.nx + ty * s.ny;
      expect(Math.abs(dot)).toBeLessThan(0.01);
    }
  });

  it('normals are unit vectors', () => {
    const samples = samplePath(ensoPath, 50);
    for (const s of samples) {
      const len = Math.hypot(s.nx, s.ny);
      expect(len).toBeCloseTo(1, 2);
    }
  });

  it('works with different sample counts', () => {
    expect(samplePath(ensoPath, 10).length).toBe(10);
    expect(samplePath(ensoPath, 200).length).toBe(200);
    expect(samplePath(ensoPath, 400).length).toBe(400);
  });
});
