import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectStore } from './store';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { PalettePanel } from './components/PalettePanel';
import { LayersPanel } from './components/LayersPanel';
import { Timeline } from './components/Timeline';
import { Preview } from './components/Preview';
import { exportFrameAsPng, exportSpriteSheet } from './export';
import { pixelizeImageData, type PixelizeOptions } from './pixelize';
import {
  generatePixelArt,
  base64ToImageData,
  getStoredApiKey,
  storeApiKey,
} from './gemini';
import './App.css';

// Apply saved theme on load
const savedTheme = localStorage.getItem('pixel-art-theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function App() {
  const store = useProjectStore();
  const { state } = store;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showPixelizeDialog, setShowPixelizeDialog] = useState(false);
  const [pendingImage, setPendingImage] = useState<ImageData | null>(null);
  const [pixelizeOptions, setPixelizeOptions] = useState<PixelizeOptions>({
    targetWidth: 32,
    targetHeight: 32,
    colorCount: 16,
    smoothing: false,
  });
  const [newSize, setNewSize] = useState({ w: 32, h: 32 });
  const [newSizeLockRatio, setNewSizeLockRatio] = useState(false);
  const [keepRatio, setKeepRatio] = useState(true);
  const imageAspectRef = useRef(1);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiApiKey, setAiApiKey] = useState(getStoredApiKey);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReferenceImage, setAiReferenceImage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPixelizeWidth, setAiPixelizeWidth] = useState(32);
  const [aiPixelizeHeight, setAiPixelizeHeight] = useState(32);
  const [aiColorCount, setAiColorCount] = useState(16);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) store.redo();
          else store.undo();
        }
        if (e.key === 'y') {
          e.preventDefault();
          store.redo();
        }
      } else {
        switch (e.key.toLowerCase()) {
          case 'b': store.setTool('pencil'); break;
          case 'e': store.setTool('eraser'); break;
          case 'g': store.setTool('fill'); break;
          case 'i': store.setTool('colorPicker'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [store]);

  // Drag and drop
  const loadImageFile = useCallback((file: File) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      // Pre-downscale to avoid browser canvas size limits
      const maxIntermediate = 2048;
      let iw = w, ih = h;
      if (w > maxIntermediate || h > maxIntermediate) {
        const scale = maxIntermediate / Math.max(w, h);
        iw = Math.round(w * scale);
        ih = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = iw;
      canvas.height = ih;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, iw, ih);
      const imageData = ctx.getImageData(0, 0, iw, ih);
      setPendingImage(imageData);

      const maxDim = 256;
      const aspect = w / h;
      let tw: number, th: number;
      if (aspect >= 1) {
        tw = Math.min(maxDim, img.width);
        th = Math.round(tw / aspect);
      } else {
        th = Math.min(maxDim, img.height);
        tw = Math.round(th * aspect);
      }
      // Clamp to reasonable range
      tw = Math.max(8, Math.min(256, tw));
      th = Math.max(8, Math.min(256, th));
      imageAspectRef.current = w / h;

      setPixelizeOptions((o) => ({ ...o, targetWidth: tw, targetHeight: th }));
      setKeepRatio(true);
      setShowPixelizeDialog(true);
    };
    img.src = URL.createObjectURL(file);
  }, []);

  useEffect(() => {
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (file && file.type.startsWith('image/')) {
        loadImageFile(file);
      }
    };
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, [loadImageFile]);

  const handleLoadImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadImageFile(file);
      e.target.value = '';
    },
    [loadImageFile]
  );

  const handlePixelize = useCallback(() => {
    if (!pendingImage) return;
    const { pixels, palette } = pixelizeImageData(pendingImage, pixelizeOptions);

    store.newProject(pixelizeOptions.targetWidth, pixelizeOptions.targetHeight);

    store.setState((s) => {
      const newFrames = s.frames.map((f, fi) => {
        if (fi !== 0) return f;
        return {
          ...f,
          layers: f.layers.map((l, li) => {
            if (li !== 0) return l;
            return { ...l, pixels, name: 'Imported' };
          }),
        };
      });
      return { ...s, frames: newFrames, palette };
    });

    setPendingImage(null);
    setShowPixelizeDialog(false);
  }, [pendingImage, pixelizeOptions, store]);

  const handleLoadRaw = useCallback(() => {
    if (!pendingImage) return;
    store.loadImageToLayer(
      pendingImage,
      pixelizeOptions.targetWidth,
      pixelizeOptions.targetHeight
    );
    setPendingImage(null);
    setShowPixelizeDialog(false);
  }, [pendingImage, pixelizeOptions, store]);

  const handleExportPng = useCallback(() => {
    const frame = state.frames[state.activeFrameIndex];
    if (frame) exportFrameAsPng(frame, state.width, state.height, 1);
  }, [state]);

  const handleExportSpriteSheet = useCallback(() => {
    exportSpriteSheet(state.frames, state.width, state.height, 1);
  }, [state]);

  const handleNewProject = useCallback(() => {
    setShowNewDialog(true);
  }, []);

  const handleCreateNew = useCallback(() => {
    store.newProject(newSize.w, newSize.h);
    setShowNewDialog(false);
  }, [newSize, store]);

  const handleAiGenerate = useCallback(async () => {
    if (!aiApiKey.trim() || !aiPrompt.trim()) return;
    storeApiKey(aiApiKey.trim());
    setAiLoading(true);
    setAiError(null);
    try {
      const base64 = await generatePixelArt(
        aiApiKey.trim(),
        aiPrompt.trim(),
        aiReferenceImage ?? undefined
      );
      const imageData = await base64ToImageData(base64);
      const { pixels, palette } = pixelizeImageData(imageData, {
        targetWidth: aiPixelizeWidth,
        targetHeight: aiPixelizeHeight,
        colorCount: aiColorCount,
        smoothing: false,
      });
      store.newProject(aiPixelizeWidth, aiPixelizeHeight);
      store.setState((s) => {
        const newFrames = s.frames.map((f, fi) => {
          if (fi !== 0) return f;
          return {
            ...f,
            layers: f.layers.map((l, li) => {
              if (li !== 0) return l;
              return { ...l, pixels, name: 'AI Generated' };
            }),
          };
        });
        return { ...s, frames: newFrames, palette };
      });
      setShowAiDialog(false);
      setAiPrompt('');
      setAiReferenceImage(null);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setAiLoading(false);
    }
  }, [aiApiKey, aiPrompt, aiReferenceImage, aiPixelizeWidth, aiPixelizeHeight, aiColorCount, store]);

  const handleAiReferenceUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAiReferenceImage(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    []
  );

  const activeFrame = state.frames[state.activeFrameIndex];

  return (
    <div className="app">
      <Toolbar
        activeTool={state.activeTool}
        showGrid={state.showGrid}
        symmetryX={state.symmetryX}
        onionSkinning={state.onionSkinning}
        zoom={state.zoom}
        onSetTool={store.setTool}
        onToggleGrid={store.toggleGrid}
        onToggleSymmetry={store.toggleSymmetry}
        onToggleOnionSkinning={store.toggleOnionSkinning}
        onUndo={store.undo}
        onRedo={store.redo}
        onZoom={store.setZoom}
        onLoadImage={handleLoadImage}
        onExportPng={handleExportPng}
        onExportSpriteSheet={handleExportSpriteSheet}
        onNewProject={handleNewProject}
        onAiGenerate={() => setShowAiDialog(true)}
      />

      <div className="main-area">
        <div className="sidebar-left">
          <PalettePanel
            palette={state.palette}
            activeColor={state.activeColor}
            onSetColor={store.setColor}
            onAddToPalette={store.addToPalette}
          />
          <Preview
            frames={state.frames}
            activeFrameIndex={state.activeFrameIndex}
            width={state.width}
            height={state.height}
          />
        </div>

        <div className="canvas-area">
          <Canvas
            width={state.width}
            height={state.height}
            frames={state.frames}
            activeFrameIndex={state.activeFrameIndex}
            activeLayerIndex={state.activeLayerIndex}
            zoom={state.zoom}
            panX={state.panX}
            panY={state.panY}
            showGrid={state.showGrid}
            activeTool={state.activeTool}
            activeColor={state.activeColor}
            symmetryX={state.symmetryX}
            onionSkinning={state.onionSkinning}
            onSetPixel={store.setPixel}
            onFloodFill={store.floodFill}
            onColorPick={store.setColor}
            onZoom={store.setZoom}
            onPan={store.setPan}
            onPushHistory={store.pushHistory}
          />
        </div>

        <div className="sidebar-right">
          {activeFrame && (
            <LayersPanel
              layers={activeFrame.layers}
              activeLayerIndex={state.activeLayerIndex}
              onSetActiveLayer={store.setActiveLayer}
              onToggleVisibility={store.toggleLayerVisibility}
              onAddLayer={store.addLayer}
              onRemoveLayer={store.removeLayer}
            />
          )}
        </div>
      </div>

      <Timeline
        frames={state.frames}
        activeFrameIndex={state.activeFrameIndex}
        width={state.width}
        height={state.height}
        onSetActiveFrame={store.setActiveFrame}
        onAddFrame={store.addFrame}
        onDuplicateFrame={store.duplicateFrame}
        onRemoveFrame={store.removeFrame}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {showNewDialog && (
        <div className="dialog-overlay" onClick={() => setShowNewDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>New Project</h3>
            <div className="dialog-row">
              <label>Width:</label>
              <input
                type="number"
                className="dialog-text-input"
                value={newSize.w}
                min={1}
                max={512}
                onChange={(e) => {
                  const w = Math.max(1, Math.min(512, Number(e.target.value) || 1));
                  setNewSize((s) => ({
                    ...s,
                    w,
                    ...(newSizeLockRatio ? { h: Math.max(1, Math.round(w * s.h / s.w)) } : {}),
                  }));
                }}
              />
            </div>
            <div className="dialog-row">
              <label>Height:</label>
              <input
                type="number"
                className="dialog-text-input"
                value={newSize.h}
                min={1}
                max={512}
                onChange={(e) => {
                  const h = Math.max(1, Math.min(512, Number(e.target.value) || 1));
                  setNewSize((s) => ({
                    ...s,
                    h,
                    ...(newSizeLockRatio ? { w: Math.max(1, Math.round(h * s.w / s.h)) } : {}),
                  }));
                }}
              />
            </div>
            <div className="dialog-row">
              <label>
                <input
                  type="checkbox"
                  checked={newSizeLockRatio}
                  onChange={(e) => setNewSizeLockRatio(e.target.checked)}
                />
                Keep aspect ratio
              </label>
            </div>
            <div className="dialog-actions">
              <button onClick={() => setShowNewDialog(false)}>Cancel</button>
              <button className="primary" onClick={handleCreateNew}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showAiDialog && (
        <div
          className="dialog-overlay"
          onClick={() => { if (!aiLoading) { setShowAiDialog(false); setAiError(null); } }}
        >
          <div className="dialog ai-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>AI Generate Pixel Art</h3>
            <p className="dialog-desc">
              Uses Google Gemini to generate an image, then pixelizes it for the editor.
            </p>
            <div className="dialog-row">
              <label>API Key:</label>
              <input
                type="password"
                className="dialog-text-input"
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder="Gemini API key"
              />
            </div>
            <div className="dialog-row">
              <label>Prompt:</label>
              <textarea
                className="dialog-textarea"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. a fantasy sword, a cute slime monster, a treasure chest..."
                rows={3}
              />
            </div>
            <div className="dialog-row">
              <label>Reference:</label>
              <div className="ai-reference-area">
                <button
                  className="toolbar-btn"
                  onClick={() => aiFileInputRef.current?.click()}
                >
                  {aiReferenceImage ? 'Change' : 'Upload'}
                </button>
                {aiReferenceImage && (
                  <>
                    <img
                      className="ai-reference-thumb"
                      src={`data:image/png;base64,${aiReferenceImage}`}
                      alt="Reference"
                    />
                    <button
                      className="toolbar-btn"
                      onClick={() => setAiReferenceImage(null)}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
              <input
                ref={aiFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAiReferenceUpload}
              />
            </div>
            <div className="dialog-row">
              <label>Width:</label>
              <input
                type="number"
                className="dialog-text-input"
                value={aiPixelizeWidth}
                min={1}
                max={512}
                onChange={(e) => setAiPixelizeWidth(Math.max(1, Math.min(512, Number(e.target.value) || 1)))}
              />
            </div>
            <div className="dialog-row">
              <label>Height:</label>
              <input
                type="number"
                className="dialog-text-input"
                value={aiPixelizeHeight}
                min={1}
                max={512}
                onChange={(e) => setAiPixelizeHeight(Math.max(1, Math.min(512, Number(e.target.value) || 1)))}
              />
            </div>
            <div className="dialog-row">
              <label>Colors:</label>
              <select
                value={aiColorCount}
                onChange={(e) => setAiColorCount(Number(e.target.value))}
              >
                {[4, 8, 16, 32, 64].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            {aiError && <p className="ai-error">{aiError}</p>}
            <div className="dialog-actions">
              <button
                onClick={() => { setShowAiDialog(false); setAiError(null); }}
                disabled={aiLoading}
              >
                Cancel
              </button>
              <button
                className="primary"
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiApiKey.trim() || !aiPrompt.trim()}
              >
                {aiLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPixelizeDialog && (
        <div
          className="dialog-overlay"
          onClick={() => { setShowPixelizeDialog(false); setPendingImage(null); }}
        >
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Import Image</h3>
            <p className="dialog-desc">Convert to pixel art or import raw (downscaled).</p>
            <div className="dialog-row">
              <label>Width:</label>
              <input
                type="number"
                className="dialog-text-input"
                value={pixelizeOptions.targetWidth}
                min={1}
                max={512}
                onChange={(e) => {
                  const w = Math.max(1, Math.min(512, Number(e.target.value) || 1));
                  setPixelizeOptions((o) => ({
                    ...o,
                    targetWidth: w,
                    ...(keepRatio ? { targetHeight: Math.max(1, Math.round(w / imageAspectRef.current)) } : {}),
                  }));
                }}
              />
            </div>
            <div className="dialog-row">
              <label>Height:</label>
              <input
                type="number"
                className="dialog-text-input"
                value={pixelizeOptions.targetHeight}
                min={1}
                max={512}
                onChange={(e) => {
                  const h = Math.max(1, Math.min(512, Number(e.target.value) || 1));
                  setPixelizeOptions((o) => ({
                    ...o,
                    targetHeight: h,
                    ...(keepRatio ? { targetWidth: Math.max(1, Math.round(h * imageAspectRef.current)) } : {}),
                  }));
                }}
              />
            </div>
            <div className="dialog-row">
              <label>
                <input
                  type="checkbox"
                  checked={keepRatio}
                  onChange={(e) => setKeepRatio(e.target.checked)}
                />
                Keep aspect ratio
              </label>
            </div>
            <div className="dialog-row">
              <label>Colors:</label>
              <select
                value={pixelizeOptions.colorCount}
                onChange={(e) =>
                  setPixelizeOptions((o) => ({ ...o, colorCount: Number(e.target.value) }))
                }
              >
                {[4, 8, 16, 32, 64].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="dialog-row">
              <label>
                <input
                  type="checkbox"
                  checked={pixelizeOptions.smoothing}
                  onChange={(e) =>
                    setPixelizeOptions((o) => ({ ...o, smoothing: e.target.checked }))
                  }
                />
                Smooth downscale
              </label>
            </div>
            <div className="dialog-actions">
              <button onClick={() => { setShowPixelizeDialog(false); setPendingImage(null); }}>
                Cancel
              </button>
              <button onClick={handleLoadRaw}>Import Raw</button>
              <button className="primary" onClick={handlePixelize}>Pixelize</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
