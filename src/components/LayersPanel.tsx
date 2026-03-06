import type { Layer } from '../types';

interface LayersPanelProps {
  layers: Layer[];
  activeLayerIndex: number;
  onSetActiveLayer: (index: number) => void;
  onToggleVisibility: (index: number) => void;
  onAddLayer: () => void;
  onRemoveLayer: () => void;
}

export function LayersPanel({
  layers,
  activeLayerIndex,
  onSetActiveLayer,
  onToggleVisibility,
  onAddLayer,
  onRemoveLayer,
}: LayersPanelProps) {
  return (
    <div className="panel layers-panel">
      <div className="panel-header">
        Layers
        <div className="panel-actions">
          <button onClick={onAddLayer} title="Add Layer" aria-label="Add layer">+</button>
          <button onClick={onRemoveLayer} title="Remove Layer" aria-label="Remove layer">-</button>
        </div>
      </div>
      <div className="layers-list">
        {[...layers].reverse().map((layer, revIdx) => {
          const idx = layers.length - 1 - revIdx;
          return (
            <div
              key={layer.id}
              className={`layer-item ${idx === activeLayerIndex ? 'active' : ''}`}
              onClick={() => onSetActiveLayer(idx)}
            >
              <button
                className={`layer-visibility ${layer.visible ? 'visible' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility(idx);
                }}
                aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
              >
                {layer.visible ? '\u25C9' : '\u25CE'}
              </button>
              <span className="layer-name">{layer.name}</span>
              {layer.locked && <span className="layer-lock">L</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
