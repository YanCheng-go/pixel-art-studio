import { type Color, cloneColor } from './types';

export interface PixelizeOptions {
  targetWidth: number;
  targetHeight: number;
  colorCount: number;
  smoothing: boolean;
}

function colorDistance(a: Color, b: Color): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

// Median cut color quantization
function medianCut(colors: Color[], targetCount: number): Color[] {
  if (colors.length <= targetCount) return colors;

  type Bucket = Color[];
  let buckets: Bucket[] = [colors];

  while (buckets.length < targetCount) {
    // Find bucket with largest color range
    let maxRange = -1;
    let maxBucketIdx = 0;
    let splitChannel: 'r' | 'g' | 'b' = 'r';

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      for (const ch of ['r', 'g', 'b'] as const) {
        const values = bucket.map((c) => c[ch]);
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

  // Average each bucket
  return buckets.map((bucket) => {
    if (bucket.length === 0) return { r: 0, g: 0, b: 0, a: 255 };
    const sum = bucket.reduce(
      (acc, c) => ({
        r: acc.r + c.r,
        g: acc.g + c.g,
        b: acc.b + c.b,
        a: acc.a + c.a,
      }),
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
    const d = colorDistance(color, p);
    if (d < minDist) {
      minDist = d;
      closest = p;
    }
  }
  return cloneColor(closest);
}

export function pixelizeImageData(
  imageData: ImageData,
  options: PixelizeOptions
): { pixels: Color[][]; palette: Color[] } {
  const { targetWidth, targetHeight, colorCount, smoothing } = options;

  // Step 1: Downscale
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(imageData, 0, 0);

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = targetWidth;
  dstCanvas.height = targetHeight;
  const dstCtx = dstCanvas.getContext('2d')!;
  dstCtx.imageSmoothingEnabled = smoothing;
  dstCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);

  const downscaled = dstCtx.getImageData(0, 0, targetWidth, targetHeight);

  // Step 2: Extract colors (skip transparent pixels)
  const allColors: Color[] = [];
  for (let i = 0; i < downscaled.data.length; i += 4) {
    if (downscaled.data[i + 3] > 20) {
      allColors.push({
        r: downscaled.data[i],
        g: downscaled.data[i + 1],
        b: downscaled.data[i + 2],
        a: 255,
      });
    }
  }

  // Step 3: Quantize colors
  const palette = medianCut(allColors, colorCount);

  // Step 4: Map each pixel to closest palette color
  const pixels: Color[][] = [];
  for (let y = 0; y < targetHeight; y++) {
    pixels[y] = [];
    for (let x = 0; x < targetWidth; x++) {
      const i = (y * targetWidth + x) * 4;
      const a = downscaled.data[i + 3];
      if (a < 20) {
        pixels[y][x] = { r: 0, g: 0, b: 0, a: 0 };
      } else {
        const color: Color = {
          r: downscaled.data[i],
          g: downscaled.data[i + 1],
          b: downscaled.data[i + 2],
          a: 255,
        };
        pixels[y][x] = findClosestColor(color, palette);
      }
    }
  }

  return { pixels, palette };
}
