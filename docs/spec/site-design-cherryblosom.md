# ccisne.dev — Site Design Specification

## Vision

A single-screen animated scene: a cherry blossom morning rendered in four visual layers. No navigation, no scroll, no biography. One text. One signature. One row of project links. The site is a mood — contemplative, precise, unhurried.

---

## Committee

| Role | Responsibility |
|------|----------------|
| **Hanami artist** (花見) | Visual composition: branch shape, petal color, negative space |
| **Sumi-e advisor** (墨絵) | Ink-wash aesthetic for the SVG branch — abstract, not illustrative |
| **Animation engineer** | Canvas physics: petal fall, wind vectors, rotation, parallax depth |
| **Typography director** | Serif selection, vertical rhythm, text placement within the branch layer |
| **Front-end architect** | Layer stacking, performance budget, responsive breakpoints |

---

## Layers

### Layer 1 — Background (static)

**Content**: CSS gradient sky — cool dawn palette. No photograph.

**Palette** (Cool — dawn/spring morning):

| Token | Hex | Use |
|-------|-----|-----|
| `--sky-top` | `#c9d6e3` | Top of viewport — pale gray-blue, pre-dawn sky |
| `--sky-mid` | `#dce4ef` | Mid gradient — soft blue-white |
| `--sky-bottom` | `#f0e6ef` | Horizon — faint warm pink bleeding into blue |
| `--mist` | `rgba(220, 228, 239, 0.4)` | Fog layer overlay for depth |

**Implementation**: `linear-gradient(to bottom, var(--sky-top), var(--sky-mid) 50%, var(--sky-bottom))` on `body`. A second `::after` pseudo-element adds a subtle radial mist in the lower third.

**Constraint**: No images. Pure CSS. Must render instantly (no loading state).

---

### Layer 2 — Branch + Text (static, SVG + HTML)

**Content**: A cherry tree branch extending from the upper-left corner toward the center. Drawn with SVG `<path>` elements — abstract, minimal, ink-wash style. Not photorealistic. Inspired by sumi-e brushwork: one main branch, 2-3 secondary branches, tapering thickness.

**Branch style**:
- Stroke color: `#3a2a1a` (warm dark brown, like diluted sumi ink)
- Stroke width: tapers from 8px (trunk) to 2px (tips)
- A few small cherry blossom clusters on the branch tips — 3-5 petal SVG shapes in `#f2c4cc` (pale pink) and `#e8a0b0` (deeper pink)
- Total SVG viewbox: spans roughly 60% of viewport width, 40% height
- Position: `position: absolute; top: 0; left: 0;`

**Text** (positioned at vertical center, slightly right of center):

```
Haiku clarity, katana precision —
code that reveals its purpose.
```

- Font: **Cormorant Garamond** (Google Fonts), weight 300 (Light) or 400
- Size: `clamp(1.1rem, 2.5vw, 1.6rem)` — responsive
- Color: `#2a2a2a` (near-black, reads against the pale sky)
- Line height: 1.8
- Max width: `32ch` — forces the line break after the em dash
- Text-align: left

**Signature** (below text, subtle):

```
ccisnedev
```

- Font: Cormorant Garamond, weight 300, italic
- Size: `0.85rem`
- Color: `#6a6a6a` (muted gray)
- Margin-top: `1.5rem`

---

### Layer 3 — Falling petals (animated, Canvas)

**Technology**: HTML `<canvas>` covering the full viewport, `pointer-events: none`.

**Petal count**:
- Desktop (>768px): 25-30 petals
- Mobile (≤768px): 10-12 petals

**Petal properties** (per petal, randomized within ranges):

| Property | Range | Notes |
|----------|-------|-------|
| Shape | Ellipse, ~8×5px | Slight asymmetry for natural feel |
| Color | `#f2c4cc` to `#e8a0b0` | Random from 3-4 pink tones, 10-30% opacity variance |
| Size | 0.6x to 1.2x base | Simulates depth |
| Fall speed | 20-50 px/s | Larger = closer = slightly faster |
| Horizontal drift | sinusoidal, amplitude 30-80px | Simulates wind |
| Rotation | 0.5-2 rad/s | On both axes for tumbling effect |
| Wind gust | periodic pulse every 4-8s | Brief acceleration + tighter horizontal drift |
| Depth/opacity | smaller + more transparent = farther | 3 depth tiers |

**Lifecycle**: Petals spawn above viewport at random X positions. When a petal falls below the viewport, it resets to the top with new random properties.

**Performance budget**:
- Target: 60fps on mid-range devices
- `requestAnimationFrame` loop
- No DOM elements per petal — pure canvas draw
- `will-change: auto` on the canvas element
- Respect `prefers-reduced-motion`: if enabled, show 5 static petals frozen mid-fall (no animation)

---

### Layer 4 — Project bar (static, HTML + CSS)

**Position**: Fixed at bottom of viewport. Full width.

**Background**: Frosted glass — `backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.15); border-top: 1px solid rgba(255, 255, 255, 0.25);`

**Content**: Horizontal row of project buttons, centered.

**Buttons**:

| Label | URL | Status |
|-------|-----|--------|
| inquiry | https://inquiry.ccisne.dev | Active |
| macss | https://macss.ccisne.dev | Active |

(New buttons added here as projects are published)

**Button style**:
- Font: Cormorant Garamond, 400, `0.95rem`
- Color: `#2a2a2a`
- Background: `rgba(255, 255, 255, 0.25)`
- Border: `1px solid rgba(255, 255, 255, 0.3)`
- Border-radius: `6px`
- Padding: `0.4rem 1.2rem`
- Hover: `background: rgba(255, 255, 255, 0.45); border-color: rgba(255, 255, 255, 0.5);`
- Transition: `all 0.2s ease`
- Gap between buttons: `1rem`

**Bar padding**: `0.75rem 0`

---

## File structure

```
ccisnedev.github.io/
├── index.html          → single page, all 4 layers
├── css/
│   └── style.css       → gradients, layout, glass bar, text, responsive
├── js/
│   └── petals.js       → canvas animation engine
├── img/
│   └── branch.svg      → sumi-e branch artwork (inline or external)
├── CNAME               → ccisne.dev
└── .github/
    └── workflows/
        └── pages.yml   → deploy on push to main
```

---

## Typography

**Google Fonts load**:
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet">
```

Only Cormorant Garamond. No secondary font. The site has one voice.

---

## Responsive behavior

| Breakpoint | Changes |
|------------|---------|
| > 1200px | Full scene, 25-30 petals, branch at natural scale |
| 768-1200px | Branch scales to 70%, text repositions center, 20 petals |
| ≤ 768px | Branch scales to 50% or hides secondary branches, text centered full-width with padding, 10-12 petals, bar buttons stack if needed |

---

## Accessibility

- `<canvas>` has `aria-hidden="true"` and `role="presentation"`
- Main text is semantic HTML (`<p>` inside `<main>`), not drawn on canvas
- `prefers-reduced-motion: reduce` → petals frozen, no animation loop
- `prefers-color-scheme: dark` → not implemented (the cool palette is already neutral; revisit if needed)
- All links have visible focus indicators
- Contrast ratio: `#2a2a2a` on `#dce4ef` = ~10:1 (AAA)

---

## Performance

- No JavaScript frameworks
- No build step
- Canvas animation is the only JS
- Total page weight target: < 100KB (HTML + CSS + JS + SVG)
- Fonts loaded async with `display=swap`
- No external dependencies beyond Google Fonts

---

## Deployment

GitHub Actions workflow (`pages.yml`):
- Trigger: push to `main`
- Action: `actions/upload-pages-artifact` pointing to repo root
- Custom domain: `ccisne.dev` (CNAME already in place)

---

## Open decisions

1. **Branch SVG**: hand-draw in Figma/Inkscape, or define paths programmatically in the spec? The sumi-e advisor recommends hand-drawing for organic feel.
2. **Favicon**: reuse a petal as favicon, or a different mark?
3. **Signature placement**: below the text (current spec), or bottom-right corner near the bar?
4. **Season variants**: future idea — could the gradient and petal color change by actual date (spring=pink, summer=green, autumn=red, winter=snow)? Not for v1, but worth noting.
