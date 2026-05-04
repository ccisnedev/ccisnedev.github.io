import voidTheme from './themes/void.js';
import sakuraTheme from './themes/sakura.js';
import greenlightTheme from './themes/greenlight.js';

/**
 * @typedef {Object} Theme
 * @property {string} id
 * @property {(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void} init
 * @property {(width: number, height: number) => void} resize
 * @property {(timestamp: number) => boolean} frame
 * @property {() => void} destroy
 * @property {() => void} reducedMotion
 */

const STORAGE_KEY = 'ccisne-theme';

export class ThemeEngine {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this._frameId = null;
    this._activeTheme = null;

    /** @type {Map<string, Theme>} */
    this.registry = new Map();
    this.registry.set(voidTheme.id, voidTheme);
    this.registry.set(sakuraTheme.id, sakuraTheme);
    this.registry.set(greenlightTheme.id, greenlightTheme);
  }

  get currentTheme() {
    return this._activeTheme ? this._activeTheme.id : null;
  }

  start() {
    this._resizeCanvas();
    const stored = localStorage.getItem(STORAGE_KEY);
    const themeId = this.registry.has(stored) ? stored : 'void';
    this._activate(themeId);
    this.running = true;
    this._loop();
    window.addEventListener('resize', this._onResize);
  }

  /** @param {string} id */
  switchTo(id) {
    if (!this.registry.has(id)) return;
    if (this._activeTheme) this._activeTheme.destroy();
    this._activate(id);
  }

  destroy() {
    this.running = false;
    if (this._frameId != null) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
    if (this._activeTheme) {
      this._activeTheme.destroy();
      this._activeTheme = null;
    }
    window.removeEventListener('resize', this._onResize);
  }

  /** @param {string} id */
  _activate(id) {
    const theme = this.registry.get(id);
    this._activeTheme = theme;
    theme.init(this.canvas, this.ctx);
    localStorage.setItem(STORAGE_KEY, id);
    document.body.dataset.theme = id;
  }

  _loop = () => {
    if (!this.running) return;
    if (this._activeTheme) {
      this._activeTheme.frame(performance.now());
    }
    this._frameId = requestAnimationFrame(this._loop);
  };

  _onResize = () => {
    this._resizeCanvas();
    if (this._activeTheme) {
      this._activeTheme.resize(this.canvas.width, this.canvas.height);
    }
  };

  _resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
}

// --- Boot (only in browser, not in test) ---
if (typeof document !== 'undefined' && document.getElementById('scene')) {
  const canvas = document.getElementById('scene');
  const engine = new ThemeEngine(canvas);
  engine.start();

  // Wire up theme nav buttons
  const nav = document.getElementById('theme-nav');
  if (nav) {
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-theme]');
      if (!btn) return;
      engine.switchTo(btn.dataset.theme);
      // Update aria-pressed
      nav.querySelectorAll('button').forEach((b) => {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
    });
  }
}
