import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  it('uses dash pattern [length, length] to prevent second stroke fragment', () => {
    voidTheme.init(canvas, ctx);
    let dashPattern = null;
    ctx.setLineDash = (pattern) => { dashPattern = pattern; };
    // Trigger ensō draw at partial progress
    voidTheme.frame(0);     // start time
    voidTheme.frame(2000);  // 2s in = ensō is drawing
    // Dash pattern must have TWO values (dash + gap both equal totalLength)
    expect(dashPattern).not.toBeNull();
    expect(dashPattern.length).toBe(2);
    expect(dashPattern[0]).toBe(dashPattern[1]);
  });

  it('estimated length >= actual path arc to prevent dash repetition ghost', () => {
    voidTheme.init(canvas, ctx);
    const r = voidTheme._ensoPath.r;
    // The path draws ~98% of a circle (3.92 quarter-arcs).
    // totalLength must be >= actual path to avoid the dash pattern repeating.
    const actualArc = 2 * Math.PI * r * 0.98;
    expect(voidTheme._ensoLength).toBeGreaterThanOrEqual(actualArc);
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

  describe('ensō start point and direction', () => {
    it('start point is near 9 o\'clock (left side of circle)', () => {
      voidTheme.init(canvas, ctx);
      const { start, cx, r } = voidTheme._ensoPath;
      // At 9 o'clock: x ≈ cx - r, y ≈ cy
      // Allow ±15% of radius for jitter + angular variation
      const tolerance = r * 0.3;
      expect(start.x).toBeLessThan(cx - r * 0.5);        // clearly left of center
      expect(start.x).toBeGreaterThan(cx - r - tolerance); // not too far left
    });

    it('start angle varies slightly between inits (not exact 9:00)', () => {
      // Run multiple inits and collect start Y positions
      const yValues = new Set();
      for (let i = 0; i < 20; i++) {
        voidTheme.init(canvas, ctx);
        yValues.add(Math.round(voidTheme._ensoPath.start.y));
      }
      // Should have some variation (not all identical)
      expect(yValues.size).toBeGreaterThan(1);
    });

    it('is clockwise 90% of the time (statistical)', () => {
      let clockwiseCount = 0;
      const runs = 200;
      for (let i = 0; i < runs; i++) {
        voidTheme.init(canvas, ctx);
        if (voidTheme._ensoPath.clockwise) clockwiseCount++;
      }
      // Expect ~90% ± reasonable tolerance for randomness
      // With 200 runs, 90% = 180. Allow [150, 200] to avoid flaky test.
      expect(clockwiseCount).toBeGreaterThan(150);
      expect(clockwiseCount).toBeLessThanOrEqual(200);
    });

    it('can occasionally be counter-clockwise', () => {
      // Force enough inits that at least one should be CCW (10% chance each)
      // With 100 runs, P(all CW) = 0.9^100 ≈ 0.00003 — negligible
      let hasCCW = false;
      for (let i = 0; i < 100; i++) {
        voidTheme.init(canvas, ctx);
        if (!voidTheme._ensoPath.clockwise) {
          hasCCW = true;
          break;
        }
      }
      expect(hasCCW).toBe(true);
    });

    it('exposes clockwise property on the ensō path', () => {
      voidTheme.init(canvas, ctx);
      expect(typeof voidTheme._ensoPath.clockwise).toBe('boolean');
    });
  });
});
