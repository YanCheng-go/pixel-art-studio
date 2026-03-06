const VERSION = '1.1.0';
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
          <h4>MCP Server</h4>
          <p className="about-text">
            Pixel Art Studio includes an MCP (Model Context Protocol) server that lets AI agents
            (Claude, Cursor, etc.) programmatically create, edit, and export pixel art.
          </p>
          <p className="about-text">
            <strong>22 tools:</strong> create projects, import/pixelize images, draw (pixel, line,
            rect, circle, flood fill), manage layers and animation frames, export PNG and sprite sheets.
          </p>
          <p className="about-text">
            Setup: <code>cd mcp-server &amp;&amp; npm install &amp;&amp; npm run build</code>
            &mdash; then add to your Claude Code config. See{' '}
            <a href={`${GITHUB_URL}/tree/master/mcp-server`} target="_blank" rel="noopener noreferrer">
              mcp-server/README.md
            </a>{' '}
            for full docs.
          </p>
          <p className="about-text">
            The web editor also supports client-side AI generation via Gemini API
            (bring your own key, stored in localStorage).
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
