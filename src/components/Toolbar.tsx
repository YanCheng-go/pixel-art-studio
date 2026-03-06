import type { Tool } from '../types';

interface ToolbarProps {
  activeTool: Tool;
  showGrid: boolean;
  symmetryX: boolean;
  onionSkinning: boolean;
  zoom: number;
  onSetTool: (tool: Tool) => void;
  onToggleGrid: () => void;
  onToggleSymmetry: () => void;
  onToggleOnionSkinning: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoom: (zoom: number) => void;
  onLoadImage: () => void;
  onExportPng: () => void;
  onExportSpriteSheet: () => void;
  onNewProject: () => void;
}

const tools: { id: Tool; label: string; shortcut: string }[] = [
  { id: 'pencil', label: 'Pencil', shortcut: 'B' },
  { id: 'eraser', label: 'Eraser', shortcut: 'E' },
  { id: 'fill', label: 'Fill', shortcut: 'G' },
  { id: 'colorPicker', label: 'Picker', shortcut: 'I' },
];

export function Toolbar({
  activeTool,
  showGrid,
  symmetryX,
  onionSkinning,
  zoom,
  onSetTool,
  onToggleGrid,
  onToggleSymmetry,
  onToggleOnionSkinning,
  onUndo,
  onRedo,
  onZoom,
  onLoadImage,
  onExportPng,
  onExportSpriteSheet,
  onNewProject,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onNewProject} title="New Project">
          New
        </button>
        <button className="toolbar-btn" onClick={onLoadImage} title="Load Image">
          Load
        </button>
        <div className="toolbar-separator" />
        <button className="toolbar-btn" onClick={onExportPng} title="Export PNG">
          PNG
        </button>
        <button className="toolbar-btn" onClick={onExportSpriteSheet} title="Export Sprite Sheet">
          Sheet
        </button>
      </div>

      <div className="toolbar-group">
        {tools.map((t) => (
          <button
            key={t.id}
            className={`toolbar-btn ${activeTool === t.id ? 'active' : ''}`}
            onClick={() => onSetTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onUndo} title="Undo (Ctrl+Z)">
          Undo
        </button>
        <button className="toolbar-btn" onClick={onRedo} title="Redo (Ctrl+Y)">
          Redo
        </button>
      </div>

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${showGrid ? 'active' : ''}`}
          onClick={onToggleGrid}
          title="Toggle Grid"
        >
          Grid
        </button>
        <button
          className={`toolbar-btn ${symmetryX ? 'active' : ''}`}
          onClick={onToggleSymmetry}
          title="Symmetry X"
        >
          Sym
        </button>
        <button
          className={`toolbar-btn ${onionSkinning ? 'active' : ''}`}
          onClick={onToggleOnionSkinning}
          title="Onion Skinning"
        >
          Onion
        </button>
      </div>

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={() => onZoom(zoom - 2)} title="Zoom Out">
          -
        </button>
        <span className="toolbar-label">{zoom}x</span>
        <button className="toolbar-btn" onClick={() => onZoom(zoom + 2)} title="Zoom In">
          +
        </button>
      </div>
    </div>
  );
}
