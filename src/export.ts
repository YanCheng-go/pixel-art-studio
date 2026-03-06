import { type Frame, colorToString } from './types';

function renderFrameToCanvas(
  frame: Frame,
  width: number,
  height: number,
  scale: number = 1
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;

  for (const layer of frame.layers) {
    if (!layer.visible) continue;
    ctx.globalAlpha = layer.opacity;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const c = layer.pixels[y]?.[x];
        if (c && c.a > 0) {
          ctx.fillStyle = colorToString(c);
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  return canvas;
}

export function exportFrameAsPng(
  frame: Frame,
  width: number,
  height: number,
  scale: number = 1,
  filename: string = 'sprite.png'
) {
  const canvas = renderFrameToCanvas(frame, width, height, scale);
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function exportSpriteSheet(
  frames: Frame[],
  width: number,
  height: number,
  scale: number = 1,
  filename: string = 'spritesheet'
) {
  const cols = Math.ceil(Math.sqrt(frames.length));
  const rows = Math.ceil(frames.length / cols);

  const canvas = document.createElement('canvas');
  canvas.width = cols * width * scale;
  canvas.height = rows * height * scale;
  const ctx = canvas.getContext('2d')!;

  const frameData: Record<
    string,
    { x: number; y: number; w: number; h: number }
  > = {};
  const animations: Record<string, string[]> = {};

  frames.forEach((frame, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const frameCanvas = renderFrameToCanvas(frame, width, height, scale);
    ctx.drawImage(frameCanvas, col * width * scale, row * height * scale);

    const frameName = `frame_${i}`;
    frameData[frameName] = {
      x: col * width * scale,
      y: row * height * scale,
      w: width * scale,
      h: height * scale,
    };

    const tag = frame.tag || 'default';
    if (!animations[tag]) animations[tag] = [];
    animations[tag].push(frameName);
  });

  // Export PNG
  const pngLink = document.createElement('a');
  pngLink.download = `${filename}.png`;
  pngLink.href = canvas.toDataURL('image/png');
  pngLink.click();

  // Export JSON
  const json = {
    frames: frameData,
    animations,
    meta: {
      size: { w: canvas.width, h: canvas.height },
      frameSize: { w: width * scale, h: height * scale },
      scale,
    },
  };
  const jsonBlob = new Blob([JSON.stringify(json, null, 2)], {
    type: 'application/json',
  });
  const jsonLink = document.createElement('a');
  jsonLink.download = `${filename}.json`;
  const jsonUrl = URL.createObjectURL(jsonBlob);
  jsonLink.href = jsonUrl;
  jsonLink.click();
  URL.revokeObjectURL(jsonUrl);
}

export function exportGif(
  frames: Frame[],
  width: number,
  height: number,
  scale: number = 2
): Promise<void> {
  // Simple GIF export using canvas frames
  // For a proper GIF we'd need a library like gif.js
  // For now, export as animated PNG alternative - individual frames
  return new Promise((resolve) => {
    frames.forEach((frame, i) => {
      exportFrameAsPng(frame, width, height, scale, `frame_${i}.png`);
    });
    resolve();
  });
}
