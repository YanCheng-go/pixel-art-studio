import { useRef, useEffect, useState, useCallback } from 'react';
import { type Frame, colorToString } from '../types';

interface PreviewProps {
  frames: Frame[];
  activeFrameIndex: number;
  width: number;
  height: number;
}

export function Preview({ frames, activeFrameIndex, width, height }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const animRef = useRef<number>(undefined);

  const renderFrame = useCallback(
    (canvas: HTMLCanvasElement, frameIndex: number) => {
      const ctx = canvas.getContext('2d')!;
      const scale = Math.min(canvas.width / width, canvas.height / height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cs = Math.max(2, Math.floor(scale / 2));
      for (let y = 0; y < canvas.height; y += cs) {
        for (let x = 0; x < canvas.width; x += cs) {
          ctx.fillStyle = ((x / cs + y / cs) % 2 === 0) ? '#444' : '#333';
          ctx.fillRect(x, y, cs, cs);
        }
      }

      const frame = frames[frameIndex];
      if (!frame) return;

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
    },
    [frames, width, height]
  );

  useEffect(() => {
    if (canvasRef.current && !isPlaying) {
      renderFrame(canvasRef.current, activeFrameIndex);
    }
  }, [renderFrame, activeFrameIndex, isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    let currentFrame = 0;
    let lastTime = 0;

    const animate = (time: number) => {
      if (!lastTime) lastTime = time;
      const frame = frames[currentFrame];
      const duration = frame?.duration || 100;

      if (time - lastTime >= duration) {
        lastTime = time;
        currentFrame = (currentFrame + 1) % frames.length;
        if (canvasRef.current) {
          renderFrame(canvasRef.current, currentFrame);
        }
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, frames, renderFrame]);

  return (
    <div className="panel preview-panel">
      <div className="panel-header">
        Preview (1x)
        {frames.length > 1 && (
          <button
            className={`toolbar-btn small ${isPlaying ? 'active' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? 'Stop' : 'Play'}
          </button>
        )}
      </div>
      <div className="preview-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={Math.max(width * 2, 128)}
          height={Math.max(height * 2, 128)}
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    </div>
  );
}
