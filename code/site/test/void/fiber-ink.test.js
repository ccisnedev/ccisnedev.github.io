import { describe, it, expect } from 'vitest';
import { fiberAlpha, fiberWidth } from '../../js/themes/void/fiber-ink.js';

describe('fiberAlpha', () => {
  const centralFiber = { offset: 0.05, retention: 0.9 };
  const externalFiber = { offset: 0.45, retention: 0.7 };

  it('returns ~1.0 at t=0 for any fiber (fully loaded)', () => {
    expect(fiberAlpha(0, centralFiber)).toBeCloseTo(1.0, 1);
    expect(fiberAlpha(0, externalFiber)).toBeCloseTo(1.0, 1);
  });

  it('is monotonically non-increasing', () => {
    for (let t = 0.05; t <= 1.0; t += 0.05) {
      expect(fiberAlpha(t, centralFiber)).toBeLessThanOrEqual(fiberAlpha(t - 0.05, centralFiber) + 0.001);
    }
  });

  it('central fiber retains more alpha at t=0.8 than external fiber', () => {
    expect(fiberAlpha(0.8, centralFiber)).toBeGreaterThan(fiberAlpha(0.8, externalFiber));
  });

  it('higher retention holds more alpha at same t', () => {
    const highRet = { offset: 0.3, retention: 1.0 };
    const lowRet = { offset: 0.3, retention: 0.6 };
    expect(fiberAlpha(0.7, highRet)).toBeGreaterThan(fiberAlpha(0.7, lowRet));
  });

  it('external fiber is dimmer than central at t=1', () => {
    expect(fiberAlpha(1, externalFiber)).toBeLessThan(fiberAlpha(1, centralFiber));
  });

  it('never returns negative', () => {
    for (let t = 0; t <= 1; t += 0.1) {
      expect(fiberAlpha(t, externalFiber)).toBeGreaterThanOrEqual(0);
    }
  });

  it('higher decayRate causes faster decay', () => {
    const fast = fiberAlpha(0.5, centralFiber, { decayRate: 6 });
    const slow = fiberAlpha(0.5, centralFiber, { decayRate: 2 });
    expect(fast).toBeLessThan(slow);
  });
});

describe('fiberWidth', () => {
  const fiber = { offset: 0.3, retention: 0.8 };

  it('returns ~1.0 at t=0 (full width at start)', () => {
    expect(fiberWidth(0, fiber)).toBeCloseTo(1.0, 1);
  });

  it('decreases as fiber dries (correlates with alpha decay)', () => {
    expect(fiberWidth(0.9, fiber)).toBeLessThan(fiberWidth(0.1, fiber));
  });

  it('never goes below 0.3', () => {
    for (let t = 0; t <= 1; t += 0.1) {
      expect(fiberWidth(t, fiber)).toBeGreaterThanOrEqual(0.3);
    }
  });
});
