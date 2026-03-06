import { type Color, colorToHex, hexToColor, colorsEqual } from '../types';

interface PalettePanelProps {
  palette: Color[];
  activeColor: Color;
  onSetColor: (color: Color) => void;
  onAddToPalette: (color: Color) => void;
}

export function PalettePanel({
  palette,
  activeColor,
  onSetColor,
  onAddToPalette,
}: PalettePanelProps) {
  return (
    <div className="panel palette-panel">
      <div className="panel-header">Palette</div>
      <div className="palette-current">
        <div
          className="palette-current-swatch"
          style={{ backgroundColor: colorToHex(activeColor) }}
        />
        <input
          type="color"
          value={colorToHex(activeColor)}
          onChange={(e) => onSetColor(hexToColor(e.target.value))}
        />
      </div>
      <div className="palette-grid">
        {palette.map((color, i) => (
          <button
            key={i}
            className={`palette-swatch ${
              colorsEqual(color, activeColor) ? 'active' : ''
            }`}
            style={{ backgroundColor: colorToHex(color) }}
            onClick={() => onSetColor(color)}
            title={colorToHex(color)}
          />
        ))}
        <button
          className="palette-swatch palette-add"
          onClick={() => onAddToPalette(activeColor)}
          title="Add current color to palette"
        >
          +
        </button>
      </div>
    </div>
  );
}
