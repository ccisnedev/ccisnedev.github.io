import { describe, it, expect } from 'vitest';
import { kasureMask } from '../../js/themes/void/kasure.js';

describe('kasure (dry brush)', () => {
  it('returns a value in [0, 1]', () => {
    for (let offset = -1; offset <= 1; offset += 0.1) {
      const v = kasureMask(offset, 0.5, { seed: 0, fiberCount: 8 });
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('when ink is full (inkLevel=1), mask is mostly 1 (no dry effect)', () => {
    let sum = 0;
    const N = 20;
    for (let i = 0; i < N; i++) {
      const offset = (i / (N - 1)) * 2 - 1; // [-1, 1]
      sum += kasureMask(offset, 1.0, { seed: 0, fiberCount: 8 });
    }
    const avg = sum / N;
    expect(avg).toBeGreaterThan(0.9);
  });

  it('when ink is depleted (inkLevel≈0), mask has many gaps (avg < 0.5)', () => {
    let sum = 0;
    const N = 50;
    for (let i = 0; i < N; i++) {
      const offset = (i / (N - 1)) * 2 - 1;
      sum += kasureMask(offset, 0.05, { seed: 7, fiberCount: 12 });
    }
    const avg = sum / N;
    expect(avg).toBeLessThan(0.5);
  });

  it('creates fiber-like banding pattern (periodic structure)', () => {
    // At moderate ink depletion, adjacent offset values should alternate high/low
    const values = [];
    for (let i = 0; i < 30; i++) {
      const offset = (i / 29) * 2 - 1;
      values.push(kasureMask(offset, 0.4, { seed: 3, fiberCount: 8 }));
    }
    // Count transitions (high→low or low→high)
    let transitions = 0;
    for (let i = 1; i < values.length; i++) {
      if ((values[i] > 0.5) !== (values[i - 1] > 0.5)) transitions++;
    }
    // Should have multiple transitions (fiber bands)
    expect(transitions).toBeGreaterThanOrEqual(2);
  });

  it('is deterministic with same seed', () => {
    const a = kasureMask(0.3, 0.4, { seed: 42, fiberCount: 8 });
    const b = kasureMask(0.3, 0.4, { seed: 42, fiberCount: 8 });
    expect(a).toBe(b);
  });

  it('fiberCount controls band frequency', () => {
    // More fibers = more transitions
    const values4 = [];
    const values16 = [];
    for (let i = 0; i < 50; i++) {
      const offset = (i / 49) * 2 - 1;
      values4.push(kasureMask(offset, 0.2, { seed: 1, fiberCount: 4 }));
      values16.push(kasureMask(offset, 0.2, { seed: 1, fiberCount: 16 }));
    }
    const countTransitions = (arr) => {
      let t = 0;
      for (let i = 1; i < arr.length; i++) {
        if ((arr[i] > 0.5) !== (arr[i - 1] > 0.5)) t++;
      }
      return t;
    };
    expect(countTransitions(values16)).toBeGreaterThan(countTransitions(values4));
  });
});
