# Pixel Art Studio MCP Server

An MCP (Model Context Protocol) server that lets AI agents create, edit, and export pixel art programmatically.

## Setup

```bash
cd mcp-server
npm install
npm run build
```

## Usage with Claude Code

Add to your Claude Code MCP settings (`~/.claude/claude_desktop_config.json`):

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

## Available Tools

### Project Management
| Tool | Description |
|------|-------------|
| `create_project` | Create a new blank project (width, height) |
| `get_project_info` | Get dimensions, frames, layers, palette info |

### Import / Export
| Tool | Description |
|------|-------------|
| `import_image` | Import base64 image, auto-pixelize with color quantization |
| `export_png` | Export current frame as PNG (returns base64) |
| `export_sprite_sheet` | Export all frames as sprite sheet + JSON metadata |

### Drawing
| Tool | Description |
|------|-------------|
| `set_pixel` | Set a single pixel at (x, y) |
| `get_pixel` | Read pixel color at (x, y) |
| `draw_line` | Bresenham line from (x0,y0) to (x1,y1) |
| `draw_rect` | Rectangle (filled or outline) |
| `draw_circle` | Circle (filled or outline) |
| `flood_fill` | Flood fill from a point |
| `clear_layer` | Clear all pixels on active layer |

### Layers
| Tool | Description |
|------|-------------|
| `add_layer` | Add new empty layer |
| `remove_layer` | Remove a layer |
| `set_active_layer` | Switch active layer |
| `set_layer_visibility` | Show/hide layer |
| `set_layer_opacity` | Set layer opacity (0-1) |

### Frames (Animation)
| Tool | Description |
|------|-------------|
| `add_frame` | Add new empty frame |
| `duplicate_frame` | Duplicate active frame |
| `remove_frame` | Remove a frame |
| `set_active_frame` | Switch active frame |

### Palette
| Tool | Description |
|------|-------------|
| `get_palette` | Get current color palette |
| `add_to_palette` | Add color to palette |

## Example Workflow

```
1. create_project(32, 32)
2. draw_rect(0, 0, 32, 32, r=135, g=206, b=235, filled=true)  -- sky background
3. draw_rect(0, 24, 32, 8, r=34, g=139, b=34, filled=true)    -- grass
4. draw_circle(24, 8, 4, r=255, g=255, b=0, filled=true)       -- sun
5. export_png(scale=4)                                          -- get 128x128 PNG
```

## License

CC-BY-4.0
