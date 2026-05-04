import { describe, it, expect } from 'vitest';
import { createParticleCloud } from '../../js/themes/void/particle-cloud.js';

describe('createParticleCloud', () => {
  it('creates the requested number of particles', () => {
    const cloud = createParticleCloud(100, 20, 42);
    expect(cloud).toHaveLength(100);
  });

  it('all particles are within the given radius', () => {
    const cloud = createParticleCloud(200, 15, 99);
    for (const p of cloud) {
      const dist = Math.hypot(p.dx, p.dy);
      expect(dist).toBeLessThanOrEqual(15 + 0.001);
    }
  });

  it('each particle has required properties', () => {
    const cloud = createParticleCloud(50, 10, 7);
    for (const p of cloud) {
      expect(p).toHaveProperty('dx');
      expect(p).toHaveProperty('dy');
      expect(p).toHaveProperty('dist'); // distance from center
      expect(p).toHaveProperty('phase'); // random phase offset
      expect(p).toHaveProperty('ink'); // ink level, starts at 1.0
      expect(p).toHaveProperty('inkReserve'); // random ink capacity
      expect(p).toHaveProperty('relightAt'); // relight point (0 = no relight)
      expect(p.ink).toBe(1.0);
      expect(p.inkReserve).toBeGreaterThanOrEqual(0.3);
      expect(p.inkReserve).toBeLessThanOrEqual(1.0);
    }
  });

  it('dist equals hypot(dx, dy)', () => {
    const cloud = createParticleCloud(80, 12, 33);
    for (const p of cloud) {
      expect(p.dist).toBeCloseTo(Math.hypot(p.dx, p.dy), 5);
    }
  });

  it('particles are distributed (not all at center)', () => {
    const cloud = createParticleCloud(200, 20, 55);
    const avgDist = cloud.reduce((s, p) => s + p.dist, 0) / cloud.length;
    // For uniform disk distribution, mean distance = 2R/3
    // Allow generous range since it's random
    expect(avgDist).toBeGreaterThan(20 * 0.3);
    expect(avgDist).toBeLessThan(20 * 0.9);
  });

  it('is deterministic with same seed', () => {
    const a = createParticleCloud(50, 10, 42);
    const b = createParticleCloud(50, 10, 42);
    expect(a).toEqual(b);
  });

  it('produces different results with different seeds', () => {
    const a = createParticleCloud(50, 10, 42);
    const b = createParticleCloud(50, 10, 43);
    expect(a).not.toEqual(b);
  });

  it('phase values are in [0, 1) range', () => {
    const cloud = createParticleCloud(100, 10, 77);
    for (const p of cloud) {
      expect(p.phase).toBeGreaterThanOrEqual(0);
      expect(p.phase).toBeLessThan(1);
    }
  });

  it('inkReserve is biased toward high values', () => {
    const cloud = createParticleCloud(500, 10, 123);
    const avgReserve = cloud.reduce((s, p) => s + p.inkReserve, 0) / cloud.length;
    // With pow(rng, 0.4) scaled to [0.3, 1.0], mean should be > 0.7
    expect(avgReserve).toBeGreaterThan(0.7);
  });

  it('about 25% of particles have relightAt > 0', () => {
    const cloud = createParticleCloud(1000, 10, 99);
    const relighters = cloud.filter(p => p.relightAt > 0);
    // Should be roughly 25% (allow 15%-35% due to randomness)
    expect(relighters.length).toBeGreaterThan(150);
    expect(relighters.length).toBeLessThan(350);
    // relightAt values should be in [0.25, 0.8] range
    for (const p of relighters) {
      expect(p.relightAt).toBeGreaterThanOrEqual(0.25);
      expect(p.relightAt).toBeLessThanOrEqual(0.8);
    }
  });

  it('strong particles form angular clusters (not scattered)', () => {
    const cloud = createParticleCloud(500, 10, 42);
    const strongs = cloud.filter(p => p.strong);
    expect(strongs.length).toBeGreaterThan(10);
    // Compute angles of strong particles
    const angles = strongs.map(p => Math.atan2(p.dy, p.dx));
    // They should cluster: most angles within a few radians of each other
    // Sort and check that consecutive angles are close
    angles.sort((a, b) => a - b);
    let maxGap = 0;
    for (let i = 1; i < angles.length; i++) {
      const gap = angles[i] - angles[i - 1];
      if (gap > maxGap) maxGap = gap;
    }
    // Wrap-around gap
    const wrapGap = (2 * Math.PI) - (angles[angles.length - 1] - angles[0]);
    if (wrapGap > maxGap) maxGap = wrapGap;
    // The largest gap should be > π (meaning strong particles occupy less than half the circle)
    expect(maxGap).toBeGreaterThan(Math.PI * 0.5);
  });

  it('about 5% of particles have lateStartAt > 0', () => {
    const cloud = createParticleCloud(1000, 10, 77);
    const lateStarters = cloud.filter(p => p.lateStartAt > 0);
    // Should be roughly 5% (allow 2%-10%)
    expect(lateStarters.length).toBeGreaterThan(20);
    expect(lateStarters.length).toBeLessThan(100);
    for (const p of lateStarters) {
      expect(p.lateStartAt).toBeGreaterThanOrEqual(0.6);
      expect(p.lateStartAt).toBeLessThanOrEqual(0.85);
    }
  });
});
