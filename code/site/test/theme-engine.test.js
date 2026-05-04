import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeEngine } from '../js/main.js';

describe('ThemeEngine', () => {
  let canvas;
  let engine;

  beforeEach(() => {
    document.body.innerHTML = `
      <canvas id="scene" width="800" height="600"></canvas>
      <nav id="theme-nav">
        <button data-theme="void">void</button>
        <button data-theme="sakura">sakura</button>
        <button data-theme="greenlight">greenlight</button>
      </nav>
      <footer id="project-bar">
        <a href="https://inquiry.ccisne.dev">inquiry</a>
        <a href="https://macss.ccisne.dev">macss</a>
      </footer>
    `;
    canvas = document.getElementById('scene');
    localStorage.clear();
  });

  afterEach(() => {
    if (engine) engine.destroy();
    engine = null;
  });

  describe('initialization', () => {
    it('creates engine with canvas element', () => {
      engine = new ThemeEngine(canvas);
      expect(engine).toBeDefined();
      expect(engine.canvas).toBe(canvas);
    });

    it('defaults to void theme when no localStorage', () => {
      engine = new ThemeEngine(canvas);
      engine.start();
      expect(engine.currentTheme).toBe('void');
    });

    it('restores theme from localStorage', () => {
      localStorage.setItem('ccisne-theme', 'greenlight');
      engine = new ThemeEngine(canvas);
      engine.start();
      expect(engine.currentTheme).toBe('greenlight');
    });

    it('falls back to void if stored theme is invalid', () => {
      localStorage.setItem('ccisne-theme', 'nonexistent');
      engine = new ThemeEngine(canvas);
      engine.start();
      expect(engine.currentTheme).toBe('void');
    });

    it('sets data-theme attribute on body', () => {
      engine = new ThemeEngine(canvas);
      engine.start();
      expect(document.body.dataset.theme).toBe('void');
    });
  });

  describe('theme switching', () => {
    it('switches to a registered theme', () => {
      engine = new ThemeEngine(canvas);
      engine.start();
      engine.switchTo('sakura');
      expect(engine.currentTheme).toBe('sakura');
    });

    it('persists selection to localStorage', () => {
      engine = new ThemeEngine(canvas);
      engine.start();
      engine.switchTo('greenlight');
      expect(localStorage.getItem('ccisne-theme')).toBe('greenlight');
    });

    it('updates data-theme on body', () => {
      engine = new ThemeEngine(canvas);
      engine.start();
      engine.switchTo('greenlight');
      expect(document.body.dataset.theme).toBe('greenlight');
    });

    it('ignores switch to unknown theme', () => {
      engine = new ThemeEngine(canvas);
      engine.start();
      engine.switchTo('nonexistent');
      expect(engine.currentTheme).toBe('void');
    });

    it('calls destroy on previous theme before switching', () => {
      engine = new ThemeEngine(canvas);
      engine.start();
      const voidTheme = engine.registry.get('void');
      const destroySpy = vi.spyOn(voidTheme, 'destroy');
      engine.switchTo('sakura');
      expect(destroySpy).toHaveBeenCalled();
    });

    it('calls init on new theme after switching', () => {
      engine = new ThemeEngine(canvas);
      engine.start();
      const cbTheme = engine.registry.get('sakura');
      const initSpy = vi.spyOn(cbTheme, 'init');
      engine.switchTo('sakura');
      expect(initSpy).toHaveBeenCalledWith(canvas, engine.ctx);
    });
  });

  describe('theme registry', () => {
    it('has void theme registered', () => {
      engine = new ThemeEngine(canvas);
      expect(engine.registry.has('void')).toBe(true);
    });

    it('has sakura theme registered', () => {
      engine = new ThemeEngine(canvas);
      expect(engine.registry.has('sakura')).toBe(true);
    });

    it('has greenlight theme registered', () => {
      engine = new ThemeEngine(canvas);
      expect(engine.registry.has('greenlight')).toBe(true);
    });

    it('all themes implement required interface', () => {
      engine = new ThemeEngine(canvas);
      for (const [id, theme] of engine.registry) {
        expect(theme).toHaveProperty('id');
        expect(theme.id).toBe(id);
        expect(typeof theme.init).toBe('function');
        expect(typeof theme.resize).toBe('function');
        expect(typeof theme.frame).toBe('function');
        expect(typeof theme.destroy).toBe('function');
        expect(typeof theme.reducedMotion).toBe('function');
      }
    });
  });

  describe('canvas management', () => {
    it('resizes canvas to fill viewport on start', () => {
      engine = new ThemeEngine(canvas);
      engine.start();
      expect(canvas.width).toBe(window.innerWidth);
      expect(canvas.height).toBe(window.innerHeight);
    });

    it('provides 2d context to theme init', () => {
      engine = new ThemeEngine(canvas);
      engine.start();
      const ctx = canvas.getContext('2d');
      expect(ctx).toBeDefined();
    });
  });

  describe('destroy', () => {
    it('stops animation loop', () => {
      engine = new ThemeEngine(canvas);
      engine.start();
      engine.destroy();
      expect(engine.running).toBe(false);
    });

    it('calls destroy on active theme', () => {
      engine = new ThemeEngine(canvas);
      engine.start();
      const voidTheme = engine.registry.get('void');
      const destroySpy = vi.spyOn(voidTheme, 'destroy');
      engine.destroy();
      expect(destroySpy).toHaveBeenCalled();
    });
  });
});
