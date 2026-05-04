# ccisne.dev — Multi-Theme Architecture

## Concept

The site is a personal gallery of digital art pieces. Each theme is a complete standalone scene that fills the viewport. The visitor can switch between themes. All themes share the same project bar at the bottom and the same personal mark (favicon/logo).

Themes are not skins — they are distinct artistic works with their own palette, animation engine, and mood. The only shared elements are:

1. **The project bar** (Layer N — always the bottom bar with frosted glass buttons)
2. **The personal mark** (favicon, consistent across all themes)
3. **The theme switcher** (UI element to change theme)

---

## Theme registry

| ID | Name | Status | Spec |
|----|------|--------|------|
| `cherryblossom` | Cherry Blossom | Specified | [site-design-cherryblosom.md](site-design-cherryblosom.md) |
| `greenlight` | The Green Light | Specified | [site-design-greenlight.md](site-design-greenlight.md) |

New themes are added by creating a spec document and registering here.

---

## Architecture

### File structure

```
ccisnedev.github.io/
├── index.html              → shell: loads theme engine + project bar
├── css/
│   ├── common.css          → project bar, theme switcher, shared resets
│   └── themes/
│       ├── cherryblossom.css  → theme-specific overrides (text color, bar tint)
│       └── greenlight.css     → theme-specific overrides
├── js/
│   ├── main.js             → theme loader, switcher logic, audio manager
│   └── themes/
│       ├── cherryblossom.js   → canvas/animation engine for cherry blossom
│       └── greenlight.js      → canvas/animation engine for green light
├── audio/
│   └── melody.mp3          → green light one-shot sound
├── img/
│   ├── favicon.svg         → personal mark (shared)
│   └── branch.svg          → cherry blossom branch artwork
├── CNAME                   → ccisne.dev
├── docs/
│   └── spec/               → design specifications
└── .github/
    └── workflows/
        └── pages.yml       → deploy on push to main
```

### Theme interface

Each theme JS module exports the same interface:

```javascript
export default {
  id: 'greenlight',
  init(canvas, ctx) { /* set up scene */ },
  resize(width, height) { /* handle viewport change */ },
  frame(timestamp) { /* requestAnimationFrame tick — return true to continue */ },
  destroy() { /* clean up */ },
  reducedMotion() { /* static fallback */ },
};
```

### Theme switching

- **Persistence**: selected theme stored in `localStorage('ccisne-theme')`
- **Default**: first visit loads a random theme (or the most recent one added)
- **Switcher UI**: a small, unobtrusive control in the bottom-right corner of the project bar — a dot or icon that opens a minimal theme selector
- **Transition**: when switching, the current canvas fades to black over 0.5s, the new theme initializes, then fades in over 0.5s

### Shared project bar

The bar structure is identical across themes. Each theme can provide CSS overrides for:
- Bar background tint and opacity
- Button hover color (green for greenlight, pink for cherryblossom)
- Border color

These are set via CSS custom properties on `<body>`:

```css
/* greenlight theme */
body[data-theme="greenlight"] {
  --bar-bg: rgba(0, 0, 0, 0.3);
  --bar-border: rgba(255, 255, 255, 0.08);
  --bar-hover: rgba(57, 255, 133, 0.8);
  --bar-hover-border: rgba(57, 255, 133, 0.3);
}

/* cherryblossom theme */
body[data-theme="cherryblossom"] {
  --bar-bg: rgba(255, 255, 255, 0.15);
  --bar-border: rgba(255, 255, 255, 0.25);
  --bar-hover: #e8a0b0;
  --bar-hover-border: rgba(232, 160, 176, 0.4);
}
```

---

## Principles

1. **Each theme is a complete artwork** — not a color swap. Different engines, different moods.
2. **No shared canvas logic** — each theme owns its full rendering pipeline.
3. **The bar and the mark are the constants** — they are the identity of the author, not of the art.
4. **Performance budget per theme** — each must hit 60fps independently. No theme loads another theme's assets.
5. **Additive only** — adding a new theme never modifies existing themes.

---

## Open decisions

1. **Theme switcher UI**: dot grid? small icon? keyboard shortcut only? Must not compete with the art.
2. **Default theme on first visit**: random, or always the newest?
3. **Theme preview in switcher**: show a thumbnail, or just a name/color dot?
