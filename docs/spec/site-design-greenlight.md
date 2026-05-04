# ccisne.dev — Site Design Specification: The Green Light

## Vision

A single-screen animated scene inspired by the green light at the end of Daisy's dock in *The Great Gatsby*. The viewer advances perpetually toward a distant green light across dark water — but never arrives. No text. No name. No explanation. Only the light, the water, and a row of project links at the bottom. A short melody plays once on first interaction.

---

## Committee

| Role | Responsibility |
|------|----------------|
| **Cinematographer** | Scene composition: horizon line, depth perspective, light placement |
| **Lighting designer** | Green light behavior: pulse, bloom, haze interaction |
| **Water FX artist** | Dark water surface: ripples, reflection, parallax movement |
| **Sound designer** | One-shot melody integration, autoplay UX, fade-in |
| **Animation engineer** | Canvas 2D rendering: forward movement illusion, performance |
| **Front-end architect** | Layer stacking, audio API, responsive, deployment |

---

## Scene composition

The viewport is a single continuous canvas painting. The viewer looks across a body of dark water toward a distant shore. A single green light pulses on the far dock.

```
┌──────────────────────────────────────┐
│            dark overcast sky         │  ~30% height
│──────────────────────────────────────│
│         distant dark shore           │  ~5% height (thin line)
│              ● green light           │  centered horizontally, at horizon
│──────────────────────────────────────│
│                                      │
│          dark water surface          │  ~65% height
│       green reflection column        │
│                                      │
├──────────────────────────────────────┤
│  [ inquiry ]  [ macss ]              │  frosted glass bar
└──────────────────────────────────────┘
```

---

## Layers

### Layer 1 — Sky (painted on canvas)

**Composition**: Dark overcast sky. No stars. No moon. Flat, heavy, slightly blue-black.

**Palette**:

| Token | Hex | Use |
|-------|-----|-----|
| `--sky-top` | `#0a0c10` | Top of sky — near black |
| `--sky-horizon` | `#151a22` | Where sky meets shore — slightly lighter |
| `--haze` | `rgba(30, 50, 40, 0.15)` | Light atmospheric haze near horizon |

**Rendering**: Vertical gradient on canvas, painted once (static).

---

### Layer 2 — Distant shore (painted on canvas)

**Composition**: A thin, dark silhouette strip at the horizon line (~30% from top). Irregular edge — subtle treeline or roofline shapes. Not detailed.

**Color**: `#0d0f12` — barely distinguishable from the water, just enough to anchor the horizon.

**Width**: Full viewport width. Height: 8-15px (scaled).

---

### Layer 3 — The Green Light (animated on canvas)

**Position**: Centered horizontally, on the horizon line.

**Base appearance**:
- Core: solid circle, radius ~3px, color `#39ff85` (vivid green)
- Inner glow: radial gradient from `#39ff85` at center to transparent, radius ~15px
- Outer bloom: radial gradient from `rgba(57, 255, 133, 0.08)` to transparent, radius ~80px
- Haze interaction: a faint horizontal smear (`rgba(57, 255, 133, 0.03)`) across 30% of viewport width at the horizon, simulating atmospheric scatter

**Animation — Pulse** (breathing):
- Cycle: 4-6 seconds per breath
- Core radius: oscillates 2.5px ↔ 3.5px
- Inner glow radius: oscillates 12px ↔ 20px
- Outer bloom opacity: oscillates 0.05 ↔ 0.12
- Easing: `sin(t)` — smooth, organic

**Animation — Forward movement illusion**:
- Speed: very slow, barely perceptible
- The light does NOT grow larger — the forward movement is suggested by:
  - Subtle parallax shift of the haze layer (moves slightly toward camera)
  - Water reflection column slowly widening by ~1px over 30 seconds, then resetting imperceptibly
  - Slight vignette darkening at edges over time, resetting cyclically
- The light stays exactly the same size and position forever. The movement is an illusion created by the environment. You advance, but you never arrive.

---

### Layer 4 — Water surface (animated on canvas)

**Composition**: Dark water filling the lower ~65% of the viewport. Not flat — animated with subtle horizontal ripples.

**Base color**: `#0b0e14` (deep dark blue-black)

**Ripples**:
- Implementation: horizontal sine waves with slight vertical displacement
- 3-4 overlapping wave layers at different frequencies and amplitudes
- Amplitude: 0.5-1.5px vertical displacement
- Color variation: alternate between `#0b0e14` and `#0f1319` (barely visible)
- Speed: very slow horizontal drift (2-4px/s)

**Green reflection**:
- Vertical column below the green light, extending downward from horizon to ~70% of water height
- Color: `rgba(57, 255, 133, 0.06)` at top, fading to transparent at bottom
- Width: 2-4px at top, spreading to 20-30px at bottom (inverted triangle)
- Animation: wobbles horizontally with the ripple wave, breaks into segments at the lower portion
- Pulse synced with the light's breathing cycle (same `sin(t)`)

**Light haze on water**:
- Very subtle green tint across the water surface near the horizon
- `rgba(57, 255, 133, 0.02)` — almost invisible, creates atmospheric depth

---

### Layer 5 — Project bar (HTML + CSS, over canvas)

**Position**: Fixed at bottom of viewport. Full width.

**Background**: Frosted glass — `backdrop-filter: blur(12px); background: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(255, 255, 255, 0.08);`

Note: darker glass than the cherry blossom variant — matches the night scene.

**Buttons**:

| Label | URL | Status |
|-------|-----|--------|
| inquiry | https://inquiry.ccisne.dev | Active |
| macss | https://macss.ccisne.dev | Active |

**Button style**:
- Font: system sans-serif, weight 300, `0.85rem`, letter-spacing `0.05em`
- Color: `rgba(255, 255, 255, 0.6)`
- Background: `rgba(255, 255, 255, 0.06)`
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Border-radius: `6px`
- Padding: `0.4rem 1.2rem`
- Hover: `color: rgba(57, 255, 133, 0.8); border-color: rgba(57, 255, 133, 0.3);` — the green light color bleeds into the interaction
- Transition: `all 0.3s ease`
- Gap: `1rem`

**Bar padding**: `0.75rem 0`

---

## Sound

**File**: User-provided MP3 (short melody).

**Behavior**:
- Modern browsers block autoplay audio. The sound plays on the **first user interaction** with the page (click, tap, or keypress anywhere).
- `AudioContext` created on first interaction, plays the MP3 once.
- Fade-in: audio volume ramps from 0 to 1 over 2 seconds.
- No loop. No replay button. One time only per visit.
- If the user never interacts, the scene works in silence.

**Implementation**:
```javascript
let played = false;
document.addEventListener('click', () => {
  if (played) return;
  played = true;
  const audio = new Audio('audio/melody.mp3');
  audio.volume = 0;
  audio.play();
  // fade in over 2s
}, { once: true });
```

**File location**: `audio/melody.mp3`

---

## File structure

```
ccisnedev.github.io/
├── index.html          → canvas + project bar
├── css/
│   └── style.css       → bar styles, layout, responsive
├── js/
│   └── greenlight.js   → canvas rendering engine (sky, water, light, ripples)
├── audio/
│   └── melody.mp3      → one-shot sound (user-provided)
├── CNAME               → ccisne.dev
└── .github/
    └── workflows/
        └── pages.yml   → deploy on push to main
```

---

## Responsive behavior

| Breakpoint | Changes |
|------------|---------|
| > 1200px | Full scene, all animations at full fidelity |
| 768-1200px | Reduce ripple layers to 2, bloom radius reduced 20% |
| ≤ 768px | Ripple layers reduced to 2, bloom simplified, canvas render at 0.75x resolution for performance |

The scene works at any aspect ratio. The horizon line stays at ~30% from top. The green light stays centered.

---

## Accessibility

- `<canvas>` has `aria-hidden="true"` and `role="presentation"`
- An invisible `<p>` with `sr-only` class contains: "A green light pulses across dark water."
- `prefers-reduced-motion: reduce` → light pulses but water ripples stop, no parallax movement
- All buttons have visible focus indicators (`outline: 1px solid rgba(57, 255, 133, 0.5)`)
- Audio plays only on explicit user interaction (no autoplay)

---

## Performance

- Canvas 2D only — no WebGL, no Three.js
- Single `requestAnimationFrame` loop
- Target: 60fps on mid-range devices
- Ripples drawn as horizontal lines, not per-pixel water simulation
- Total page weight target: < 50KB (HTML + CSS + JS) + MP3 size
- No external dependencies (no Google Fonts — system sans-serif)

---

## Open decisions

1. **MP3 file**: user will provide. Need to determine duration and whether it needs trimming.
2. **Dock silhouette**: should there be a faint wooden dock in the foreground (bottom edge of canvas), or is the scene purely from the water's perspective?
3. **Favicon**: the green light as favicon — a small green dot on dark background?
