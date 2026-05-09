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

  it('petals start above the viewport so they enter from the top', () => {
    sakura.init(canvas, ctx);
    for (const p of sakura._petals) {
      expect(p.y).toBeLessThan(0);
    }
  });

  it('petals fall over time once growth and blossom reveal complete', () => {
    sakura.init(canvas, ctx);
    // Skip past tree-growth and blossom-reveal phases so petals are active
    for (const b of sakura._branches) b._baked = true;
    for (const b of sakura._blossoms) b._baked = true;
    sakura._petalsStartAt = 0;
    sakura._petals[0].appearAt = 0;
    sakura._elapsed = 0;
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

  it('a blossom is only drawable after its host branch is fully placed', () => {
    sakura.init(canvas, ctx);
    // March through the entire growth + bloom window, frame by frame.
    // On every frame the invariant must hold: if a blossom is visible
    // (alpha > 0) or already committed, then its host branch must be
    // fully placed (baked). A blossom drawn before its host branch
    // produces the bug where the branch is later painted on top of it.
    for (let t = 0; t < 6000; t += 60) {
      sakura.frame(t);
      for (const blossom of sakura._blossoms) {
        const visible = blossom._alpha > 0 || blossom._baked === true;
        if (!visible) continue;
        const branch = sakura._branches[blossom.branchIndex];
        expect(branch).toBeDefined();
        expect(branch._baked).toBe(true);
      }
    }
  });

  it('a blossom is never baked into the buffer before its host branch is baked', () => {
    sakura.init(canvas, ctx);
    for (let t = 0; t < 6000; t += 60) {
      sakura.frame(t);
      for (const blossom of sakura._blossoms) {
        if (blossom._baked !== true) continue;
        const branch = sakura._branches[blossom.branchIndex];
        expect(branch).toBeDefined();
        // If the blossom is in the buffer, its host branch must be in the
        // buffer too — otherwise the global branch bake later overwrites
        // the flower.
        expect(branch._baked).toBe(true);
      }
    }
  });
});
