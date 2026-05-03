import { describe, it, expect, beforeEach } from 'vitest';
import cherryblossom from '../js/themes/cherryblossom.js';

describe('cherryblossom theme', () => {
  let canvas;
  let ctx;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    ctx = {
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      beginPath: () => {},
      ellipse: () => {},
      fill: () => {},
      fillStyle: '',
      globalAlpha: 1,
    };
  });

  it('has id "cherryblossom"', () => {
    expect(cherryblossom.id).toBe('cherryblossom');
  });

  it('implements the theme interface', () => {
    expect(typeof cherryblossom.init).toBe('function');
    expect(typeof cherryblossom.resize).toBe('function');
    expect(typeof cherryblossom.frame).toBe('function');
    expect(typeof cherryblossom.destroy).toBe('function');
    expect(typeof cherryblossom.reducedMotion).toBe('function');
  });

  it('spawns desktop petal count on wide canvas', () => {
    cherryblossom.init(canvas, ctx);
    expect(cherryblossom._petals.length).toBeGreaterThanOrEqual(20);
    expect(cherryblossom._petals.length).toBeLessThanOrEqual(30);
  });

  it('spawns mobile petal count on narrow canvas', () => {
    canvas.width = 375;
    cherryblossom.init(canvas, ctx);
    expect(cherryblossom._petals.length).toBeLessThanOrEqual(15);
  });

  it('frame returns true', () => {
    cherryblossom.init(canvas, ctx);
    expect(cherryblossom.frame(0)).toBe(true);
  });

  it('petals fall over time', () => {
    cherryblossom.init(canvas, ctx);
    const initialY = cherryblossom._petals[0].y;
    cherryblossom.frame(0);
    cherryblossom.frame(1000); // 1 second later
    expect(cherryblossom._petals[0].y).toBeGreaterThan(initialY);
  });

  it('resize adjusts petal count', () => {
    cherryblossom.init(canvas, ctx);
    const desktopCount = cherryblossom._petals.length;
    cherryblossom.resize(375, 667);
    const mobileCount = cherryblossom._petals.length;
    expect(mobileCount).toBeLessThan(desktopCount);
  });

  it('destroy cleans up', () => {
    cherryblossom.init(canvas, ctx);
    cherryblossom.destroy();
    expect(cherryblossom._petals).toEqual([]);
    expect(cherryblossom._ctx).toBeNull();
  });

  it('reducedMotion draws static petals without throwing', () => {
    cherryblossom.init(canvas, ctx);
    expect(() => cherryblossom.reducedMotion()).not.toThrow();
  });
});
