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
      strokeStyle: '',
      lineWidth: 0,
      lineCap: '',
      lineJoin: '',
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      bezierCurveTo: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      setLineDash: () => {},
      lineDashOffset: 0,
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

  it('init generates an ensō path', () => {
    voidTheme.init(canvas, ctx);
    expect(voidTheme._ensoPath).toBeDefined();
    expect(voidTheme._ensoPath.start).toBeDefined();
    expect(voidTheme._ensoPath.curves.length).toBeGreaterThan(0);
  });

  it('frame sets fillStyle to black', () => {
    voidTheme.init(canvas, ctx);
    voidTheme.frame(0);
    expect(ctx.fillStyle).toBe('#000000');
  });

  it('frame returns true (continue animating)', () => {
    voidTheme.init(canvas, ctx);
    expect(voidTheme.frame(0)).toBe(true);
  });

  it('frame draws ensō after 1 second elapsed', () => {
    voidTheme.init(canvas, ctx);
    let stroked = false;
    ctx.stroke = () => { stroked = true; };
    // First frame at t=0
    voidTheme.frame(0);
    expect(stroked).toBe(false);
    // Frame at t=1500ms (ensō should be drawing)
    voidTheme.frame(1500);
    expect(stroked).toBe(true);
  });

  it('resize regenerates ensō path', () => {
    voidTheme.init(canvas, ctx);
    const firstPath = voidTheme._ensoPath;
    voidTheme.resize(1024, 768);
    expect(voidTheme._ensoPath).not.toBe(firstPath);
  });

  it('resize does not throw', () => {
    voidTheme.init(canvas, ctx);
    expect(() => voidTheme.resize(1024, 768)).not.toThrow();
  });

  it('destroy does not throw', () => {
    voidTheme.init(canvas, ctx);
    expect(() => voidTheme.destroy()).not.toThrow();
  });

  it('reducedMotion draws the ensō fully (no animation)', () => {
    voidTheme.init(canvas, ctx);
    let stroked = false;
    ctx.stroke = () => { stroked = true; };
    voidTheme.reducedMotion();
    expect(stroked).toBe(true);
  });
});
