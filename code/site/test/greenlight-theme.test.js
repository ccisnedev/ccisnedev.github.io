import { describe, it, expect, beforeEach } from 'vitest';
import greenlight from '../js/themes/greenlight.js';

describe('greenlight theme', () => {
  let canvas;
  let ctx;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    ctx = {
      fillStyle: '',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      fillRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      save: () => {},
      restore: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      createRadialGradient: () => ({
        addColorStop: () => {},
      }),
    };
  });

  it('has id "greenlight"', () => {
    expect(greenlight.id).toBe('greenlight');
  });

  it('implements the theme interface', () => {
    expect(typeof greenlight.init).toBe('function');
    expect(typeof greenlight.resize).toBe('function');
    expect(typeof greenlight.frame).toBe('function');
    expect(typeof greenlight.destroy).toBe('function');
    expect(typeof greenlight.reducedMotion).toBe('function');
  });

  it('init does not throw', () => {
    expect(() => greenlight.init(canvas, ctx)).not.toThrow();
  });

  it('frame returns true', () => {
    greenlight.init(canvas, ctx);
    expect(greenlight.frame(0)).toBe(true);
  });

  it('frame renders without throwing at various timestamps', () => {
    greenlight.init(canvas, ctx);
    expect(() => greenlight.frame(0)).not.toThrow();
    expect(() => greenlight.frame(1000)).not.toThrow();
    expect(() => greenlight.frame(5000)).not.toThrow();
    expect(() => greenlight.frame(30000)).not.toThrow();
  });

  it('resize does not throw', () => {
    greenlight.init(canvas, ctx);
    expect(() => greenlight.resize(375, 667)).not.toThrow();
  });

  it('destroy cleans up', () => {
    greenlight.init(canvas, ctx);
    greenlight.destroy();
    expect(greenlight._ctx).toBeNull();
  });

  it('reducedMotion draws static scene without throwing', () => {
    greenlight.init(canvas, ctx);
    expect(() => greenlight.reducedMotion()).not.toThrow();
  });
});
