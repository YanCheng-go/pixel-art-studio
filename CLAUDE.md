# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — TypeScript check + Vite production build
- `npm run lint` — ESLint
- `npm run preview` — Preview production build

No test framework is configured yet.

## Architecture

React 19 + TypeScript + Vite pixel art editor. Dark theme with teal/cyan accents (PixelLab-inspired).

### State Management

Custom hook `useProjectStore()` in `src/store.ts` — uses `useState` + `useRef` (for undo history). Returns `{ state, ...actions }`. No external state library. All state flows top-down from `App.tsx` through props to components.

History is push-based: call `pushHistory()` before mutations, then modify state. Max 100 entries.

### Data Model (`src/types.ts`)

`ProjectState` → `Frame[]` → `Layer[]` → `Color[][]` (2D pixel grid)

- Canvas default: 32x32, zoom range 1-64x
- Tools: `pencil | eraser | fill | colorPicker | select | move` (select/move defined but not yet implemented)
- Each frame has layers rendered bottom-to-top with opacity

### Components (`src/components/`)

- **Canvas** — HTML Canvas 2D rendering with device pixel ratio scaling. Handles drawing, panning (middle-click/Alt+click), zooming (wheel), grid overlay (at zoom >= 4), onion skinning, and symmetry X mirror.
- **Toolbar** — Tool selection, project/export actions, viewport toggles
- **PalettePanel** — Color picker + palette grid
- **LayersPanel** — Layer list (reversed visual order), visibility toggles
- **Timeline** — Frame thumbnails with add/duplicate/remove
- **Preview** — Animated playback using requestAnimationFrame

### Utilities

- `src/export.ts` — `exportFrameAsPng()` and `exportSpriteSheet()` (PNG + JSON metadata). GIF export is a stub.
- `src/pixelize.ts` — Image-to-pixel-art conversion using downscaling + median cut color quantization.

### Styling

Single CSS file `src/App.css` with CSS custom properties. All layout is flexbox. Font: Inter (loaded from Google Fonts in `index.html`).

### Pixel Coordinate System

Canvas rendering is center-based: grid offset = `(centerX - gridWidth/2 + panX, centerY - gridHeight/2 + panY)`. Mouse events convert screen coordinates to pixel grid coordinates using zoom and pan offsets.
