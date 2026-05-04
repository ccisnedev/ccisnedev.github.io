import { describe, it, expect } from 'vitest';
import { generateSplatter } from '../../js/themes/void/splatter.js';

describe('splatter', () => {
  const stamp = { x: 400, y: 300, size: 30, alpha: 0.8, angle: 0 };

  it('returns an array of droplet descriptors', () => {
    const drops = generateSplatter(stamp, { seed: 1 });
    expect(Array.isArray(drops)).toBe(true);
  });

  it('each droplet has x, y, radius, alpha', () => {
    const drops = generateSplatter(stamp, { seed: 1, count: 5 });
    for (const d of drops) {
      expect(d).toHaveProperty('x');
      expect(d).toHaveProperty('y');
      expect(d).toHaveProperty('radius');
      expect(d).toHaveProperty('alpha');
      expect(typeof d.x).toBe('number');
      expect(typeof d.radius).toBe('number');
      expect(d.radius).toBeGreaterThan(0);
      expect(d.alpha).toBeGreaterThan(0);
      expect(d.alpha).toBeLessThanOrEqual(1);
    }
  });

  it('respects count option', () => {
    const drops3 = generateSplatter(stamp, { seed: 1, count: 3 });
    const drops10 = generateSplatter(stamp, { seed: 1, count: 10 });
    expect(drops3.length).toBe(3);
    expect(drops10.length).toBe(10);
  });

  it('droplets are near the stamp position', () => {
    const drops = generateSplatter(stamp, { seed: 42, count: 20 });
    for (const d of drops) {
      const dist = Math.hypot(d.x - stamp.x, d.y - stamp.y);
      // Should be within a reasonable scatter radius (proportional to stamp size)
      expect(dist).toBeLessThan(stamp.size * 5);
    }
  });

  it('droplet radii are smaller than the stamp size', () => {
    const drops = generateSplatter(stamp, { seed: 7, count: 20 });
    for (const d of drops) {
      expect(d.radius).toBeLessThan(stamp.size * 0.5);
    }
  });

  it('is deterministic with same seed', () => {
    const a = generateSplatter(stamp, { seed: 99, count: 5 });
    const b = generateSplatter(stamp, { seed: 99, count: 5 });
    expect(a).toEqual(b);
  });

  it('different seeds produce different results', () => {
    const a = generateSplatter(stamp, { seed: 1, count: 5 });
    const b = generateSplatter(stamp, { seed: 2, count: 5 });
    const same = a.every((d, i) => d.x === b[i].x && d.y === b[i].y);
    expect(same).toBe(false);
  });

  it('alpha of droplets is attenuated relative to stamp alpha', () => {
    const weakStamp = { ...stamp, alpha: 0.2 };
    const drops = generateSplatter(weakStamp, { seed: 1, count: 5 });
    for (const d of drops) {
      expect(d.alpha).toBeLessThanOrEqual(weakStamp.alpha);
    }
  });
});
