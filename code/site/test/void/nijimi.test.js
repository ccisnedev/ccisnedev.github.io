import { describe, it, expect } from 'vitest';
import { nijimiHalo } from '../../js/themes/void/nijimi.js';

describe('nijimi (ink bleed halo)', () => {
  it('returns an object with offset and alpha', () => {
    const halo = nijimiHalo(0.5, { inkLoad: 0.8 });
    expect(halo).toHaveProperty('widthScale');
    expect(halo).toHaveProperty('alpha');
  });

  it('widthScale is >= 1 (halo expands beyond brush)', () => {
    const halo = nijimiHalo(0.3, { inkLoad: 0.9 });
    expect(halo.widthScale).toBeGreaterThanOrEqual(1);
  });

  it('alpha is in [0, 1]', () => {
    for (let t = 0; t <= 1; t += 0.1) {
      const halo = nijimiHalo(t, { inkLoad: 0.7 });
      expect(halo.alpha).toBeGreaterThanOrEqual(0);
      expect(halo.alpha).toBeLessThanOrEqual(1);
    }
  });

  it('halo is stronger (wider) at start when ink is loaded', () => {
    const start = nijimiHalo(0.0, { inkLoad: 1.0 });
    const end = nijimiHalo(0.9, { inkLoad: 1.0 });
    expect(start.widthScale).toBeGreaterThanOrEqual(end.widthScale);
  });

  it('higher inkLoad produces wider halo', () => {
    const heavy = nijimiHalo(0.2, { inkLoad: 1.0 });
    const light = nijimiHalo(0.2, { inkLoad: 0.2 });
    expect(heavy.widthScale).toBeGreaterThanOrEqual(light.widthScale);
  });

  it('alpha decreases with progression (less bleed as ink depletes)', () => {
    const early = nijimiHalo(0.1, { inkLoad: 0.8 });
    const late = nijimiHalo(0.9, { inkLoad: 0.8 });
    expect(early.alpha).toBeGreaterThanOrEqual(late.alpha);
  });

  it('with zero inkLoad, halo is minimal', () => {
    const halo = nijimiHalo(0.5, { inkLoad: 0 });
    expect(halo.widthScale).toBeCloseTo(1, 1);
    expect(halo.alpha).toBeCloseTo(0, 1);
  });
});
