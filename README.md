# Pixel Art Studio

A browser-based pixel art editor built with React + TypeScript + Vite. Dark terminal aesthetic with neon green accents.

**Live:** [maverick-pixel-studio.vercel.app](https://maverick-pixel-studio.vercel.app)

## Features

- **Drawing Tools** - Pencil, eraser, flood fill, color picker with Bresenham line interpolation (no gaps in strokes)
- **Layers** - Multiple layers per frame with opacity and visibility controls
- **Animation** - Timeline with multiple frames, preview playback, onion skinning
- **Import** - Load any image with automatic pixelization and color quantization (drag & drop supported)
- **AI Generate** - Generate pixel art using Google Gemini API (bring your own API key)
- **Export** - PNG export, sprite sheet export (PNG + JSON metadata)
- **Canvas** - Zoom, pan, grid overlay, X-axis symmetry mirror, pixel hover highlight
- **Palette** - Color picker with customizable palette, extracted colors from imports
- **Undo/Redo** - Dual-stack undo/redo up to 100 steps, only records actual modifications
- **Responsive** - Adapts sidebar width for smaller screens

## Getting Started

```bash
npm install
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| B | Pencil tool |
| E | Eraser tool |
| G | Fill tool |
| I | Color picker |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Scroll wheel | Zoom |
| Middle-click / Alt+click | Pan |

## Architecture

React 19 + TypeScript + Vite. No external state library — uses a custom `useProjectStore()` hook with `useState` + `useRef` for dual-stack undo/redo history. Canvas rendering uses offscreen ImageData compositing for performance (pixels rendered to a small buffer, then blitted scaled via `drawImage`).

### Data Model

```
ProjectState -> Frame[] -> Layer[] -> Color[][] (2D pixel grid)
```

### Key Files

- `src/store.ts` - State management hook
- `src/types.ts` - Data model types
- `src/components/Canvas.tsx` - Main drawing canvas
- `src/components/Toolbar.tsx` - Tool selection and actions
- `src/export.ts` - PNG and sprite sheet export
- `src/pixelize.ts` - Image-to-pixel-art conversion
- `src/gemini.ts` - Gemini API integration

## AI Integration

The editor includes client-side AI pixel art generation using Google Gemini 2.0 Flash. Enter your own API key (stored in localStorage, never sent to any server) and a text prompt to generate pixel art.

## MCP Server

An MCP (Model Context Protocol) server is included in `mcp-server/`, enabling AI agents (Claude, Cursor, etc.) to programmatically create, edit, and export pixel art.

```bash
cd mcp-server
npm install && npm run build
```

Add to your Claude Code config:

```json
{
  "mcpServers": {
    "pixel-art-studio": {
      "command": "node",
      "args": ["/path/to/pixel-art-studio/mcp-server/dist/index.js"]
    }
  }
}
```

**22 tools available:** create projects, import/pixelize images, draw (pixel, line, rect, circle, fill), manage layers and animation frames, export PNG and sprite sheets. See [mcp-server/README.md](mcp-server/README.md) for full docs.

## Deploy

The project is deployed on Vercel as a static site. Push to `master` to auto-deploy.

## Support

If you find this project useful:

- [Buy Me a Coffee](https://buymeacoffee.com/maverickmiaow)

## License

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
