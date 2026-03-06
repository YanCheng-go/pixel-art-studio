import { useState, useCallback, useRef } from 'react';
import {
  type ProjectState,
  type Color,
  type Tool,
  type HistoryEntry,
  createFrame,
  cloneFrame,
  createEmptyLayer,
  colorsEqual,
  cloneColor,
} from './types';

const DEFAULT_WIDTH = 32;
const DEFAULT_HEIGHT = 32;

function createInitialState(): ProjectState {
  const frame = createFrame('frame-1', DEFAULT_WIDTH, DEFAULT_HEIGHT);
  return {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    frames: [frame],
    activeFrameIndex: 0,
    activeLayerIndex: 0,
    activeTool: 'pencil',
    activeColor: { r: 0, g: 0, b: 0, a: 255 },
    palette: [
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
      { r: 255, g: 0, b: 0, a: 255 },
      { r: 0, g: 255, b: 0, a: 255 },
      { r: 0, g: 0, b: 255, a: 255 },
      { r: 255, g: 255, b: 0, a: 255 },
      { r: 255, g: 0, b: 255, a: 255 },
      { r: 0, g: 255, b: 255, a: 255 },
      { r: 128, g: 128, b: 128, a: 255 },
      { r: 255, g: 128, b: 0, a: 255 },
      { r: 128, g: 0, b: 255, a: 255 },
      { r: 0, g: 128, b: 255, a: 255 },
      { r: 255, g: 128, b: 128, a: 255 },
      { r: 128, g: 255, b: 128, a: 255 },
      { r: 128, g: 128, b: 255, a: 255 },
      { r: 64, g: 64, b: 64, a: 255 },
    ],
    zoom: 16,
    panX: 0,
    panY: 0,
    showGrid: true,
    symmetryX: false,
    onionSkinning: false,
  };
}

export function useProjectStore() {
  const [state, setState] = useState<ProjectState>(createInitialState);
  const undoStackRef = useRef<HistoryEntry[]>([]);
  const redoStackRef = useRef<HistoryEntry[]>([]);

  const pushHistory = useCallback(() => {
    setState((s) => {
      const entry: HistoryEntry = {
        frames: s.frames.map(cloneFrame),
        activeFrameIndex: s.activeFrameIndex,
        activeLayerIndex: s.activeLayerIndex,
      };
      undoStackRef.current.push(entry);
      if (undoStackRef.current.length > 100) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
      return s;
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      if (undoStackRef.current.length === 0) return s;
      redoStackRef.current.push({
        frames: s.frames.map(cloneFrame),
        activeFrameIndex: s.activeFrameIndex,
        activeLayerIndex: s.activeLayerIndex,
      });
      const entry = undoStackRef.current.pop()!;
      return {
        ...s,
        frames: entry.frames,
        activeFrameIndex: entry.activeFrameIndex,
        activeLayerIndex: entry.activeLayerIndex,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (redoStackRef.current.length === 0) return s;
      undoStackRef.current.push({
        frames: s.frames.map(cloneFrame),
        activeFrameIndex: s.activeFrameIndex,
        activeLayerIndex: s.activeLayerIndex,
      });
      const entry = redoStackRef.current.pop()!;
      return {
        ...s,
        frames: entry.frames,
        activeFrameIndex: entry.activeFrameIndex,
        activeLayerIndex: entry.activeLayerIndex,
      };
    });
  }, []);

  const setTool = useCallback((tool: Tool) => {
    setState((s) => ({ ...s, activeTool: tool }));
  }, []);

  const setColor = useCallback((color: Color) => {
    setState((s) => ({ ...s, activeColor: color }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState((s) => ({ ...s, zoom: Math.max(1, Math.min(64, zoom)) }));
  }, []);

  const setPan = useCallback((panX: number, panY: number) => {
    setState((s) => ({ ...s, panX, panY }));
  }, []);

  const toggleGrid = useCallback(() => {
    setState((s) => ({ ...s, showGrid: !s.showGrid }));
  }, []);

  const toggleSymmetry = useCallback(() => {
    setState((s) => ({ ...s, symmetryX: !s.symmetryX }));
  }, []);

  const toggleOnionSkinning = useCallback(() => {
    setState((s) => ({ ...s, onionSkinning: !s.onionSkinning }));
  }, []);

  const getActiveLayer = useCallback(() => {
    const frame = state.frames[state.activeFrameIndex];
    return frame?.layers[state.activeLayerIndex];
  }, [state.frames, state.activeFrameIndex, state.activeLayerIndex]);

  const setPixel = useCallback(
    (x: number, y: number, color: Color) => {
      setState((s) => {
        if (x < 0 || x >= s.width || y < 0 || y >= s.height) return s;
        const layer =
          s.frames[s.activeFrameIndex].layers[s.activeLayerIndex];
        if (layer.locked || !layer.visible) return s;
        const newFrames = s.frames.map((f, fi) => {
          if (fi !== s.activeFrameIndex) return f;
          return {
            ...f,
            layers: f.layers.map((l, li) => {
              if (li !== s.activeLayerIndex) return l;
              const newPixels = l.pixels.map((row, ry) => {
                if (ry !== y) return row;
                return row.map((c, rx) => {
                  if (rx !== x) return c;
                  return cloneColor(color);
                });
              });
              // Symmetry
              if (s.symmetryX) {
                const mirrorX = s.width - 1 - x;
                if (mirrorX !== x && mirrorX >= 0 && mirrorX < s.width) {
                  newPixels[y] = newPixels[y].map((c, rx) => {
                    if (rx !== mirrorX) return c;
                    return cloneColor(color);
                  });
                }
              }
              return { ...l, pixels: newPixels };
            }),
          };
        });
        return { ...s, frames: newFrames };
      });
    },
    []
  );

  const floodFill = useCallback(
    (startX: number, startY: number, fillColor: Color) => {
      setState((s) => {
        const layer =
          s.frames[s.activeFrameIndex].layers[s.activeLayerIndex];
        if (layer.locked || !layer.visible) return s;
        const targetColor = layer.pixels[startY][startX];
        if (colorsEqual(targetColor, fillColor)) return s;

        const newPixels = layer.pixels.map((row) =>
          row.map((c) => cloneColor(c))
        );
        const stack: [number, number][] = [[startX, startY]];
        const visited = new Set<string>();

        while (stack.length > 0) {
          const [x, y] = stack.pop()!;
          const key = `${x},${y}`;
          if (visited.has(key)) continue;
          if (x < 0 || x >= s.width || y < 0 || y >= s.height) continue;
          if (!colorsEqual(newPixels[y][x], targetColor)) continue;
          visited.add(key);
          newPixels[y][x] = cloneColor(fillColor);
          if (s.symmetryX) {
            const mirrorX = s.width - 1 - x;
            if (mirrorX !== x && mirrorX >= 0 && mirrorX < s.width) {
              newPixels[y][mirrorX] = cloneColor(fillColor);
            }
          }
          stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        const newFrames = s.frames.map((f, fi) => {
          if (fi !== s.activeFrameIndex) return f;
          return {
            ...f,
            layers: f.layers.map((l, li) => {
              if (li !== s.activeLayerIndex) return l;
              return { ...l, pixels: newPixels };
            }),
          };
        });
        return { ...s, frames: newFrames };
      });
    },
    []
  );

  const addLayer = useCallback(() => {
    setState((s) => {
      const frame = s.frames[s.activeFrameIndex];
      const id = `layer-${Date.now()}`;
      const newLayer = createEmptyLayer(
        id,
        `Layer ${frame.layers.length + 1}`,
        s.width,
        s.height
      );
      const newFrames = s.frames.map((f, fi) => {
        if (fi !== s.activeFrameIndex) return f;
        return { ...f, layers: [...f.layers, newLayer] };
      });
      return {
        ...s,
        frames: newFrames,
        activeLayerIndex: frame.layers.length,
      };
    });
  }, []);

  const removeLayer = useCallback(() => {
    setState((s) => {
      const frame = s.frames[s.activeFrameIndex];
      if (frame.layers.length <= 1) return s;
      const newFrames = s.frames.map((f, fi) => {
        if (fi !== s.activeFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.filter((_, li) => li !== s.activeLayerIndex),
        };
      });
      return {
        ...s,
        frames: newFrames,
        activeLayerIndex: Math.max(0, s.activeLayerIndex - 1),
      };
    });
  }, []);

  const setActiveLayer = useCallback((index: number) => {
    setState((s) => ({ ...s, activeLayerIndex: index }));
  }, []);

  const toggleLayerVisibility = useCallback((index: number) => {
    setState((s) => {
      const newFrames = s.frames.map((f, fi) => {
        if (fi !== s.activeFrameIndex) return f;
        return {
          ...f,
          layers: f.layers.map((l, li) => {
            if (li !== index) return l;
            return { ...l, visible: !l.visible };
          }),
        };
      });
      return { ...s, frames: newFrames };
    });
  }, []);

  const addFrame = useCallback(() => {
    setState((s) => {
      const id = `frame-${Date.now()}`;
      const newFrame = createFrame(id, s.width, s.height);
      return {
        ...s,
        frames: [...s.frames, newFrame],
        activeFrameIndex: s.frames.length,
        activeLayerIndex: 0,
      };
    });
  }, []);

  const duplicateFrame = useCallback(() => {
    setState((s) => {
      const frame = s.frames[s.activeFrameIndex];
      const newFrame = cloneFrame(frame);
      newFrame.id = `frame-${Date.now()}`;
      const newFrames = [...s.frames];
      newFrames.splice(s.activeFrameIndex + 1, 0, newFrame);
      return {
        ...s,
        frames: newFrames,
        activeFrameIndex: s.activeFrameIndex + 1,
      };
    });
  }, []);

  const removeFrame = useCallback(() => {
    setState((s) => {
      if (s.frames.length <= 1) return s;
      return {
        ...s,
        frames: s.frames.filter((_, i) => i !== s.activeFrameIndex),
        activeFrameIndex: Math.max(0, s.activeFrameIndex - 1),
        activeLayerIndex: 0,
      };
    });
  }, []);

  const setActiveFrame = useCallback((index: number) => {
    setState((s) => ({ ...s, activeFrameIndex: index, activeLayerIndex: 0 }));
  }, []);

  const addToPalette = useCallback((color: Color) => {
    setState((s) => {
      if (s.palette.some((c) => colorsEqual(c, color))) return s;
      return { ...s, palette: [...s.palette, cloneColor(color)] };
    });
  }, []);

  const loadImageToLayer = useCallback(
    (imageData: ImageData, targetWidth: number, targetHeight: number) => {
      setState((s) => {
        // Downscale image to target dimensions
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d')!;

        // Create source canvas with original image
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = imageData.width;
        srcCanvas.height = imageData.height;
        const srcCtx = srcCanvas.getContext('2d')!;
        srcCtx.putImageData(imageData, 0, 0);

        // Draw downscaled
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);
        const downscaled = ctx.getImageData(0, 0, targetWidth, targetHeight);

        // Convert to pixel array
        const pixels: Color[][] = [];
        const extractedColors: Color[] = [];
        for (let y = 0; y < targetHeight; y++) {
          pixels[y] = [];
          for (let x = 0; x < targetWidth; x++) {
            const i = (y * targetWidth + x) * 4;
            const color: Color = {
              r: downscaled.data[i],
              g: downscaled.data[i + 1],
              b: downscaled.data[i + 2],
              a: downscaled.data[i + 3],
            };
            pixels[y][x] = color;
            if (
              color.a > 0 &&
              !extractedColors.some((c) => colorsEqual(c, color))
            ) {
              extractedColors.push(cloneColor(color));
            }
          }
        }

        const newLayer = createEmptyLayer(
          `layer-${Date.now()}`,
          'Imported Image',
          targetWidth,
          targetHeight
        );
        newLayer.pixels = pixels;

        const frame = s.frames[s.activeFrameIndex];
        const newFrames = s.frames.map((f, fi) => {
          if (fi !== s.activeFrameIndex) return f;
          return { ...f, layers: [...f.layers, newLayer] };
        });

        // Merge palettes (limit to 64 colors)
        const newPalette = [...s.palette];
        for (const c of extractedColors) {
          if (
            newPalette.length < 64 &&
            !newPalette.some((pc) => colorsEqual(pc, c))
          ) {
            newPalette.push(c);
          }
        }

        return {
          ...s,
          width: targetWidth,
          height: targetHeight,
          frames: newFrames,
          activeLayerIndex: frame.layers.length,
          palette: newPalette,
        };
      });
    },
    []
  );

  const newProject = useCallback(
    (width: number, height: number) => {
      const frame = createFrame('frame-1', width, height);
      // Auto-fit zoom so the canvas fits in ~512px viewport area
      const fitZoom = Math.max(1, Math.min(64, Math.floor(512 / Math.max(width, height))));
      setState({
        ...createInitialState(),
        width,
        height,
        frames: [frame],
        zoom: fitZoom,
        panX: 0,
        panY: 0,
      });
      undoStackRef.current = [];
      redoStackRef.current = [];
    },
    []
  );

  return {
    state,
    setState,
    pushHistory,
    undo,
    redo,
    setTool,
    setColor,
    setZoom,
    setPan,
    toggleGrid,
    toggleSymmetry,
    toggleOnionSkinning,
    getActiveLayer,
    setPixel,
    floodFill,
    addLayer,
    removeLayer,
    setActiveLayer,
    toggleLayerVisibility,
    addFrame,
    duplicateFrame,
    removeFrame,
    setActiveFrame,
    addToPalette,
    loadImageToLayer,
    newProject,
  };
}
