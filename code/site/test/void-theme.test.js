import { describe, it, expect, beforeEach } from 'vitest';
import voidTheme from '../js/themes/void.js';

describe('void theme', () => {
  let canvas;
  let ctx;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    // jsdom does not implement getContext; mock a minimal 2d context
    ctx = {
      fillStyle: '',
      fillRect: () => {},
    };
  });

  it('has id "void"', () => {
    expect(voidTheme.id).toBe('void');
  });

  it('implements the theme interface', () => {
    expect(typeof voidTheme.init).toBe('function');
    expect(typeof voidTheme.resize).toBe('function');
    expect(typeof voidTheme.frame).toBe('function');
    expect(typeof voidTheme.destroy).toBe('function');
    expect(typeof voidTheme.reducedMotion).toBe('function');
  });

  it('init does not throw', () => {
    expect(() => voidTheme.init(canvas, ctx)).not.toThrow();
  });

  it('frame sets fillStyle to black and calls fillRect', () => {
    voidTheme.init(canvas, ctx);
    voidTheme.frame(0);
    expect(ctx.fillStyle).toBe('#000000');
  });

  it('frame returns true (continue animating)', () => {
    voidTheme.init(canvas, ctx);
    expect(voidTheme.frame(0)).toBe(true);
  });

  it('resize does not throw', () => {
    voidTheme.init(canvas, ctx);
    expect(() => voidTheme.resize(1024, 768)).not.toThrow();
  });

  it('destroy does not throw', () => {
    voidTheme.init(canvas, ctx);
    expect(() => voidTheme.destroy()).not.toThrow();
  });

  it('reducedMotion fills black', () => {
    voidTheme.init(canvas, ctx);
    voidTheme.reducedMotion();
    expect(ctx.fillStyle).toBe('#000000');
  });
});
