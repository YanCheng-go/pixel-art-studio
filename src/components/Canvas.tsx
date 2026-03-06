import { useRef, useEffect, useCallback, useState } from 'react';
import { type Color, TRANSPARENT, colorToString } from '../types';

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

function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const lastPixelRef = useRef({ x: -1, y: -1 });
  const hasDrawnRef = useRef(false);

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

    // Background
    ctx.fillStyle = getCSSVar('--canvas-bg') || '#0a0a0a';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    const centerX = displayWidth / 2;
    const centerY = displayHeight / 2;
    const gridWidth = width * zoom;
    const gridHeight = height * zoom;
    const offsetX = centerX - gridWidth / 2 + panX;
    const offsetY = centerY - gridHeight / 2 + panY;

    const checkerLight = getCSSVar('--checker-light') || '#cccccc';
    const checkerDark = getCSSVar('--checker-dark') || '#999999';

    // Checkerboard background (transparency indicator)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isLight = (x + y) % 2 === 0;
        ctx.fillStyle = isLight ? checkerLight : checkerDark;
        ctx.fillRect(offsetX + x * zoom, offsetY + y * zoom, zoom, zoom);
      }
    }

    const frame = frames[activeFrameIndex];
    if (!frame) return;

    // Onion skinning - previous frame
    if (onionSkinning && activeFrameIndex > 0) {
      const prevFrame = frames[activeFrameIndex - 1];
      ctx.globalAlpha = 0.2;
      for (const layer of prevFrame.layers) {
        if (!layer.visible) continue;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const c = layer.pixels[y]?.[x];
            if (c && c.a > 0) {
              ctx.fillStyle = `rgba(255,0,0,${(c.a / 255) * 0.3})`;
              ctx.fillRect(
                offsetX + x * zoom,
                offsetY + y * zoom,
                zoom,
                zoom
              );
            }
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // Draw layers bottom to top
    for (let li = 0; li < frame.layers.length; li++) {
      const layer = frame.layers[li];
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const c = layer.pixels[y]?.[x];
          if (c && c.a > 0) {
            ctx.fillStyle = colorToString(c);
            ctx.fillRect(
              offsetX + x * zoom,
              offsetY + y * zoom,
              zoom,
              zoom
            );
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // Grid
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

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

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
          onPushHistory();
          hasDrawnRef.current = true;
          setIsDrawing(true);
          lastPixelRef.current = coords;
          applyTool(coords.x, coords.y);
        }
      }
    },
    [getPixelCoords, applyTool, onPushHistory]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - lastPanRef.current.x;
        const dy = e.clientY - lastPanRef.current.y;
        lastPanRef.current = { x: e.clientX, y: e.clientY };
        onPan(panX + dx, panY + dy);
        return;
      }
      if (isDrawing) {
        const coords = getPixelCoords(e.clientX, e.clientY);
        if (
          coords &&
          (coords.x !== lastPixelRef.current.x ||
            coords.y !== lastPixelRef.current.y)
        ) {
          lastPixelRef.current = coords;
          if (activeTool === 'pencil' || activeTool === 'eraser') {
            applyTool(coords.x, coords.y);
          }
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
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsDrawing(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      const newZoom = Math.max(1, Math.min(64, zoom + delta * Math.max(1, Math.floor(zoom / 4))));
      onZoom(newZoom);
    },
    [zoom, onZoom]
  );

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        cursor:
          activeTool === 'colorPicker'
            ? 'crosshair'
            : activeTool === 'fill'
            ? 'cell'
            : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
