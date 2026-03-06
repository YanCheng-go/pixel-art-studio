import type { Frame } from '../types';
import { useRef, useEffect } from 'react';

interface TimelineProps {
  frames: Frame[];
  activeFrameIndex: number;
  width: number;
  height: number;
  onSetActiveFrame: (index: number) => void;
  onAddFrame: () => void;
  onDuplicateFrame: () => void;
  onRemoveFrame: () => void;
}

function renderFrameThumbnail(
  canvas: HTMLCanvasElement,
  frame: Frame,
  width: number,
  height: number
) {
  const ctx = canvas.getContext('2d')!;
  const scale = Math.min(canvas.width / width, canvas.height / height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Checkerboard
  const cs = 4;
  for (let y = 0; y < canvas.height; y += cs) {
    for (let x = 0; x < canvas.width; x += cs) {
      ctx.fillStyle = ((x / cs + y / cs) % 2 === 0) ? '#666' : '#555';
      ctx.fillRect(x, y, cs, cs);
    }
  }

  for (const layer of frame.layers) {
    if (!layer.visible) continue;
    ctx.globalAlpha = layer.opacity;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const c = layer.pixels[y]?.[x];
        if (c && c.a > 0) {
          ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${c.a / 255})`;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

function FrameThumbnail({
  frame,
  width,
  height,
  active,
  index,
  onClick,
}: {
  frame: Frame;
  width: number;
  height: number;
  active: boolean;
  index: number;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderFrameThumbnail(canvasRef.current, frame, width, height);
    }
  }, [frame, width, height]);

  return (
    <div
      className={`timeline-frame ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <canvas ref={canvasRef} width={64} height={64} />
      <span className="frame-label">{index + 1}</span>
      {frame.tag && <span className="frame-tag">{frame.tag}</span>}
    </div>
  );
}

export function Timeline({
  frames,
  activeFrameIndex,
  width,
  height,
  onSetActiveFrame,
  onAddFrame,
  onDuplicateFrame,
  onRemoveFrame,
}: TimelineProps) {
  return (
    <div className="panel timeline-panel">
      <div className="panel-header">
        Timeline
        <div className="panel-actions">
          <button onClick={onAddFrame} title="New Frame" aria-label="Add frame">+</button>
          <button onClick={onDuplicateFrame} title="Duplicate Frame" aria-label="Duplicate frame">Dup</button>
          <button onClick={onRemoveFrame} title="Remove Frame" aria-label="Remove frame">-</button>
        </div>
      </div>
      <div className="timeline-frames">
        {frames.map((frame, i) => (
          <FrameThumbnail
            key={frame.id}
            frame={frame}
            width={width}
            height={height}
            active={i === activeFrameIndex}
            index={i}
            onClick={() => onSetActiveFrame(i)}
          />
        ))}
      </div>
    </div>
  );
}
