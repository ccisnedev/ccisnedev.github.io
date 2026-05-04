/**
 * Paper Texture — generates a subtle grain pattern as an alpha mask.
 *
 * Applied multiplicatively on the stroke to simulate ink absorption
 * irregularity on textured paper (washi / rice paper effect).
 */

/**
 * Simple seeded PRNG (mulberry32).
 */
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a paper texture as an ImageData-compatible object.
 * RGB is always 0 (black); alpha varies to simulate grain.
 *
 * @param {number} width
 * @param {number} height
 * @param {{ seed?: number, grainMax?: number }} [opts]
 * @returns {{ width: number, height: number, data: Uint8ClampedArray }}
 */
export function createPaperTexture(width, height, opts = {}) {
  const { seed = 1, grainMax = 255 } = opts;
  const rng = mulberry32(seed);
  const data = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    // RGB = 0 (black mask)
    data[idx] = 0;
    data[idx + 1] = 0;
    data[idx + 2] = 0;
    // Alpha = random grain
    data[idx + 3] = Math.floor(rng() * (grainMax + 1));
  }

  return { width, height, data };
}
