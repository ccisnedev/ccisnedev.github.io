# Changelog
All notable changes to this project will be documented in this file.

The format loosely follows [Keep a Changelog](https://keepachangelog.com/)
and the project adheres to [Semantic Versioning](https://semver.org/).

## [0.0.3] — 2026-05-04

### Added
- CHANGELOG tracking for the site.

### Fixed
- Greenlight audio plays once on entry instead of looping.

## [0.0.2] — 2026-05-03

### Added
- **Sakura theme**: L-system branch generator, botanical spur-node blossom placement (2-5 per cluster), forest bokeh backdrop, falling petals with sakura notch shape. Flowers appear one-by-one; petals fall only after all blossoms are visible. Random seed per load.
- **Greenlight theme**: Gatsby's dock scene with pulsing green light, water ripples, reflection column, ambient audio on entry.
- **Void theme**: Modular zen-brush ink rendering with enso path, particle cloud, fiber ink, kasure, nijimi, paper texture.
- Multi-theme engine with selector nav (void / sakura / greenlight).
- GitHub Actions Pages deployment workflow (`code/site/` as artifact).
- Unit tests (252 passing across 27 files).

### Removed
- Legacy cherryblossom theme (replaced by sakura).
- Root site files (moved into `code/site/`).
- `node_modules/` from git tracking (60 MB, not needed for static deploy).

## [0.0.1] — 2023-03-15

### Added
- Initial placeholder page for ccisne.dev.