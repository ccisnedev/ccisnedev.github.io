import { describe, it, expect } from 'vitest';
import { generateForestLayers } from '../../js/themes/sakura/forest-backdrop.js';

describe('forest-backdrop (bokeh)', () => {
  const width = 1024;
  const height = 768;
  const seed = 42;

  it('returns an array of 3 layers', () => {
    const layers = generateForestLayers(width, height, seed);
    expect(Array.isArray(layers)).toBe(true);
    expect(layers.length).toBe(3);
  });

  it('each layer has blur, opacity, and points array with bokeh circles', () => {
    const layers = generateForestLayers(width, height, seed);
    for (const layer of layers) {
      expect(typeof layer.blur).toBe('number');
      expect(layer.blur).toBeGreaterThan(0);
      expect(typeof layer.opacity).toBe('number');
      expect(layer.opacity).toBeGreaterThan(0);
      expect(layer.opacity).toBeLessThanOrEqual(1);
      expect(Array.isArray(layer.points)).toBe(true);
      expect(layer.points.length).toBeGreaterThan(2);
    }
  });

  it('farther layers have more blur and less opacity', () => {
    const layers = generateForestLayers(width, height, seed);
    for (let i = 1; i < layers.length; i++) {
      expect(layers[i].blur).toBeLessThanOrEqual(layers[i - 1].blur);
      expect(layers[i].opacity).toBeGreaterThanOrEqual(layers[i - 1].opacity);
    }
  });

  it('each bokeh point has x, y, radius, and color', () => {
    const layers = generateForestLayers(width, height, seed);
    for (const layer of layers) {
      for (const pt of layer.points) {
        expect(typeof pt.x).toBe('number');
        expect(typeof pt.y).toBe('number');
        expect(pt.radius).toBeGreaterThan(0);
        expect(typeof pt.color).toBe('string');
      }
    }
  });

  it('bokeh circles are within canvas bounds', () => {
    const layers = generateForestLayers(width, height, seed);
    for (const layer of layers) {
      for (const pt of layer.points) {
        expect(pt.x).toBeGreaterThanOrEqual(0);
        expect(pt.x).toBeLessThanOrEqual(width);
        expect(pt.y).toBeGreaterThanOrEqual(0);
        expect(pt.y).toBeLessThanOrEqual(height);
      }
    }
  });

  it('is deterministic with same seed', () => {
    const a = generateForestLayers(width, height, seed);
    const b = generateForestLayers(width, height, seed);
    expect(a).toEqual(b);
  });

  it('produces different results with different seeds', () => {
    const a = generateForestLayers(width, height, 42);
    const b = generateForestLayers(width, height, 43);
    expect(a).not.toEqual(b);
  });
});
