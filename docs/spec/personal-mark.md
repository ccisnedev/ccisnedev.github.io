# ccisne.dev — Personal Mark: Ensō

## Concept

A pure **ensō** (円相) — a hand-drawn circle, white ink on black ground.

The circle is never closed. The gap represents wabi-sabi: the beauty of imperfection, the incompleteness that makes things alive. It is the cherry blossom falling, the green light across the water — always almost, never quite.

---

## Construction

A single `<path>` of cubic Bézier curves forming an imperfect circle with a gap at the top-left. The stroke is thick (`5px`), round-capped, and slightly asymmetric — as if drawn in one breath with a loaded brush.

### SVG geometry

- **Viewbox**: `0 0 64 64`
- **Background**: `#0a0a0a` (near-black), `rx="8"`
- **Stroke**: `#f0f0f0` (off-white), `stroke-width: 5`, `stroke-linecap: round`
- **Path**: starts at ~10 o'clock, sweeps clockwise through 12, 3, 6, 9, ends near the start but does not close — leaving a gap

### Why imperfect

The Bézier control points are not mathematically symmetric. The circle is slightly wider on the right, slightly compressed at the top. This asymmetry is intentional — a perfect circle is a geometric figure, not a brushstroke.

---

## Color variants

| Context | Foreground | Background |
|---------|-----------|------------|
| **Primary** (dark) | `#f0f0f0` | `#0a0a0a` |
| **Inverted** (light) | `#1a1a1a` | `#ffffff` |
| **Transparent** | `#f0f0f0` | transparent |

---

## Usage

| Context | Size | Notes |
|---------|------|-------|
| Favicon | 16–32px | SVG scales natively |
| Site mark | 48–64px | Optional: near theme switcher |
| Social/OG | 512px | Export PNG if needed |

---

## What the mark is NOT

- Not a logo for any project
- Not explained on the site — the visitor sees a shape
- Not the shiratori (swan) — the swan lives in the themes, in the pen name, in the poetry. The mark is simpler: just truth, drawn in one stroke.
