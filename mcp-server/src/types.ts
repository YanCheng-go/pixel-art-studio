export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Layer {
  id: string;
  name: string;
  pixels: Color[][];
  visible: boolean;
  locked: boolean;
  opacity: number;
}

export interface Frame {
  id: string;
  layers: Layer[];
  duration: number;
  tag?: string;
}

export interface ProjectState {
  width: number;
  height: number;
  frames: Frame[];
  activeFrameIndex: number;
  activeLayerIndex: number;
  palette: Color[];
}

export const TRANSPARENT: Color = { r: 0, g: 0, b: 0, a: 0 };

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
  return { id, name, pixels, visible: true, locked: false, opacity: 1 };
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

export function colorsEqual(a: Color, b: Color): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function cloneColor(c: Color): Color {
  return { r: c.r, g: c.g, b: c.b, a: c.a };
}
