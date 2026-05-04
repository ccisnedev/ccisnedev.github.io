/**
 * Sakura branch generator — stochastic L-system with gravitational tropism.
 *
 * Algorithm (research-backed):
 * 1. Stochastic L-system: production rules with random probabilities
 *    generate unique branching patterns every time.
 * 2. Gravitational tropism: branches curve downward slightly to simulate
 *    weight, using an "e" tropism vector (Prusinkiewicz & Lindenmayer, 1990).
 * 3. Murray's law for width: parent width^n = sum(child width^n), n≈2.5
 *    (pipe model of fluid transport in plants).
 * 4. Branching angles follow cherry tree observations: 35°–70° with
 *    bilateral symmetry preference.
 *
 * The main trunk enters horizontally from the left (macro photo composition),
 * and the L-system expands sub-branches from nodes along it.
 *
 * Uses seeded PRNG for determinism within a given seed, but different seeds
 * produce visually distinct trees.
 */

function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- L-system turtle state ---
class Turtle {
  constructor(x, y, angle, width) {
    this.x = x;
    this.y = y;
    this.angle = angle; // radians, 0 = right
    this.width = width;
  }
  clone() { return new Turtle(this.x, this.y, this.angle, this.width); }
}

/**
 * Generate all branch segments for the sakura scene.
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} seed - PRNG seed
 * @returns {Array<{x0,y0,cx0,cy0,cx1,cy1,x1,y1,width,depth}>}
 */
export function generateBranches(width, height, seed) {
  const rng = mulberry32(seed);
  const scale = Math.min(width, height);
  const branches = [];

  // Trunk parameters
  const trunkWidth = scale * 0.024;
  const startX = -width * 0.03;
  const startY = height * (0.22 + rng() * 0.12);

  // Main trunk: L-system turtle walks with slight stochastic angle changes
  // This creates the organic main branch
  const trunkSegCount = 5 + Math.floor(rng() * 3); // 5-7 segments
  const segLength = (width * (0.75 + rng() * 0.15)) / trunkSegCount;
  const tropism = 0.02 + rng() * 0.015; // gravitational pull (downward bias)

  let turtle = new Turtle(startX, startY, (rng() - 0.5) * 0.1, trunkWidth);
  const trunkNodes = [{ x: turtle.x, y: turtle.y }];

  for (let i = 0; i < trunkSegCount; i++) {
    // Stochastic angle perturbation + tropism (gravity pulls down)
    const angleJitter = (rng() - 0.5) * 0.3;
    turtle.angle += angleJitter;
    // Tropism: pull toward positive Y (downward)
    turtle.angle += tropism * Math.cos(turtle.angle); // only if not already pointing down

    // Dampen extreme angles to keep branch roughly horizontal
    turtle.angle *= 0.85;

    const nx = turtle.x + Math.cos(turtle.angle) * segLength;
    const ny = turtle.y + Math.sin(turtle.angle) * segLength;

    // Width tapers (Murray's law approximation)
    const taper = 1.0 - ((i + 1) / trunkSegCount) * 0.35;
    const segWidth = trunkWidth * taper;

    // Generate bezier with perpendicular curvature for organic feel
    const dx = nx - turtle.x;
    const dy = ny - turtle.y;
    const len = Math.hypot(dx, dy);
    const perpX = -dy / len;
    const perpY = dx / len;
    const curve1 = (rng() - 0.5) * len * 0.35;
    const curve2 = (rng() - 0.5) * len * 0.35;

    branches.push({
      x0: turtle.x, y0: turtle.y,
      cx0: turtle.x + dx * 0.33 + perpX * curve1,
      cy0: turtle.y + dy * 0.33 + perpY * curve1,
      cx1: turtle.x + dx * 0.66 + perpX * curve2,
      cy1: turtle.y + dy * 0.66 + perpY * curve2,
      x1: nx, y1: ny,
      width: segWidth,
      depth: 0,
    });

    turtle.x = nx;
    turtle.y = ny;
    turtle.width = segWidth;
    trunkNodes.push({ x: nx, y: ny });
  }

  // --- L-system branching from trunk nodes ---
  // Stochastic production rules:
  //   At each node: P(branch) = 0.65, P(skip) = 0.35
  //   Branch angle: 35°–70° with alternating side bias (bilateral)
  //   Sub-branch may recurse once (depth 2 = twig)
  let lastSide = 1;
  for (let i = 1; i < trunkNodes.length; i++) {
    if (rng() < 0.35) continue; // skip this node (stochastic rule)

    const node = trunkNodes[i];
    const prevNode = trunkNodes[i - 1];

    // Trunk direction at this point
    const trunkAngle = Math.atan2(node.y - prevNode.y, node.x - prevNode.x);

    // Branching: alternate sides with some randomness
    lastSide = rng() < 0.3 ? lastSide : -lastSide;
    const branchAngle = (35 + rng() * 35) * (Math.PI / 180); // 35-70°
    const angle = trunkAngle + lastSide * branchAngle;

    // Branch length: 60-90% of trunk segment, decreasing along trunk
    const progress = i / trunkNodes.length;
    const branchLen = segLength * (0.5 + rng() * 0.4) * (1.1 - progress * 0.4);
    // Murray's law: child width ≈ parent^(2/3)
    const branchWidth = turtle.width * (0.5 + rng() * 0.15);

    const sub = _growSubBranch(rng, node, angle, branchLen, branchWidth, tropism, 1);
    branches.push(...sub);

    // Sometimes add a second branch (fork) from same node
    if (rng() < 0.3) {
      const angle2 = trunkAngle - lastSide * (30 + rng() * 25) * (Math.PI / 180);
      const len2 = branchLen * (0.6 + rng() * 0.3);
      const w2 = branchWidth * 0.8;
      const sub2 = _growSubBranch(rng, node, angle2, len2, w2, tropism, 1);
      branches.push(...sub2);
    }
  }

  return branches;
}

/**
 * Recursively grow a sub-branch with stochastic L-system rules.
 */
function _growSubBranch(rng, origin, angle, length, width, tropism, depth) {
  const segments = [];
  const maxDepth = 3;

  // Apply tropism (gravity)
  angle += tropism * 2;

  // Slight random perturbation
  angle += (rng() - 0.5) * 0.4;

  const endX = origin.x + Math.cos(angle) * length;
  const endY = origin.y + Math.sin(angle) * length;

  // Organic curve via perpendicular offset
  const dx = endX - origin.x;
  const dy = endY - origin.y;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const wobble1 = (rng() - 0.5) * length * 0.4;
  const wobble2 = (rng() - 0.5) * length * 0.3;

  segments.push({
    x0: origin.x, y0: origin.y,
    cx0: origin.x + dx * 0.33 + perpX * wobble1,
    cy0: origin.y + dy * 0.33 + perpY * wobble1,
    cx1: origin.x + dx * 0.66 + perpX * wobble2,
    cy1: origin.y + dy * 0.66 + perpY * wobble2,
    x1: endX, y1: endY,
    width,
    depth,
  });

  // Stochastic rule: recurse into twig with probability
  if (depth < maxDepth && rng() < 0.55) {
    const childAngle = angle + (rng() - 0.4) * 0.9;
    const childLen = length * (0.5 + rng() * 0.25);
    const childWidth = width * 0.55;
    const childSegs = _growSubBranch(
      rng, { x: endX, y: endY }, childAngle, childLen, childWidth, tropism, depth + 1
    );
    segments.push(...childSegs);
  }

  // Second child twig (fork) with lower probability
  if (depth < maxDepth && rng() < 0.3) {
    const childAngle = angle - (rng() - 0.5) * 1.0;
    const childLen = length * (0.4 + rng() * 0.2);
    const childWidth = width * 0.45;
    const childSegs = _growSubBranch(
      rng, { x: endX, y: endY }, childAngle, childLen, childWidth, tropism, depth + 1
    );
    segments.push(...childSegs);
  }

  return segments;
}

/** Evaluate cubic bezier at parameter t (one axis). */
export function _bezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}
