const VERSION = '1.0.0';
const GITHUB_URL = 'https://github.com/YanCheng-go/pixel-art-studio';

interface AboutDialogProps {
  onClose: () => void;
}

export function AboutDialog({ onClose }: AboutDialogProps) {
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog about-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>About Pixel Art Studio</h3>

        <div className="about-version">
          v{VERSION} &middot;{' '}
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            GitHub &rarr;
          </a>
        </div>

        <div className="about-section">
          <h4>How to Use</h4>
          <ul className="about-list">
            <li><strong>Draw</strong> &mdash; Select Pencil (B) and click/drag on the canvas</li>
            <li><strong>Erase</strong> &mdash; Select Eraser (E) to remove pixels</li>
            <li><strong>Fill</strong> &mdash; Select Fill (G) to flood-fill an area</li>
            <li><strong>Color Pick</strong> &mdash; Select Picker (I) to sample a color from the canvas</li>
            <li><strong>Pan</strong> &mdash; Middle-click or Alt+click and drag to pan the canvas</li>
            <li><strong>Zoom</strong> &mdash; Scroll wheel to zoom in/out, or use +/- buttons</li>
            <li><strong>Grid</strong> &mdash; Toggle pixel grid overlay (visible at zoom 4x+)</li>
            <li><strong>Symmetry</strong> &mdash; Toggle X-axis mirror drawing</li>
            <li><strong>Onion Skinning</strong> &mdash; Show previous frame as ghost overlay</li>
            <li><strong>Undo/Redo</strong> &mdash; Ctrl+Z / Ctrl+Y (up to 100 steps)</li>
          </ul>
        </div>

        <div className="about-section">
          <h4>Import &amp; Export</h4>
          <ul className="about-list">
            <li><strong>Load Image</strong> &mdash; Import any image, auto-pixelized with color quantization. Drag &amp; drop also supported.</li>
            <li><strong>AI Generate</strong> &mdash; Use your own Gemini API key to generate pixel art from text prompts</li>
            <li><strong>PNG</strong> &mdash; Export current frame as PNG</li>
            <li><strong>Sprite Sheet</strong> &mdash; Export all frames as a sprite sheet (PNG + JSON metadata)</li>
          </ul>
        </div>

        <div className="about-section">
          <h4>Layers &amp; Animation</h4>
          <ul className="about-list">
            <li><strong>Layers</strong> &mdash; Add multiple layers per frame, toggle visibility, rendered bottom-to-top</li>
            <li><strong>Timeline</strong> &mdash; Add, duplicate, and remove frames for animation</li>
            <li><strong>Preview</strong> &mdash; Play back animation with per-frame duration</li>
          </ul>
        </div>

        <div className="about-section">
          <h4>MCP Integration</h4>
          <p className="about-text">
            Pixel Art Studio does not currently include an MCP (Model Context Protocol) server.
            The app runs entirely client-side in your browser &mdash; no backend is needed.
          </p>
          <p className="about-text">
            For AI-powered pixel art generation, we use the Gemini API directly from the browser
            with your own API key. This means no server costs and your key stays on your device
            (stored in localStorage).
          </p>
          <p className="about-text">
            A future MCP server could enable AI agents (e.g. Claude, Cursor) to programmatically
            create and edit pixel art, manage sprite sheets, and automate asset pipelines. If you're
            interested in this feature, please open an issue on{' '}
            <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>.
          </p>
        </div>

        <div className="about-section about-footer-info">
          <p className="about-text">
            Built with React + TypeScript + Vite. Licensed under CC BY 4.0.
          </p>
          <p className="about-text">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              {GITHUB_URL}
            </a>
          </p>
        </div>

        <div className="dialog-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
