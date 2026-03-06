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
          <button onClick={onAddLayer} title="Add Layer">+</button>
          <button onClick={onRemoveLayer} title="Remove Layer">-</button>
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
              >
                {layer.visible ? 'V' : 'H'}
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
