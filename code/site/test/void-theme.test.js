import { describe, it, expect, beforeEach, vi } from 'vitest';
import voidTheme, { strokeTiming } from '../js/themes/void.js';

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
      globalAlpha: 1,
      globalCompositeOperation: '',
      fillRect: () => {},
      clearRect: () => {},
      drawImage: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      bezierCurveTo: () => {},
      quadraticCurveTo: () => {},
      stroke: () => {},
      fill: () => {},
      save: () => {},
      restore: () => {},
      setLineDash: () => {},
      lineDashOffset: 0,
      arc: () => {},
      ellipse: () => {},
      translate: () => {},
      rotate: () => {},
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

  it('does not run a separate ink-pool animation at stroke start', () => {
    voidTheme.init(canvas, ctx);
    let clearCount = 0;
    let strokeCount = 0;
    ctx.clearRect = () => { clearCount++; };
    ctx.stroke = () => { strokeCount++; };
    // First frame at t=0
    voidTheme.frame(0);
    // At exactly 1s the stroke has not advanced, so no standalone pool is drawn.
    voidTheme.frame(1000);
    expect(clearCount).toBe(0);
    expect(strokeCount).toBe(0);
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

  it('draws the initial contact together with the first bristle strokes', () => {
    voidTheme.init(canvas, ctx);
    let rectCount = 0;
    let strokeCount = 0;
    ctx.fillRect = () => { rectCount++; };
    ctx.stroke = () => { strokeCount++; };
    ctx.fill = () => {};
    // Trigger ensō draw just after contact; ink pool and bristles appear together.
    voidTheme.frame(0);     // start time
    voidTheme.frame(1500);
    expect(rectCount).toBeGreaterThan(10);
    expect(strokeCount).toBeGreaterThan(1);
  });

  it('stroke timing starts very slowly, accelerates, then eases out', () => {
    expect(strokeTiming(0)).toBe(0);
    expect(strokeTiming(0.12)).toBeCloseTo(0.02, 3);
    expect(strokeTiming(0.38)).toBeCloseTo(0.4, 3);
    expect(strokeTiming(1)).toBe(1);

    const earlyDelta = strokeTiming(0.12) - strokeTiming(0.06);
    const accelerationDelta = strokeTiming(0.38) - strokeTiming(0.28);
    const finishDelta = strokeTiming(1) - strokeTiming(0.9);

    expect(accelerationDelta).toBeGreaterThan(earlyDelta * 5);
    expect(accelerationDelta).toBeGreaterThan(finishDelta);
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
    ctx.fill = () => {};
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
