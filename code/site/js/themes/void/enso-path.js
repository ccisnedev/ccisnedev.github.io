/**
 * Generates the ensō Bézier path geometry.
 * Pure function — no side effects, no DOM.
 *
 * @param {number} width  - Canvas width
 * @param {number} height - Canvas height
 * @returns {{ start: {x,y}, curves: Array, cx: number, cy: number, r: number, clockwise: boolean }}
 */
export function generateEnso(width, height) {
  // Center of canvas, slightly above geometric center (ma)
  const cx = width / 2;
  const cy = height * 0.46;
  const r = Math.min(width, height) * 0.18;

  // Small jitter for imperfection (hand-drawn feel)
  const jitter = () => (Math.random() - 0.5) * r * 0.06;

  // Direction: 90% clockwise, 10% counter-clockwise
  const clockwise = Math.random() < 0.9;

  // Start at ~9 o'clock (π radians) with slight angular variation (±15°)
  const angleVariation = (Math.random() - 0.5) * (Math.PI / 6); // ±15°
  const startAngle = Math.PI + angleVariation; // ~9 o'clock

  // Standard 4-segment Bézier circle approximation
  // Magic number: (4/3)*tan(π/8) ≈ 0.5522847498
  const k = 0.5522847498 * r;

  // Direction multiplier: +1 for CW, -1 for CCW
  const dir = clockwise ? 1 : -1;

  // Generate 4 points around the circle from the start angle
  // Each segment covers ~90°. We draw ~93% (gap near the end).
  const segmentAngle = (Math.PI / 2) * dir;

  // The 5 anchor points on the circle (start + 4 segment endpoints)
  const anchors = [];
  for (let i = 0; i <= 4; i++) {
    const angle = startAngle + i * segmentAngle;
    anchors.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }

  // Apply jitter to anchors (once, so cp1 of each segment matches its start)
  for (let i = 0; i < anchors.length; i++) {
    anchors[i].x += jitter();
    anchors[i].y += jitter();
  }

  // Build cubic Bézier segments between consecutive anchors
  const segments = [];
  for (let i = 0; i < 4; i++) {
    const a0 = anchors[i];
    const angle0 = startAngle + i * segmentAngle;
    const angle1 = startAngle + (i + 1) * segmentAngle;

    // Tangent direction at each point (perpendicular to radius)
    const tan0 = angle0 + (Math.PI / 2) * dir;

    // End point: last segment stops at ~92% of arc (small gap)
    let endAngle, endX, endY;
    if (i === 3) {
      endAngle = angle0 + segmentAngle * 0.92;
      endX = cx + Math.cos(endAngle) * r + jitter();
      endY = cy + Math.sin(endAngle) * r + jitter();
    } else {
      endAngle = angle1;
      endX = anchors[i + 1].x;
      endY = anchors[i + 1].y;
    }

    // Control points: cp1 relative to the actual start of this segment
    const cp1x = a0.x + Math.cos(tan0) * k + jitter();
    const cp1y = a0.y + Math.sin(tan0) * k + jitter();

    // cp2 relative to the actual end point
    const tanEnd = (i === 3 ? endAngle : angle1) + (Math.PI / 2) * dir;
    const cp2x = endX - Math.cos(tanEnd) * k * (i === 3 ? 0.85 : 1) + jitter();
    const cp2y = endY - Math.sin(tanEnd) * k * (i === 3 ? 0.85 : 1) + jitter();

    segments.push({ cp1x, cp1y, cp2x, cp2y, x: endX, y: endY });
  }

  // Start point IS anchors[0] (same point — no mismatch)
  const start = anchors[0];

  return { start, curves: segments, cx, cy, r, clockwise };
}

/**
 * Estimates the total path length (upper bound).
 * Must be >= actual path to prevent dash pattern repetition.
 *
 * @param {{ r: number }} ensoPath
 * @returns {number}
 */
export function estimateLength(ensoPath) {
  if (!ensoPath) return 1000;
  return 2 * Math.PI * ensoPath.r;
}
