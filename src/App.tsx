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
import './App.css';

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
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      setPendingImage(imageData);

      const maxDim = 64;
      const aspect = img.width / img.height;
      let tw: number, th: number;
      if (aspect >= 1) {
        tw = Math.min(maxDim, img.width);
        th = Math.round(tw / aspect);
      } else {
        th = Math.min(maxDim, img.height);
        tw = Math.round(th * aspect);
      }
      tw = [16, 32, 48, 64].reduce((prev, curr) =>
        Math.abs(curr - tw) < Math.abs(prev - tw) ? curr : prev
      );
      th = [16, 32, 48, 64].reduce((prev, curr) =>
        Math.abs(curr - th) < Math.abs(prev - th) ? curr : prev
      );

      setPixelizeOptions((o) => ({ ...o, targetWidth: tw, targetHeight: th }));
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
              <select
                value={newSize.w}
                onChange={(e) =>
                  setNewSize((s) => ({ ...s, w: Number(e.target.value) }))
                }
              >
                {[8, 16, 32, 48, 64, 128].map((v) => (
                  <option key={v} value={v}>{v}px</option>
                ))}
              </select>
            </div>
            <div className="dialog-row">
              <label>Height:</label>
              <select
                value={newSize.h}
                onChange={(e) =>
                  setNewSize((s) => ({ ...s, h: Number(e.target.value) }))
                }
              >
                {[8, 16, 32, 48, 64, 128].map((v) => (
                  <option key={v} value={v}>{v}px</option>
                ))}
              </select>
            </div>
            <div className="dialog-actions">
              <button onClick={() => setShowNewDialog(false)}>Cancel</button>
              <button className="primary" onClick={handleCreateNew}>Create</button>
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
              <select
                value={pixelizeOptions.targetWidth}
                onChange={(e) =>
                  setPixelizeOptions((o) => ({ ...o, targetWidth: Number(e.target.value) }))
                }
              >
                {[8, 16, 32, 48, 64, 128].map((v) => (
                  <option key={v} value={v}>{v}px</option>
                ))}
              </select>
            </div>
            <div className="dialog-row">
              <label>Height:</label>
              <select
                value={pixelizeOptions.targetHeight}
                onChange={(e) =>
                  setPixelizeOptions((o) => ({ ...o, targetHeight: Number(e.target.value) }))
                }
              >
                {[8, 16, 32, 48, 64, 128].map((v) => (
                  <option key={v} value={v}>{v}px</option>
                ))}
              </select>
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
