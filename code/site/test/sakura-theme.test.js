import { describe, it, expect, beforeEach } from 'vitest';
import sakura from '../js/themes/sakura.js';

describe('sakura theme', () => {
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
      moveTo: () => {},
      lineTo: () => {},
      bezierCurveTo: () => {},
      quadraticCurveTo: () => {},
      arc: () => {},
      ellipse: () => {},
      fill: () => {},
      stroke: () => {},
      drawImage: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      globalAlpha: 1,
      filter: '',
    };
  });

  it('has id "sakura"', () => {
    expect(sakura.id).toBe('sakura');
  });

  it('implements the theme interface', () => {
    expect(typeof sakura.init).toBe('function');
    expect(typeof sakura.resize).toBe('function');
    expect(typeof sakura.frame).toBe('function');
    expect(typeof sakura.destroy).toBe('function');
    expect(typeof sakura.reducedMotion).toBe('function');
  });

  it('spawns desktop petal count on wide canvas', () => {
    sakura.init(canvas, ctx);
    expect(sakura._petals.length).toBeGreaterThanOrEqual(20);
    expect(sakura._petals.length).toBeLessThanOrEqual(30);
  });

  it('spawns mobile petal count on narrow canvas', () => {
    canvas.width = 375;
    sakura.init(canvas, ctx);
    expect(sakura._petals.length).toBeLessThanOrEqual(15);
  });

  it('frame returns true', () => {
    sakura.init(canvas, ctx);
    expect(sakura.frame(0)).toBe(true);
  });

  it('petals fall over time', () => {
    sakura.init(canvas, ctx);
    const initialY = sakura._petals[0].y;
    sakura.frame(0);
    sakura.frame(1000); // 1 second later
    expect(sakura._petals[0].y).toBeGreaterThan(initialY);
  });

  it('resize adjusts petal count', () => {
    sakura.init(canvas, ctx);
    const desktopCount = sakura._petals.length;
    sakura.resize(375, 667);
    const mobileCount = sakura._petals.length;
    expect(mobileCount).toBeLessThan(desktopCount);
  });

  it('destroy cleans up', () => {
    sakura.init(canvas, ctx);
    sakura.destroy();
    expect(sakura._petals).toEqual([]);
    expect(sakura._ctx).toBeNull();
  });

  it('reducedMotion draws static petals without throwing', () => {
    sakura.init(canvas, ctx);
    expect(() => sakura.reducedMotion()).not.toThrow();
  });
});
