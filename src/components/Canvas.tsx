import { useRef, useEffect, useCallback, useState } from 'react';
import { type Color, TRANSPARENT } from '../types';

interface CanvasProps {
  width: number;
  height: number;
  frames: import('../types').Frame[];
  activeFrameIndex: number;
  activeLayerIndex: number;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  activeTool: import('../types').Tool;
  activeColor: Color;
  symmetryX: boolean;
  onionSkinning: boolean;
  onSetPixel: (x: number, y: number, color: Color) => void;
  onFloodFill: (x: number, y: number, color: Color) => void;
  onColorPick: (color: Color) => void;
  onZoom: (zoom: number) => void;
  onPan: (x: number, y: number) => void;
  onPushHistory: () => void;
}

function parseHexToRGB(hex: string): [number, number, number] {
  hex = hex.replace('#', '').trim();
  if (hex.length < 6) return [0, 0, 0];
  return [
    parseInt(hex.slice(0, 2), 16) || 0,
    parseInt(hex.slice(2, 4), 16) || 0,
    parseInt(hex.slice(4, 6), 16) || 0,
  ];
}

function bresenhamLine(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const points: [number, number][] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let cx = x0, cy = y0;
  while (true) {
    points.push([cx, cy]);
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
  return points;
}

interface CachedCSS {
  canvasBg: string;
  checkerLightRGB: [number, number, number];
  checkerDarkRGB: [number, number, number];
}

function readCSSVars(): CachedCSS {
  const style = getComputedStyle(document.documentElement);
  const bg = style.getPropertyValue('--canvas-bg').trim() || '#0a0a0a';
  const cl = style.getPropertyValue('--checker-light').trim() || '#cccccc';
  const cd = style.getPropertyValue('--checker-dark').trim() || '#999999';
  return {
    canvasBg: bg,
    checkerLightRGB: parseHexToRGB(cl),
    checkerDarkRGB: parseHexToRGB(cd),
  };
}

export function Canvas({
  width,
  height,
  frames,
  activeFrameIndex,
  activeLayerIndex,
  zoom,
  panX,
  panY,
  showGrid,
  activeTool,
  activeColor,
  symmetryX,
  onionSkinning,
  onSetPixel,
  onFloodFill,
  onColorPick,
  onZoom,
  onPan,
  onPushHistory,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const cssVarsRef = useRef<CachedCSS>(readCSSVars());
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const lastPixelRef = useRef({ x: -1, y: -1 });
  const hoverPixelRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | undefined>(undefined);

  const getPixelCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const canvasCenterX = rect.width / 2;
      const canvasCenterY = rect.height / 2;
      const gridWidth = width * zoom;
      const gridHeight = height * zoom;
      const gridLeft = canvasCenterX - gridWidth / 2 + panX;
      const gridTop = canvasCenterY - gridHeight / 2 + panY;
      const relX = clientX - rect.left - gridLeft;
      const relY = clientY - rect.top - gridTop;
      const px = Math.floor(relX / zoom);
      const py = Math.floor(relY / zoom);
      if (px < 0 || px >= width || py < 0 || py >= height) return null;
      return { x: px, y: py };
    },
    [width, height, zoom, panX, panY]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    const { canvasBg, checkerLightRGB, checkerDarkRGB } = cssVarsRef.current;

    // Background
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    const centerX = displayWidth / 2;
    const centerY = displayHeight / 2;
    const gridWidth = width * zoom;
    const gridHeight = height * zoom;
    const offsetX = centerX - gridWidth / 2 + panX;
    const offsetY = centerY - gridHeight / 2 + panY;

    // Render pixels to offscreen canvas via ImageData, then blit scaled
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas');
    }
    const offscreen = offscreenRef.current;
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d')!;
    const imgData = offCtx.createImageData(width, height);
    const data = imgData.data;

    // Fill checkerboard
    const [clR, clG, clB] = checkerLightRGB;
    const [cdR, cdG, cdB] = checkerDarkRGB;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const isLight = (x + y) % 2 === 0;
        data[i] = isLight ? clR : cdR;
        data[i + 1] = isLight ? clG : cdG;
        data[i + 2] = isLight ? clB : cdB;
        data[i + 3] = 255;
      }
    }

    const frame = frames[activeFrameIndex];

    // Onion skinning - previous frame
    if (frame && onionSkinning && activeFrameIndex > 0) {
      const prevFrame = frames[activeFrameIndex - 1];
      for (const layer of prevFrame.layers) {
        if (!layer.visible) continue;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const c = layer.pixels[y]?.[x];
            if (c && c.a > 0) {
              const i = (y * width + x) * 4;
              const srcA = (c.a / 255) * 0.2 * 0.3;
              const dstA = data[i + 3] / 255;
              const outA = srcA + dstA * (1 - srcA);
              if (outA > 0) {
                data[i] = (255 * srcA + data[i] * dstA * (1 - srcA)) / outA;
                data[i + 1] = (0 * srcA + data[i + 1] * dstA * (1 - srcA)) / outA;
                data[i + 2] = (0 * srcA + data[i + 2] * dstA * (1 - srcA)) / outA;
                data[i + 3] = outA * 255;
              }
            }
          }
        }
      }
    }

    // Composite layers bottom to top
    if (frame) {
      for (let li = 0; li < frame.layers.length; li++) {
        const layer = frame.layers[li];
        if (!layer.visible) continue;
        const layerAlpha = layer.opacity;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const c = layer.pixels[y]?.[x];
            if (c && c.a > 0) {
              const i = (y * width + x) * 4;
              const srcA = (c.a / 255) * layerAlpha;
              const dstA = data[i + 3] / 255;
              const outA = srcA + dstA * (1 - srcA);
              if (outA > 0) {
                data[i] = (c.r * srcA + data[i] * dstA * (1 - srcA)) / outA;
                data[i + 1] = (c.g * srcA + data[i + 1] * dstA * (1 - srcA)) / outA;
                data[i + 2] = (c.b * srcA + data[i + 2] * dstA * (1 - srcA)) / outA;
                data[i + 3] = outA * 255;
              }
            }
          }
        }
      }
    }

    offCtx.putImageData(imgData, 0, 0);

    // Blit offscreen to main canvas with nearest-neighbor scaling
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, offsetX, offsetY, gridWidth, gridHeight);

    // Grid overlay
    if (showGrid && zoom >= 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(offsetX + x * zoom + 0.5, offsetY + 0.5);
        ctx.lineTo(offsetX + x * zoom + 0.5, offsetY + gridHeight + 0.5);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(offsetX + 0.5, offsetY + y * zoom + 0.5);
        ctx.lineTo(offsetX + gridWidth + 0.5, offsetY + y * zoom + 0.5);
        ctx.stroke();
      }
    }

    // Symmetry line
    if (symmetryX) {
      ctx.strokeStyle = 'rgba(0,200,255,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      const midX = offsetX + gridWidth / 2;
      ctx.beginPath();
      ctx.moveTo(midX, offsetY);
      ctx.lineTo(midX, offsetY + gridHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, gridWidth, gridHeight);

    // Hover highlight
    const hover = hoverPixelRef.current;
    if (hover && zoom >= 2) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        offsetX + hover.x * zoom + 0.5,
        offsetY + hover.y * zoom + 0.5,
        zoom - 1,
        zoom - 1
      );
      // Mirror highlight
      if (symmetryX) {
        const mirrorX = width - 1 - hover.x;
        if (mirrorX !== hover.x) {
          ctx.strokeStyle = 'rgba(0,200,255,0.35)';
          ctx.strokeRect(
            offsetX + mirrorX * zoom + 0.5,
            offsetY + hover.y * zoom + 0.5,
            zoom - 1,
            zoom - 1
          );
        }
      }
    }
  }, [
    width,
    height,
    frames,
    activeFrameIndex,
    activeLayerIndex,
    zoom,
    panX,
    panY,
    showGrid,
    symmetryX,
    onionSkinning,
  ]);

  // Store draw in a ref so event handlers always call the latest version
  const drawRef = useRef(draw);
  drawRef.current = draw;

  const requestDraw = useCallback(() => {
    if (rafIdRef.current !== undefined) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = undefined;
      drawRef.current();
    });
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  // Refresh cached CSS vars on theme change
  useEffect(() => {
    const refresh = () => {
      cssVarsRef.current = readCSSVars();
      drawRef.current();
    };
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => drawRef.current());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const applyTool = useCallback(
    (x: number, y: number) => {
      const frame = frames[activeFrameIndex];
      const layer = frame?.layers[activeLayerIndex];
      if (!layer) return;

      switch (activeTool) {
        case 'pencil':
          onSetPixel(x, y, activeColor);
          break;
        case 'eraser':
          onSetPixel(x, y, TRANSPARENT);
          break;
        case 'fill':
          onFloodFill(x, y, activeColor);
          break;
        case 'colorPicker': {
          const c = layer.pixels[y]?.[x];
          if (c) onColorPick(c);
          break;
        }
      }
    },
    [
      frames,
      activeFrameIndex,
      activeLayerIndex,
      activeTool,
      activeColor,
      onSetPixel,
      onFloodFill,
      onColorPick,
    ]
  );

  const canToolModify = useCallback(
    () => {
      const frame = frames[activeFrameIndex];
      const layer = frame?.layers[activeLayerIndex];
      if (!layer || layer.locked || !layer.visible) return false;
      if (activeTool === 'colorPicker') return false;
      return true;
    },
    [frames, activeFrameIndex, activeLayerIndex, activeTool]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        lastPanRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      if (e.button === 0) {
        const coords = getPixelCoords(e.clientX, e.clientY);
        if (coords) {
          if (canToolModify()) {
            onPushHistory();
          }
          setIsDrawing(true);
          lastPixelRef.current = coords;
          applyTool(coords.x, coords.y);
        }
      }
    },
    [getPixelCoords, applyTool, onPushHistory, canToolModify]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Update hover position
      const coords = getPixelCoords(e.clientX, e.clientY);
      const prev = hoverPixelRef.current;
      if (coords?.x !== prev?.x || coords?.y !== prev?.y) {
        hoverPixelRef.current = coords;
        if (!isPanning && !isDrawing) {
          requestDraw();
        }
      }

      if (isPanning) {
        const dx = e.clientX - lastPanRef.current.x;
        const dy = e.clientY - lastPanRef.current.y;
        lastPanRef.current = { x: e.clientX, y: e.clientY };
        onPan(panX + dx, panY + dy);
        return;
      }
      if (isDrawing) {
        if (
          coords &&
          (coords.x !== lastPixelRef.current.x ||
            coords.y !== lastPixelRef.current.y)
        ) {
          // Bresenham line interpolation to avoid gaps
          if (activeTool === 'pencil' || activeTool === 'eraser') {
            const points = bresenhamLine(
              lastPixelRef.current.x,
              lastPixelRef.current.y,
              coords.x,
              coords.y
            );
            // Skip first point (already drawn)
            for (let i = 1; i < points.length; i++) {
              applyTool(points[i][0], points[i][1]);
            }
          }
          lastPixelRef.current = coords;
        }
      }
    },
    [
      isPanning,
      isDrawing,
      getPixelCoords,
      activeTool,
      applyTool,
      onPan,
      panX,
      panY,
      requestDraw,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsDrawing(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    setIsDrawing(false);
    hoverPixelRef.current = null;
    requestDraw();
  }, [requestDraw]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      const newZoom = Math.max(1, Math.min(64, zoom + delta * Math.max(1, Math.floor(zoom / 4))));
      onZoom(newZoom);
    },
    [zoom, onZoom]
  );

  const cursor =
    activeTool === 'colorPicker'
      ? 'crosshair'
      : activeTool === 'fill'
      ? 'cell'
      : activeTool === 'eraser'
      ? 'crosshair'
      : 'crosshair';

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', cursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
