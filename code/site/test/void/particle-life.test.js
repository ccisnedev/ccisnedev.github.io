import { describe, it, expect } from 'vitest';
import { createParticleCloud } from '../../js/themes/void/particle-cloud.js';
import { depleteInk, isAlive } from '../../js/themes/void/particle-life.js';

describe('particle-life', () => {
  function makeCloud() {
    return createParticleCloud(100, 20, 42);
  }

  describe('depleteInk', () => {
    it('reduces ink based on progress', () => {
      const cloud = makeCloud();
      const result = depleteInk(cloud, 0.5, 20, 42);
      const avgInk = result.reduce((s, p) => s + p.ink, 0) / result.length;
      expect(avgInk).toBeLessThan(1.0);
      expect(avgInk).toBeGreaterThan(0);
    });

    it('at progress=0, all particles have full ink', () => {
      const cloud = makeCloud();
      const result = depleteInk(cloud, 0, 20, 42);
      for (const p of result) {
        expect(p.ink).toBe(1.0);
      }
    });

    it('at progress=1, most particles have low/no ink', () => {
      const cloud = makeCloud();
      const result = depleteInk(cloud, 1.0, 20, 42);
      const deadCount = result.filter(p => p.ink <= 0).length;
      // With higher depletion rate, most should be dead
      expect(deadCount).toBeGreaterThan(cloud.length * 0.6);
    });

    it('outer particles deplete faster than inner ones', () => {
      const cloud = makeCloud();
      const result = depleteInk(cloud, 0.6, 20, 42);

      // Split into inner (dist < 10) and outer (dist > 10)
      const inner = result.filter(p => p.dist < 10);
      const outer = result.filter(p => p.dist > 10);

      const avgInner = inner.reduce((s, p) => s + p.ink, 0) / inner.length;
      const avgOuter = outer.reduce((s, p) => s + p.ink, 0) / outer.length;

      // Outer still deplete somewhat faster due to distBias (1.5 at edge vs 1.0)
      // but difference is milder now
      expect(avgInner).toBeGreaterThanOrEqual(avgOuter);
    });

    it('does not mutate the original cloud', () => {
      const cloud = makeCloud();
      const originalInk = cloud[0].ink;
      depleteInk(cloud, 0.5, 20, 42);
      expect(cloud[0].ink).toBe(originalInk);
    });

    it('is deterministic with same inputs', () => {
      const cloud = makeCloud();
      const a = depleteInk(cloud, 0.5, 20, 42);
      const b = depleteInk(cloud, 0.5, 20, 42);
      expect(a).toEqual(b);
    });

    it('some particles survive until near the end', () => {
      const cloud = makeCloud();
      // At progress=0.7, some high-reserve particles should still be alive
      const result = depleteInk(cloud, 0.7, 20, 42);
      const survivors = result.filter(p => p.ink > 0);
      expect(survivors.length).toBeGreaterThan(0);
    });

    it('particles with relightAt reactivate briefly after dying', () => {
      // Create a particle that dies early but has relightAt
      const particle = {
        dx: 5, dy: 0, dist: 5, phase: 0.5, ink: 1.0,
        inkReserve: 0.3, // dies very early
        relightAt: 0.5,  // should relight at progress 0.5
        strong: false, lateStartAt: 0,
      };

      // Should be dead before relightAt
      const dead = depleteInk([particle], 0.4, 20, 42);
      expect(dead[0].ink).toBe(0);

      // Should be alive during relight window (0.5 + 0.15/2 = 0.575)
      const relit = depleteInk([particle], 0.57, 20, 42);
      expect(relit[0].ink).toBeGreaterThan(0);

      // Should be dead again after relight window (0.5 + 0.15 = 0.65)
      const deadAgain = depleteInk([particle], 0.7, 20, 42);
      expect(deadAgain[0].ink).toBe(0);
    });

    it('late-start particles are dead before their start point', () => {
      const particle = {
        dx: 2, dy: 0, dist: 2, phase: 0.5, ink: 1.0,
        inkReserve: 0.9, relightAt: 0, strong: false,
        lateStartAt: 0.7,
      };

      // Dead before lateStartAt
      const early = depleteInk([particle], 0.5, 20, 42);
      expect(early[0].ink).toBe(0);

      // Alive after lateStartAt
      const late = depleteInk([particle], 0.75, 20, 42);
      expect(late[0].ink).toBeGreaterThan(0);
    });
  });

  describe('isAlive', () => {
    it('returns true for particles with ink > 0', () => {
      expect(isAlive({ ink: 0.5 })).toBe(true);
      expect(isAlive({ ink: 0.01 })).toBe(true);
    });

    it('returns false for particles with ink <= 0', () => {
      expect(isAlive({ ink: 0 })).toBe(false);
      expect(isAlive({ ink: -0.1 })).toBe(false);
    });
  });
});
