import { describe, it, expect } from 'vitest';
import { pressureCurve, inkDepletion, fiberDensity } from '../../js/themes/void/ink-model.js';

describe('ink-model', () => {
  describe('pressureCurve', () => {
    it('starts low (brush barely touching)', () => {
      expect(pressureCurve(0)).toBeLessThan(0.5);
    });

    it('reaches near-maximum quickly (t=0.08)', () => {
      expect(pressureCurve(0.08)).toBeGreaterThan(0.8);
    });

    it('stays high in the middle (t=0.5)', () => {
      const v = pressureCurve(0.5);
      expect(v).toBeGreaterThanOrEqual(0.7);
      expect(v).toBeLessThanOrEqual(1.0);
    });

    it('drops low at the end (brush lifting, t=0.95)', () => {
      expect(pressureCurve(0.95)).toBeLessThan(0.5);
    });

    it('always returns values in [0, 1]', () => {
      for (let t = 0; t <= 1; t += 0.01) {
        const v = pressureCurve(t);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('inkDepletion', () => {
    it('starts at 1.0 (full ink load)', () => {
      expect(inkDepletion(0)).toBe(1.0);
    });

    it('is still high at t=0.4', () => {
      expect(inkDepletion(0.4)).toBeGreaterThan(0.8);
    });

    it('drops significantly by t=0.8 (kasure zone)', () => {
      expect(inkDepletion(0.8)).toBeLessThan(0.5);
    });

    it('never reaches zero (always some mark)', () => {
      expect(inkDepletion(1.0)).toBeGreaterThan(0);
    });

    it('is monotonically non-increasing', () => {
      let prev = inkDepletion(0);
      for (let t = 0.01; t <= 1; t += 0.01) {
        const v = inkDepletion(t);
        expect(v).toBeLessThanOrEqual(prev + 0.001); // tolerance for float
        prev = v;
      }
    });

    it('always returns values in (0, 1]', () => {
      for (let t = 0; t <= 1; t += 0.01) {
        const v = inkDepletion(t);
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('fiberDensity', () => {
    it('is 1.0 in the first half (fibers united)', () => {
      expect(fiberDensity(0.3)).toBe(1.0);
    });

    it('starts decreasing after t=0.5', () => {
      expect(fiberDensity(0.6)).toBeLessThan(1.0);
    });

    it('is noticeably low at t=0.8 (fibers separating)', () => {
      expect(fiberDensity(0.8)).toBeLessThan(0.6);
    });

    it('never goes below a minimum (some fibers always hold)', () => {
      expect(fiberDensity(1.0)).toBeGreaterThanOrEqual(0.2);
    });

    it('always returns values in [0.2, 1]', () => {
      for (let t = 0; t <= 1; t += 0.01) {
        const v = fiberDensity(t);
        expect(v).toBeGreaterThanOrEqual(0.2);
        expect(v).toBeLessThanOrEqual(1.0);
      }
    });
  });
});
