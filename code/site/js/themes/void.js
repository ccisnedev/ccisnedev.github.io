/** @type {import('./main.js').Theme} */
export default {
  id: 'void',

  init(canvas, ctx) {
    this._ctx = ctx;
    this._w = canvas.width;
    this._h = canvas.height;
    this._fill();
  },

  resize(width, height) {
    this._w = width;
    this._h = height;
    this._fill();
  },

  frame(_timestamp) {
    this._fill();
    return true;
  },

  destroy() {
    this._ctx = null;
  },

  reducedMotion() {
    this._fill();
  },

  _fill() {
    if (!this._ctx) return;
    this._ctx.fillStyle = '#000000';
    this._ctx.fillRect(0, 0, this._w, this._h);
  },
};
