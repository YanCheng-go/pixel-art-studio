#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as engine from './engine.js';

const server = new McpServer({
  name: 'pixel-art-studio',
  version: '1.0.0',
});

// ── Project tools ──

server.tool(
  'create_project',
  'Create a new blank pixel art project',
  { width: z.number().int().min(1).max(512).describe('Canvas width in pixels'),
    height: z.number().int().min(1).max(512).describe('Canvas height in pixels') },
  async ({ width, height }) => {
    engine.createProject(width, height);
    return { content: [{ type: 'text', text: `Created ${width}x${height} project` }] };
  }
);

server.tool(
  'get_project_info',
  'Get current project info: dimensions, frames, layers, palette size',
  {},
  async () => {
    const info = engine.getProjectInfo();
    return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
  }
);

// ── Import / Export ──

server.tool(
  'import_image',
  'Import an image (base64) and convert it to pixel art with color quantization',
  { image_base64: z.string().describe('Base64-encoded image (PNG, JPG, etc.)'),
    target_width: z.number().int().min(1).max(512).describe('Target pixel art width'),
    target_height: z.number().int().min(1).max(512).describe('Target pixel art height'),
    color_count: z.number().int().min(2).max(64).default(16).describe('Number of colors in palette') },
  async ({ image_base64, target_width, target_height, color_count }) => {
    await engine.importImage(image_base64, target_width, target_height, color_count);
    const info = engine.getProjectInfo();
    return { content: [{ type: 'text', text: `Imported image as ${target_width}x${target_height} pixel art with ${color_count} colors.\n${JSON.stringify(info, null, 2)}` }] };
  }
);

server.tool(
  'export_png',
  'Export current frame as a PNG image (returns base64)',
  { scale: z.number().int().min(1).max(16).default(1).describe('Scale multiplier (1 = native resolution)') },
  async ({ scale }) => {
    const base64 = await engine.exportPng(scale);
    return { content: [{ type: 'image', data: base64, mimeType: 'image/png' }] };
  }
);

server.tool(
  'export_sprite_sheet',
  'Export all frames as a sprite sheet PNG with JSON metadata',
  { scale: z.number().int().min(1).max(16).default(1).describe('Scale multiplier') },
  async ({ scale }) => {
    const result = await engine.exportSpriteSheet(scale);
    return { content: [
      { type: 'image', data: result.image, mimeType: 'image/png' },
      { type: 'text', text: JSON.stringify(result.metadata, null, 2) },
    ] };
  }
);

// ── Drawing tools ──

server.tool(
  'set_pixel',
  'Set a single pixel color at (x, y) on the active layer',
  { x: z.number().int().describe('X coordinate'),
    y: z.number().int().describe('Y coordinate'),
    r: z.number().int().min(0).max(255).describe('Red (0-255)'),
    g: z.number().int().min(0).max(255).describe('Green (0-255)'),
    b: z.number().int().min(0).max(255).describe('Blue (0-255)'),
    a: z.number().int().min(0).max(255).default(255).describe('Alpha (0-255)') },
  async ({ x, y, r, g, b, a }) => {
    engine.setPixel(x, y, { r, g, b, a });
    return { content: [{ type: 'text', text: `Set pixel (${x}, ${y}) to rgba(${r},${g},${b},${a})` }] };
  }
);

server.tool(
  'get_pixel',
  'Get the color of a pixel at (x, y) on the active layer',
  { x: z.number().int().describe('X coordinate'),
    y: z.number().int().describe('Y coordinate') },
  async ({ x, y }) => {
    const c = engine.getPixel(x, y);
    return { content: [{ type: 'text', text: JSON.stringify(c) }] };
  }
);

server.tool(
  'draw_line',
  'Draw a line from (x0,y0) to (x1,y1) using Bresenham algorithm',
  { x0: z.number().int(), y0: z.number().int(),
    x1: z.number().int(), y1: z.number().int(),
    r: z.number().int().min(0).max(255),
    g: z.number().int().min(0).max(255),
    b: z.number().int().min(0).max(255),
    a: z.number().int().min(0).max(255).default(255) },
  async ({ x0, y0, x1, y1, r, g, b, a }) => {
    const count = engine.drawLine(x0, y0, x1, y1, { r, g, b, a });
    return { content: [{ type: 'text', text: `Drew line (${x0},${y0})→(${x1},${y1}), ${count} pixels` }] };
  }
);

server.tool(
  'draw_rect',
  'Draw a rectangle at (x, y) with given width and height',
  { x: z.number().int(), y: z.number().int(),
    width: z.number().int().min(1), height: z.number().int().min(1),
    r: z.number().int().min(0).max(255),
    g: z.number().int().min(0).max(255),
    b: z.number().int().min(0).max(255),
    a: z.number().int().min(0).max(255).default(255),
    filled: z.boolean().default(true).describe('Fill the rectangle or outline only') },
  async ({ x, y, width, height, r, g, b, a, filled }) => {
    const count = engine.drawRect(x, y, width, height, { r, g, b, a }, filled);
    return { content: [{ type: 'text', text: `Drew ${filled ? 'filled' : 'outline'} rect at (${x},${y}) ${width}x${height}, ${count} pixels` }] };
  }
);

server.tool(
  'draw_circle',
  'Draw a circle centered at (cx, cy) with given radius',
  { cx: z.number().int(), cy: z.number().int(),
    radius: z.number().int().min(1),
    r: z.number().int().min(0).max(255),
    g: z.number().int().min(0).max(255),
    b: z.number().int().min(0).max(255),
    a: z.number().int().min(0).max(255).default(255),
    filled: z.boolean().default(true) },
  async ({ cx, cy, radius, r, g, b, a, filled }) => {
    const count = engine.drawCircle(cx, cy, radius, { r, g, b, a }, filled);
    return { content: [{ type: 'text', text: `Drew ${filled ? 'filled' : 'outline'} circle at (${cx},${cy}) r=${radius}, ${count} pixels` }] };
  }
);

server.tool(
  'flood_fill',
  'Flood fill from (x, y) replacing the target color with the fill color',
  { x: z.number().int(), y: z.number().int(),
    r: z.number().int().min(0).max(255),
    g: z.number().int().min(0).max(255),
    b: z.number().int().min(0).max(255),
    a: z.number().int().min(0).max(255).default(255) },
  async ({ x, y, r, g, b, a }) => {
    const count = engine.floodFill(x, y, { r, g, b, a });
    return { content: [{ type: 'text', text: `Flood filled from (${x},${y}), ${count} pixels changed` }] };
  }
);

server.tool(
  'clear_layer',
  'Clear all pixels on the active layer (make transparent)',
  {},
  async () => {
    engine.clearLayer();
    return { content: [{ type: 'text', text: 'Active layer cleared' }] };
  }
);

// ── Layer management ──

server.tool(
  'add_layer',
  'Add a new empty layer to the active frame',
  { name: z.string().optional().describe('Layer name') },
  async ({ name }) => {
    const index = engine.addLayer(name);
    return { content: [{ type: 'text', text: `Added layer at index ${index}` }] };
  }
);

server.tool(
  'remove_layer',
  'Remove a layer from the active frame',
  { index: z.number().int().optional().describe('Layer index (defaults to active layer)') },
  async ({ index }) => {
    engine.removeLayer(index);
    return { content: [{ type: 'text', text: `Removed layer` }] };
  }
);

server.tool(
  'set_active_layer',
  'Set the active layer by index',
  { index: z.number().int().describe('Layer index') },
  async ({ index }) => {
    engine.setActiveLayer(index);
    return { content: [{ type: 'text', text: `Active layer set to ${index}` }] };
  }
);

server.tool(
  'set_layer_visibility',
  'Show or hide a layer',
  { index: z.number().int().describe('Layer index'),
    visible: z.boolean().describe('Whether layer is visible') },
  async ({ index, visible }) => {
    engine.setLayerVisibility(index, visible);
    return { content: [{ type: 'text', text: `Layer ${index} visibility: ${visible}` }] };
  }
);

server.tool(
  'set_layer_opacity',
  'Set layer opacity (0.0 to 1.0)',
  { index: z.number().int().describe('Layer index'),
    opacity: z.number().min(0).max(1).describe('Opacity (0.0 to 1.0)') },
  async ({ index, opacity }) => {
    engine.setLayerOpacity(index, opacity);
    return { content: [{ type: 'text', text: `Layer ${index} opacity: ${opacity}` }] };
  }
);

// ── Frame management ──

server.tool(
  'add_frame',
  'Add a new empty frame',
  {},
  async () => {
    const index = engine.addFrame();
    return { content: [{ type: 'text', text: `Added frame at index ${index}` }] };
  }
);

server.tool(
  'duplicate_frame',
  'Duplicate the active frame',
  {},
  async () => {
    const index = engine.duplicateFrame();
    return { content: [{ type: 'text', text: `Duplicated frame, new index: ${index}` }] };
  }
);

server.tool(
  'remove_frame',
  'Remove a frame',
  { index: z.number().int().optional().describe('Frame index (defaults to active)') },
  async ({ index }) => {
    engine.removeFrame(index);
    return { content: [{ type: 'text', text: 'Removed frame' }] };
  }
);

server.tool(
  'set_active_frame',
  'Set the active frame by index',
  { index: z.number().int().describe('Frame index') },
  async ({ index }) => {
    engine.setActiveFrame(index);
    return { content: [{ type: 'text', text: `Active frame set to ${index}` }] };
  }
);

// ── Palette ──

server.tool(
  'get_palette',
  'Get the current color palette',
  {},
  async () => {
    const palette = engine.getPalette();
    return { content: [{ type: 'text', text: JSON.stringify(palette) }] };
  }
);

server.tool(
  'add_to_palette',
  'Add a color to the palette',
  { r: z.number().int().min(0).max(255),
    g: z.number().int().min(0).max(255),
    b: z.number().int().min(0).max(255),
    a: z.number().int().min(0).max(255).default(255) },
  async ({ r, g, b, a }) => {
    engine.addToPalette({ r, g, b, a });
    return { content: [{ type: 'text', text: `Added rgba(${r},${g},${b},${a}) to palette` }] };
  }
);

// ── Start server ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
