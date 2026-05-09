import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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
      moveTo: () => {},
      lineTo: () => {},
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

  afterEach(() => {
    greenlight.destroy();
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

  describe('performance optimizations', () => {
    let gradientSpy;
    
    beforeEach(() => {
      gradientSpy = vi.spyOn(ctx, 'createLinearGradient');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('caches sky gradient and does not recreate on every frame', () => {
      greenlight.init(canvas, ctx);
      
      // init or resize might create it originally
      gradientSpy.mockClear();
      
      greenlight.frame(100);
      greenlight.frame(116);
      
      expect(gradientSpy).not.toHaveBeenCalled();
    });

    it('recalculates sky gradient on resize', () => {
      greenlight.init(canvas, ctx);
      gradientSpy.mockClear();
      
      greenlight.resize(800, 600);
      
      expect(gradientSpy).toHaveBeenCalled();
    });
  });

  describe('audio behavior', () => {
    let playMock;
    let AudioSpy;
    
    beforeEach(() => {
      // JsDOM implements Audio using HTMLAudioElement/HTMLMediaElement
      playMock = vi.fn().mockResolvedValue(undefined);
      AudioSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(playMock);
      vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('does not play audio immediately on init', () => {
      greenlight.init(canvas, ctx);
      expect(playMock).not.toHaveBeenCalled();
    });

    it('plays audio on first document click', () => {
      greenlight.init(canvas, ctx);
      
      const clickEvent = new window.Event('click');
      document.dispatchEvent(clickEvent);
      
      expect(playMock).toHaveBeenCalledOnce();
    });

    it('plays audio only once regardless of multiple clicks', () => {
      greenlight.init(canvas, ctx);
      
      document.dispatchEvent(new window.Event('click'));
      document.dispatchEvent(new window.Event('click'));
      
      expect(playMock).toHaveBeenCalledOnce();
    });

    it('removes event listener on destroy', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      greenlight.init(canvas, ctx);
      // We expect the theme to listen for clicks
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), { once: true });
      
      greenlight.destroy();
      // And we expect it to clean up the listener if the theme is destroyed before the click
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });
});
