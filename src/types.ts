export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Pixel {
  color: Color;
}

export type Tool =
  | 'pencil'
  | 'eraser'
  | 'fill'
  | 'colorPicker'
  | 'select'
  | 'move';

export interface Layer {
  id: string;
  name: string;
  pixels: Color[][];
  visible: boolean;
  opacity: number;
  locked: boolean;
}

export interface Frame {
  id: string;
  layers: Layer[];
  duration: number; // ms
  tag?: string;
}

export interface ProjectState {
  width: number;
  height: number;
  frames: Frame[];
  activeFrameIndex: number;
  activeLayerIndex: number;
  activeTool: Tool;
  activeColor: Color;
  palette: Color[];
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  symmetryX: boolean;
  onionSkinning: boolean;
}

export interface HistoryEntry {
  frames: Frame[];
  activeFrameIndex: number;
  activeLayerIndex: number;
}

export const TRANSPARENT: Color = { r: 0, g: 0, b: 0, a: 0 };

export function colorToString(c: Color): string {
  return `rgba(${c.r},${c.g},${c.b},${c.a / 255})`;
}

export function colorToHex(c: Color): string {
  const r = c.r.toString(16).padStart(2, '0');
  const g = c.g.toString(16).padStart(2, '0');
  const b = c.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function hexToColor(hex: string): Color {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b, a: 255 };
}

export function colorsEqual(a: Color, b: Color): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function createEmptyLayer(
  id: string,
  name: string,
  width: number,
  height: number
): Layer {
  const pixels: Color[][] = [];
  for (let y = 0; y < height; y++) {
    pixels[y] = [];
    for (let x = 0; x < width; x++) {
      pixels[y][x] = { ...TRANSPARENT };
    }
  }
  return { id, name, pixels, visible: true, opacity: 1, locked: false };
}

export function createFrame(
  id: string,
  width: number,
  height: number
): Frame {
  return {
    id,
    layers: [createEmptyLayer('layer-1', 'Layer 1', width, height)],
    duration: 100,
  };
}

export function cloneColor(c: Color): Color {
  return { r: c.r, g: c.g, b: c.b, a: c.a };
}

export function cloneLayer(layer: Layer): Layer {
  return {
    ...layer,
    pixels: layer.pixels.map((row) => row.map((c) => cloneColor(c))),
  };
}

export function cloneFrame(frame: Frame): Frame {
  return {
    ...frame,
    layers: frame.layers.map(cloneLayer),
  };
}
