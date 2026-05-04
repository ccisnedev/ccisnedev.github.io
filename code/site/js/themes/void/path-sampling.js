/**
 * Samples a cubic Bézier ensō path into equidistant points with tangent and normal.
 */

/**
 * Evaluate a cubic Bézier at parameter u ∈ [0,1].
 * @param {{x:number,y:number}} p0
 * @param {{x:number,y:number}} p1
 * @param {{x:number,y:number}} p2
 * @param {{x:number,y:number}} p3
 * @param {number} u
 * @returns {{x:number, y:number}}
 */
function bezierPoint(p0, p1, p2, p3, u) {
  const inv = 1 - u;
  const inv2 = inv * inv;
  const inv3 = inv2 * inv;
  const u2 = u * u;
  const u3 = u2 * u;
  return {
    x: inv3 * p0.x + 3 * inv2 * u * p1.x + 3 * inv * u2 * p2.x + u3 * p3.x,
    y: inv3 * p0.y + 3 * inv2 * u * p1.y + 3 * inv * u2 * p2.y + u3 * p3.y,
  };
}

/**
 * Evaluate the derivative of a cubic Bézier at parameter u.
 * @returns {{x:number, y:number}}
 */
function bezierDerivative(p0, p1, p2, p3, u) {
  const inv = 1 - u;
  const inv2 = inv * inv;
  const u2 = u * u;
  return {
    x: 3 * inv2 * (p1.x - p0.x) + 6 * inv * u * (p2.x - p1.x) + 3 * u2 * (p3.x - p2.x),
    y: 3 * inv2 * (p1.y - p0.y) + 6 * inv * u * (p2.y - p1.y) + 3 * u2 * (p3.y - p2.y),
  };
}

/**
 * Approximate arc length of a single cubic Bézier using subdivision.
 */
function segmentArcLength(p0, p1, p2, p3, steps = 32) {
  let length = 0;
  let prev = p0;
  for (let i = 1; i <= steps; i++) {
    const u = i / steps;
    const pt = bezierPoint(p0, p1, p2, p3, u);
    length += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    prev = pt;
  }
  return length;
}

/**
 * Build a lookup table mapping arc-length fraction → (segmentIndex, u).
 */
function buildArcLengthTable(ensoPath, resolution = 256) {
  const { start, curves } = ensoPath;
  const table = []; // { dist, segIdx, u }
  let totalLength = 0;
  let prevPt = start;

  for (let seg = 0; seg < curves.length; seg++) {
    const c = curves[seg];
    const p0 = seg === 0 ? start : { x: curves[seg - 1].x, y: curves[seg - 1].y };
    const p1 = { x: c.cp1x, y: c.cp1y };
    const p2 = { x: c.cp2x, y: c.cp2y };
    const p3 = { x: c.x, y: c.y };

    const stepsPerSeg = Math.ceil(resolution / curves.length);
    for (let i = 1; i <= stepsPerSeg; i++) {
      const u = i / stepsPerSeg;
      const pt = bezierPoint(p0, p1, p2, p3, u);
      totalLength += Math.hypot(pt.x - prevPt.x, pt.y - prevPt.y);
      table.push({ dist: totalLength, segIdx: seg, u });
      prevPt = pt;
    }
  }

  return { table, totalLength };
}

/**
 * Sample the ensō path into N equidistant points.
 *
 * @param {{ start: {x,y}, curves: Array, r: number }} ensoPath
 * @param {number} numSamples
 * @returns {Array<{ x: number, y: number, t: number, angle: number, nx: number, ny: number }>}
 */
export function samplePath(ensoPath, numSamples) {
  const { table, totalLength } = buildArcLengthTable(ensoPath, Math.max(256, numSamples * 4));
  const { start, curves } = ensoPath;

  const samples = [];

  for (let i = 0; i < numSamples; i++) {
    const targetDist = (i / (numSamples - 1)) * totalLength;

    // First sample is exactly the start point
    if (i === 0) {
      const c = curves[0];
      const p0 = start;
      const p1 = { x: c.cp1x, y: c.cp1y };
      const p2 = { x: c.cp2x, y: c.cp2y };
      const p3 = { x: c.x, y: c.y };
      const deriv = bezierDerivative(p0, p1, p2, p3, 0);
      const angle = Math.atan2(deriv.y, deriv.x);
      const dLen = Math.hypot(deriv.x, deriv.y) || 1;
      samples.push({
        x: start.x,
        y: start.y,
        t: 0,
        angle,
        nx: -deriv.y / dLen,
        ny: deriv.x / dLen,
      });
      continue;
    }

    // Binary search in table for the closest entry
    let lo = 0, hi = table.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (table[mid].dist < targetDist) lo = mid + 1;
      else hi = mid;
    }

    // Interpolate between table[lo-1] and table[lo]
    const entry = table[lo];
    const segIdx = entry.segIdx;
    const c = curves[segIdx];
    const p0 = segIdx === 0 ? start : { x: curves[segIdx - 1].x, y: curves[segIdx - 1].y };
    const p1 = { x: c.cp1x, y: c.cp1y };
    const p2 = { x: c.cp2x, y: c.cp2y };
    const p3 = { x: c.x, y: c.y };

    // Refine u via linear interpolation between adjacent table entries
    let u = entry.u;
    if (lo > 0 && table[lo].dist !== table[lo - 1].dist) {
      const prevEntry = table[lo - 1];
      if (prevEntry.segIdx === segIdx) {
        const frac = (targetDist - prevEntry.dist) / (entry.dist - prevEntry.dist);
        u = prevEntry.u + frac * (entry.u - prevEntry.u);
      }
    }

    const pt = bezierPoint(p0, p1, p2, p3, u);
    const deriv = bezierDerivative(p0, p1, p2, p3, u);

    // Tangent angle
    const angle = Math.atan2(deriv.y, deriv.x);

    // Normal (perpendicular to tangent, rotated 90° CCW)
    const dLen = Math.hypot(deriv.x, deriv.y) || 1;
    const nx = -deriv.y / dLen;
    const ny = deriv.x / dLen;

    samples.push({
      x: pt.x,
      y: pt.y,
      t: i / (numSamples - 1),
      angle,
      nx,
      ny,
    });
  }

  return samples;
}
