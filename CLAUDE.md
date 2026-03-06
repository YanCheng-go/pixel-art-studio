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

History uses a dual-stack model (`undoStackRef` / `redoStackRef`). Call `pushHistory()` before mutations to save current state to the undo stack (clears redo stack). Max 100 undo entries. Undo pops from undo stack, pushes current state to redo stack. Redo does the reverse.

### Data Model (`src/types.ts`)

`ProjectState` → `Frame[]` → `Layer[]` → `Color[][]` (2D pixel grid)

- Canvas default: 32x32, zoom range 1-64x
- Tools: `pencil | eraser | fill | colorPicker | select | move` (select/move defined but not yet implemented)
- Each frame has layers rendered bottom-to-top with opacity
- Flood fill supports symmetry X mirroring

### Components (`src/components/`)

- **Canvas** — HTML Canvas 2D rendering with offscreen ImageData compositing (pixels rendered to a width×height offscreen canvas, then blitted scaled with `drawImage`). Handles drawing with Bresenham line interpolation, panning (middle-click/Alt+click), zooming (wheel), grid overlay (at zoom >= 4), onion skinning, symmetry X mirror, and hover pixel highlight. CSS variables are cached and refreshed on theme change (not re-read every frame). History is only pushed when the active tool will actually modify pixels (not for color picker or locked/hidden layers).
- **Toolbar** — Tool selection, project/export actions, viewport toggles. Zoom buttons use adaptive stepping (matching scroll wheel behavior).
- **PalettePanel** — Color picker + palette grid
- **LayersPanel** — Layer list (reversed visual order), visibility toggles with aria-labels
- **Timeline** — Frame thumbnails with add/duplicate/remove, aria-labels on buttons
- **Preview** — Animated playback using requestAnimationFrame

### Utilities

- `src/export.ts` — `exportFrameAsPng()` and `exportSpriteSheet()` (PNG + JSON metadata). GIF export is a stub. Blob URLs are revoked after use.
- `src/pixelize.ts` — Image-to-pixel-art conversion using downscaling + median cut color quantization.

### Styling

Single CSS file `src/App.css` with CSS custom properties. All layout is flexbox. Font: Inter (loaded from Google Fonts in `index.html`). Basic responsive breakpoints at 900px and 640px (sidebars narrow, brand hides).

### Pixel Coordinate System

Canvas rendering is center-based: grid offset = `(centerX - gridWidth/2 + panX, centerY - gridHeight/2 + panY)`. Mouse events convert screen coordinates to pixel grid coordinates using zoom and pan offsets.

### UX Safety

New Project and AI Generate prompt a confirmation dialog if the canvas has any drawn content, preventing accidental data loss. Image file object URLs are revoked after loading to prevent memory leaks.
