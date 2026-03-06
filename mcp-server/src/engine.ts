import sharp from 'sharp';
import {
  type Color,
  type Layer,
  type Frame,
  type ProjectState,
  TRANSPARENT,
  createEmptyLayer,
  createFrame,
  colorsEqual,
  cloneColor,
} from './types.js';

let state: ProjectState | null = null;

export function getState(): ProjectState {
  if (!state) throw new Error('No project open. Use create_project or import_image first.');
  return state;
}

export function hasProject(): boolean {
  return state !== null;
}

// ── Project management ──

export function createProject(width: number, height: number): ProjectState {
  state = {
    width,
    height,
    frames: [createFrame('frame-1', width, height)],
    activeFrameIndex: 0,
    activeLayerIndex: 0,
    palette: [
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
      { r: 255, g: 0, b: 0, a: 255 },
      { r: 0, g: 255, b: 0, a: 255 },
      { r: 0, g: 0, b: 255, a: 255 },
      { r: 255, g: 255, b: 0, a: 255 },
      { r: 255, g: 0, b: 255, a: 255 },
      { r: 0, g: 255, b: 255, a: 255 },
    ],
  };
  return state;
}

export function getProjectInfo() {
  const s = getState();
  const frame = s.frames[s.activeFrameIndex];
  return {
    width: s.width,
    height: s.height,
    frameCount: s.frames.length,
    activeFrameIndex: s.activeFrameIndex,
    activeLayerIndex: s.activeLayerIndex,
    layers: frame.layers.map((l, i) => ({
      index: i,
      id: l.id,
      name: l.name,
      visible: l.visible,
      locked: l.locked,
      opacity: l.opacity,
    })),
    paletteSize: s.palette.length,
  };
}

// ── Pixel operations ──

function getActiveLayer(): Layer {
  const s = getState();
  const frame = s.frames[s.activeFrameIndex];
  const layer = frame.layers[s.activeLayerIndex];
  if (!layer) throw new Error(`Invalid active layer index: ${s.activeLayerIndex}`);
  if (layer.locked) throw new Error(`Layer "${layer.name}" is locked`);
  if (!layer.visible) throw new Error(`Layer "${layer.name}" is not visible`);
  return layer;
}

export function setPixel(x: number, y: number, color: Color): void {
  const s = getState();
  if (x < 0 || x >= s.width || y < 0 || y >= s.height) {
    throw new Error(`Coordinates (${x}, ${y}) out of bounds (${s.width}x${s.height})`);
  }
  const layer = getActiveLayer();
  layer.pixels[y][x] = cloneColor(color);
}

export function getPixel(x: number, y: number): Color {
  const s = getState();
  if (x < 0 || x >= s.width || y < 0 || y >= s.height) {
    throw new Error(`Coordinates (${x}, ${y}) out of bounds (${s.width}x${s.height})`);
  }
  const layer = getActiveLayer();
  return cloneColor(layer.pixels[y][x]);
}

export function drawLine(x0: number, y0: number, x1: number, y1: number, color: Color): number {
  const s = getState();
  const layer = getActiveLayer();
  let count = 0;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0, y = y0;
  while (true) {
    if (x >= 0 && x < s.width && y >= 0 && y < s.height) {
      layer.pixels[y][x] = cloneColor(color);
      count++;
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return count;
}

export function drawRect(x: number, y: number, w: number, h: number, color: Color, filled: boolean): number {
  const s = getState();
  const layer = getActiveLayer();
  let count = 0;

  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px < 0 || px >= s.width || py < 0 || py >= s.height) continue;
      if (filled || px === x || px === x + w - 1 || py === y || py === y + h - 1) {
        layer.pixels[py][px] = cloneColor(color);
        count++;
      }
    }
  }
  return count;
}

export function drawCircle(cx: number, cy: number, radius: number, color: Color, filled: boolean): number {
  const s = getState();
  const layer = getActiveLayer();
  let count = 0;

  for (let py = cy - radius; py <= cy + radius; py++) {
    for (let px = cx - radius; px <= cx + radius; px++) {
      if (px < 0 || px >= s.width || py < 0 || py >= s.height) continue;
      const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      if (filled ? dist <= radius : Math.abs(dist - radius) < 1) {
        layer.pixels[py][px] = cloneColor(color);
        count++;
      }
    }
  }
  return count;
}

export function floodFill(startX: number, startY: number, fillColor: Color): number {
  const s = getState();
  const layer = getActiveLayer();
  if (startX < 0 || startX >= s.width || startY < 0 || startY >= s.height) {
    throw new Error(`Coordinates (${startX}, ${startY}) out of bounds`);
  }

  const targetColor = layer.pixels[startY][startX];
  if (colorsEqual(targetColor, fillColor)) return 0;

  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();
  let count = 0;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    if (x < 0 || x >= s.width || y < 0 || y >= s.height) continue;
    if (!colorsEqual(layer.pixels[y][x], targetColor)) continue;
    visited.add(key);
    layer.pixels[y][x] = cloneColor(fillColor);
    count++;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return count;
}

export function clearLayer(): void {
  const s = getState();
  const layer = getActiveLayer();
  for (let y = 0; y < s.height; y++) {
    for (let x = 0; x < s.width; x++) {
      layer.pixels[y][x] = { ...TRANSPARENT };
    }
  }
}

// ── Layer management ──

export function addLayer(name?: string): number {
  const s = getState();
  const frame = s.frames[s.activeFrameIndex];
  const id = `layer-${Date.now()}`;
  const layerName = name || `Layer ${frame.layers.length + 1}`;
  const newLayer = createEmptyLayer(id, layerName, s.width, s.height);
  frame.layers.push(newLayer);
  s.activeLayerIndex = frame.layers.length - 1;
  return s.activeLayerIndex;
}

export function removeLayer(index?: number): void {
  const s = getState();
  const frame = s.frames[s.activeFrameIndex];
  const idx = index ?? s.activeLayerIndex;
  if (frame.layers.length <= 1) throw new Error('Cannot remove the only layer');
  if (idx < 0 || idx >= frame.layers.length) throw new Error(`Invalid layer index: ${idx}`);
  frame.layers.splice(idx, 1);
  s.activeLayerIndex = Math.min(s.activeLayerIndex, frame.layers.length - 1);
}

export function setActiveLayer(index: number): void {
  const s = getState();
  const frame = s.frames[s.activeFrameIndex];
  if (index < 0 || index >= frame.layers.length) throw new Error(`Invalid layer index: ${index}`);
  s.activeLayerIndex = index;
}

export function setLayerVisibility(index: number, visible: boolean): void {
  const s = getState();
  const frame = s.frames[s.activeFrameIndex];
  if (index < 0 || index >= frame.layers.length) throw new Error(`Invalid layer index: ${index}`);
  frame.layers[index].visible = visible;
}

export function setLayerOpacity(index: number, opacity: number): void {
  const s = getState();
  const frame = s.frames[s.activeFrameIndex];
  if (index < 0 || index >= frame.layers.length) throw new Error(`Invalid layer index: ${index}`);
  frame.layers[index].opacity = Math.max(0, Math.min(1, opacity));
}

// ── Frame management ──

export function addFrame(): number {
  const s = getState();
  const id = `frame-${Date.now()}`;
  const newFrame = createFrame(id, s.width, s.height);
  s.frames.push(newFrame);
  s.activeFrameIndex = s.frames.length - 1;
  s.activeLayerIndex = 0;
  return s.activeFrameIndex;
}

export function duplicateFrame(): number {
  const s = getState();
  const frame = s.frames[s.activeFrameIndex];
  const newFrame: Frame = {
    id: `frame-${Date.now()}`,
    duration: frame.duration,
    tag: frame.tag,
    layers: frame.layers.map((l) => ({
      ...l,
      id: `${l.id}-copy-${Date.now()}`,
      pixels: l.pixels.map((row) => row.map(cloneColor)),
    })),
  };
  s.frames.splice(s.activeFrameIndex + 1, 0, newFrame);
  s.activeFrameIndex++;
  return s.activeFrameIndex;
}

export function removeFrame(index?: number): void {
  const s = getState();
  const idx = index ?? s.activeFrameIndex;
  if (s.frames.length <= 1) throw new Error('Cannot remove the only frame');
  if (idx < 0 || idx >= s.frames.length) throw new Error(`Invalid frame index: ${idx}`);
  s.frames.splice(idx, 1);
  s.activeFrameIndex = Math.min(s.activeFrameIndex, s.frames.length - 1);
  s.activeLayerIndex = 0;
}

export function setActiveFrame(index: number): void {
  const s = getState();
  if (index < 0 || index >= s.frames.length) throw new Error(`Invalid frame index: ${index}`);
  s.activeFrameIndex = index;
  s.activeLayerIndex = 0;
}

// ── Palette ──

export function addToPalette(color: Color): void {
  const s = getState();
  if (s.palette.some((c) => colorsEqual(c, color))) return;
  if (s.palette.length >= 64) throw new Error('Palette is full (max 64 colors)');
  s.palette.push(cloneColor(color));
}

export function getPalette(): Color[] {
  return getState().palette.map(cloneColor);
}

// ── Image import ──

function medianCut(colors: Color[], targetCount: number): Color[] {
  if (colors.length <= targetCount) return colors;

  let buckets: Color[][] = [colors];

  while (buckets.length < targetCount) {
    let maxRange = -1;
    let maxBucketIdx = 0;
    let splitChannel: 'r' | 'g' | 'b' = 'r';

    for (let i = 0; i < buckets.length; i++) {
      for (const ch of ['r', 'g', 'b'] as const) {
        const values = buckets[i].map((c) => c[ch]);
        const range = Math.max(...values) - Math.min(...values);
        if (range > maxRange) {
          maxRange = range;
          maxBucketIdx = i;
          splitChannel = ch;
        }
      }
    }

    const bucket = buckets[maxBucketIdx];
    bucket.sort((a, b) => a[splitChannel] - b[splitChannel]);
    const mid = Math.floor(bucket.length / 2);
    buckets.splice(maxBucketIdx, 1, bucket.slice(0, mid), bucket.slice(mid));
  }

  return buckets.map((bucket) => {
    if (bucket.length === 0) return { r: 0, g: 0, b: 0, a: 255 };
    const sum = bucket.reduce(
      (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b, a: acc.a + c.a }),
      { r: 0, g: 0, b: 0, a: 0 }
    );
    return {
      r: Math.round(sum.r / bucket.length),
      g: Math.round(sum.g / bucket.length),
      b: Math.round(sum.b / bucket.length),
      a: Math.round(sum.a / bucket.length),
    };
  });
}

function findClosestColor(color: Color, palette: Color[]): Color {
  let minDist = Infinity;
  let closest = palette[0];
  for (const p of palette) {
    const dr = color.r - p.r;
    const dg = color.g - p.g;
    const db = color.b - p.b;
    const d = dr * dr + dg * dg + db * db;
    if (d < minDist) {
      minDist = d;
      closest = p;
    }
  }
  return cloneColor(closest);
}

export async function importImage(
  imageBase64: string,
  targetWidth: number,
  targetHeight: number,
  colorCount: number = 16
): Promise<ProjectState> {
  const imgBuffer = Buffer.from(imageBase64, 'base64');

  // Resize with sharp
  const resized = await sharp(imgBuffer)
    .resize(targetWidth, targetHeight, { fit: 'fill', kernel: 'nearest' })
    .ensureAlpha()
    .raw()
    .toBuffer();

  // Extract colors
  const allColors: Color[] = [];
  const rawPixels: Color[][] = [];
  for (let y = 0; y < targetHeight; y++) {
    rawPixels[y] = [];
    for (let x = 0; x < targetWidth; x++) {
      const i = (y * targetWidth + x) * 4;
      const color: Color = {
        r: resized[i],
        g: resized[i + 1],
        b: resized[i + 2],
        a: resized[i + 3],
      };
      rawPixels[y][x] = color;
      if (color.a > 20) {
        allColors.push({ ...color, a: 255 });
      }
    }
  }

  // Quantize
  const palette = medianCut(allColors, colorCount);

  // Map pixels to palette
  const pixels: Color[][] = [];
  for (let y = 0; y < targetHeight; y++) {
    pixels[y] = [];
    for (let x = 0; x < targetWidth; x++) {
      const c = rawPixels[y][x];
      if (c.a < 20) {
        pixels[y][x] = { ...TRANSPARENT };
      } else {
        pixels[y][x] = findClosestColor(c, palette);
      }
    }
  }

  // Create project with imported pixels
  const layer = createEmptyLayer('layer-1', 'Imported', targetWidth, targetHeight);
  layer.pixels = pixels;

  state = {
    width: targetWidth,
    height: targetHeight,
    frames: [{ id: 'frame-1', layers: [layer], duration: 100 }],
    activeFrameIndex: 0,
    activeLayerIndex: 0,
    palette,
  };

  return state;
}

// ── Export ──

export async function exportPng(scale: number = 1): Promise<string> {
  const s = getState();
  const w = s.width * scale;
  const h = s.height * scale;
  const buf = Buffer.alloc(w * h * 4, 0);

  const frame = s.frames[s.activeFrameIndex];
  for (const layer of frame.layers) {
    if (!layer.visible) continue;
    for (let y = 0; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) {
        const c = layer.pixels[y]?.[x];
        if (!c || c.a === 0) continue;
        const alpha = c.a / 255 * layer.opacity;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = x * scale + sx;
            const py = y * scale + sy;
            const i = (py * w + px) * 4;
            // Alpha compositing
            const dstA = buf[i + 3] / 255;
            const srcA = alpha;
            const outA = srcA + dstA * (1 - srcA);
            if (outA > 0) {
              buf[i] = Math.round((c.r * srcA + buf[i] * dstA * (1 - srcA)) / outA);
              buf[i + 1] = Math.round((c.g * srcA + buf[i + 1] * dstA * (1 - srcA)) / outA);
              buf[i + 2] = Math.round((c.b * srcA + buf[i + 2] * dstA * (1 - srcA)) / outA);
              buf[i + 3] = Math.round(outA * 255);
            }
          }
        }
      }
    }
  }

  const png = await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();

  return png.toString('base64');
}

export async function exportSpriteSheet(scale: number = 1): Promise<{ image: string; metadata: object }> {
  const s = getState();
  const cols = Math.ceil(Math.sqrt(s.frames.length));
  const rows = Math.ceil(s.frames.length / cols);
  const fw = s.width * scale;
  const fh = s.height * scale;
  const totalW = cols * fw;
  const totalH = rows * fh;
  const buf = Buffer.alloc(totalW * totalH * 4, 0);

  const frameData: Record<string, { x: number; y: number; w: number; h: number }> = {};

  for (let fi = 0; fi < s.frames.length; fi++) {
    const frame = s.frames[fi];
    const col = fi % cols;
    const row = Math.floor(fi / cols);
    const ox = col * fw;
    const oy = row * fh;

    for (const layer of frame.layers) {
      if (!layer.visible) continue;
      for (let y = 0; y < s.height; y++) {
        for (let x = 0; x < s.width; x++) {
          const c = layer.pixels[y]?.[x];
          if (!c || c.a === 0) continue;
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = ox + x * scale + sx;
              const py = oy + y * scale + sy;
              const i = (py * totalW + px) * 4;
              buf[i] = c.r;
              buf[i + 1] = c.g;
              buf[i + 2] = c.b;
              buf[i + 3] = Math.round(c.a * layer.opacity);
            }
          }
        }
      }
    }

    frameData[`frame_${fi}`] = { x: ox, y: oy, w: fw, h: fh };
  }

  const png = await sharp(buf, { raw: { width: totalW, height: totalH, channels: 4 } })
    .png()
    .toBuffer();

  return {
    image: png.toString('base64'),
    metadata: {
      frames: frameData,
      meta: {
        size: { w: totalW, h: totalH },
        frameSize: { w: fw, h: fh },
        scale,
      },
    },
  };
}
