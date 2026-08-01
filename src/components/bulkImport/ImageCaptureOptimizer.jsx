import React, { useRef, useState, useCallback } from 'react';
import {
  processDocumentImage,
  canvasToDataUrl,
} from '../../services/imageOptimizer';

/**
 * ImageCaptureOptimizer
 * -----------------------------------------------------------------------
 * Phase 2 of Bulk AI Import: Camera Capture + Gallery Upload + Multiple
 * Images + Smart Image Optimizer + Quality Checker + Continue.
 *
 * This is a fully standalone component. It does NOT touch the existing
 * "Paste AI Text" workflow, the Beneficiary module, or the database.
 * It performs NO AI analysis — "Continue" simply hands the optimized
 * images up to the parent via onContinue() so a future AI-analysis step
 * can be plugged in without changing this component.
 *
 * Usage (inside BulkAIImportModule, as a sibling tab to the existing
 * paste-text flow):
 *
 *   <ImageCaptureOptimizer
 *     onContinue={(images) => setCapturedImages(images)}
 *   />
 * -----------------------------------------------------------------------
 */

let nextId = 1;

function StarRating({ stars }) {
  return (
    <span className="text-[14px] tracking-wide">
      <span style={{ color: '#F59E0B' }}>{'★'.repeat(stars)}</span>
      <span style={{ color: '#E5E7EB' }}>{'★'.repeat(5 - stars)}</span>
    </span>
  );
}

function VerdictBadge({ verdict, message }) {
  const isGood = verdict === 'good' || verdict === 'usable';
  return (
    <span
      className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full ml-2"
      style={{
        background: isGood ? '#DCFCE7' : '#FEF2F2',
        color: isGood ? '#16A34A' : '#DC2626',
      }}
    >
      {message}
    </span>
  );
}

function ImageCard({ item, onRemove, onRetake }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-3 mb-3">
      <div className="flex gap-3">
        <div className="flex-1 text-center">
          <p className="text-[9.5px] text-[#9CA3AF] mb-1">Original</p>
          <img
            src={item.originalUrl}
            alt="original"
            className="w-full rounded-lg border border-[#E5E7EB] object-cover"
            style={{ aspectRatio: '3/4' }}
          />
        </div>
        <div className="flex-1 text-center">
          <p className="text-[9.5px] text-[#9CA3AF] mb-1">Optimized</p>
          {item.status === 'processing' ? (
            <div
              className="w-full rounded-lg flex items-center justify-center"
              style={{ aspectRatio: '3/4', background: '#F3F4F6' }}
            >
              <span className="text-[10.5px] text-[#9CA3AF]">Optimizing…</span>
            </div>
          ) : item.status === 'error' ? (
            <div
              className="w-full rounded-lg flex items-center justify-center px-2"
              style={{ aspectRatio: '3/4', background: '#FEF2F2' }}
            >
              <span className="text-[10px] text-[#DC2626]">Couldn't process image</span>
            </div>
          ) : (
            <img
              src={item.optimizedUrl}
              alt="optimized"
              className="w-full rounded-lg border border-[#E5E7EB] object-cover"
              style={{ aspectRatio: '3/4' }}
            />
          )}
        </div>
      </div>

      {item.status === 'ready' && item.quality && (
        <div className="mt-2 flex items-center flex-wrap">
          <StarRating stars={item.quality.stars} />
          <VerdictBadge verdict={item.quality.verdict} message={item.quality.message} />
        </div>
      )}

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => onRetake(item.id)}
          className="flex-1 rounded-lg border border-[#E5E7EB] py-2 text-[11.5px] font-semibold text-[#374151]"
        >
          Retake
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="flex-1 rounded-lg border py-2 text-[11.5px] font-semibold text-[#DC2626]"
          style={{ borderColor: '#FCA5A5' }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function ImageCaptureOptimizer({ onContinue }) {
  const [items, setItems] = useState([]);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const processFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const pendingItems = files.map((file) => ({
      id: nextId++,
      file,
      status: 'processing',
      originalUrl: URL.createObjectURL(file),
      optimizedUrl: null,
      optimizedCanvas: null,
      quality: null,
    }));

    setItems((prev) => [...prev, ...pendingItems]);

    for (const pending of pendingItems) {
      try {
        const result = await processDocumentImage(pending.file);
        const optimizedUrl = canvasToDataUrl(result.optimizedCanvas);
        setItems((prev) =>
          prev.map((it) =>
            it.id === pending.id
              ? {
                  ...it,
                  status: 'ready',
                  optimizedUrl,
                  optimizedCanvas: result.optimizedCanvas,
                  quality: result.quality,
                }
              : it
          )
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((it) => (it.id === pending.id ? { ...it, status: 'error' } : it))
        );
      }
    }
  }, []);

  const handleCameraChange = (e) => {
    processFiles(e.target.files);
    e.target.value = ''; // allow retaking the same shot again
  };

  const handleGalleryChange = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const retakeItem = (id) => {
    // Removes the item and immediately reopens the camera so the user
    // can reshoot it. Gallery-sourced images also just get removed —
    // user can re-pick from gallery if they prefer.
    setItems((prev) => prev.filter((it) => it.id !== id));
    cameraInputRef.current?.click();
  };

  const readyItems = items.filter((it) => it.status === 'ready');
  const processingCount = items.filter((it) => it.status === 'processing').length;
  const canContinue = readyItems.length > 0 && processingCount === 0;

  const handleContinue = () => {
    if (!canContinue) return;
    const optimizedImages = readyItems.map((it) => ({
      id: it.id,
      canvas: it.optimizedCanvas,
      dataUrl: it.optimizedUrl,
      quality: it.quality,
    }));
    onContinue?.(optimizedImages);
  };

  return (
    <div>
      {/* Hidden inputs: camera uses capture="environment" to open the rear camera directly on mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleCameraChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGalleryChange}
      />

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 rounded-xl py-3 text-[12.5px] font-bold text-white"
          style={{ background: '#7C3AED', minHeight: 44 }}
        >
          📷 Take Photo
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="flex-1 rounded-xl py-3 text-[12.5px] font-bold border-2"
          style={{ borderColor: '#7C3AED', color: '#7C3AED', minHeight: 44 }}
        >
          🖼 Choose from Gallery
        </button>
      </div>

      {items.length === 0 && (
        <div className="text-center text-[11.5px] text-[#9CA3AF] rounded-xl border border-dashed border-[#E5E7EB] py-6 px-3">
          Take a photo or choose register images from your gallery. You can add
          multiple pages before continuing.
        </div>
      )}

      {items.map((item) => (
        <ImageCard key={item.id} item={item} onRemove={removeItem} onRetake={retakeItem} />
      ))}

      {items.length > 0 && (
        <button
          type="button"
          disabled={!canContinue}
          onClick={handleContinue}
          className="w-full rounded-xl py-3.5 text-[13.5px] font-bold text-white disabled:opacity-40 mt-1"
          style={{ background: '#7C3AED', minHeight: 44 }}
        >
          {processingCount > 0
            ? `Optimizing ${processingCount} image(s)…`
            : `Continue with ${readyItems.length} image(s)`}
        </button>
      )}
    </div>
  );
}

