import React, { useState, useMemo } from 'react';

/**
 * AIReview
 * -----------------------------------------------------------------------
 * Phase 3 of Bulk AI Import: the screen shown after "Continue with
 * Images" on the Camera/Gallery capture screen.
 *
 * Navigation: Camera -> Optimizer -> AI Review -> Preview Records (future)
 *
 * This screen ONLY prepares the architecture for AI analysis — it does
 * NOT call ChatGPT, Claude, Gemini, or any other AI provider. Both
 * "Analyze with AI" (per card) and "Analyze Selected Images" (bottom
 * action) just show a placeholder message. Wiring in a real provider is
 * a future phase and should only require changing what those two
 * handlers do — nothing about this screen's layout should need to
 * change when that happens.
 *
 * Standalone component: does not touch Paste AI Text, OCR, Beneficiary
 * Management, or the database. Parent (BulkAIImportModule) only needs
 * to pass the optimized images and a way to go back.
 *
 * Usage:
 *   <AIReview images={capturedImages} onBack={() => setScreen('capture')} />
 *
 * `images` items are expected in the shape produced by
 * ImageCaptureOptimizer's onContinue: { id, canvas, dataUrl, quality }
 * -----------------------------------------------------------------------
 */

function StarRating({ stars }) {
  return (
    <span className="text-[12px] tracking-wide">
      <span style={{ color: '#F59E0B' }}>{'★'.repeat(stars || 0)}</span>
      <span style={{ color: '#E5E7EB' }}>{'★'.repeat(5 - (stars || 0))}</span>
    </span>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div className="flex-1 text-center">
      <p className="text-[16px] font-bold text-[#111827]">{value}</p>
      <p className="text-[9.5px] text-[#6B7280] mt-0.5">{label}</p>
    </div>
  );
}

function ImageCard({ item, index, selected, onToggleSelect, onRemove, onAnalyze }) {
  const stars = item.quality?.stars || 0;
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-3 mb-3">
      <div className="flex gap-3">
        <label className="relative flex-shrink-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            className="absolute top-1 left-1 w-4 h-4 z-10"
          />
          <img
            src={item.dataUrl}
            alt={`Image ${index + 1}`}
            className="rounded-lg border border-[#E5E7EB] object-cover"
            style={{ width: 84, height: 112 }}
          />
        </label>

        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-bold text-[#111827]">Image {index + 1}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <StarRating stars={stars} />
            <span className="text-[10px] text-[#6B7280]">{item.quality?.overallScore ?? '—'}/100</span>
          </div>
          <span
            className="inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#DCFCE7', color: '#16A34A' }}
          >
            ✓ Ready for AI
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => onAnalyze(item.id)}
          className="flex-1 rounded-lg py-2 text-[11.5px] font-bold text-white"
          style={{ background: '#7C3AED', minHeight: 40 }}
        >
          Analyze with AI
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="flex-1 rounded-lg border py-2 text-[11.5px] font-semibold text-[#DC2626]"
          style={{ borderColor: '#FCA5A5', minHeight: 40 }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default function AIReview({ images: initialImages, onBack }) {
  const [images, setImages] = useState(initialImages || []);
  const [selectedIds, setSelectedIds] = useState(() => new Set((initialImages || []).map((it) => it.id)));
  const [notice, setNotice] = useState('');

  const stats = useMemo(() => {
    const ready = images.length; // every image reaching this screen already passed the optimizer
    const selected = images.filter((it) => selectedIds.has(it.id)).length;
    const scores = images.map((it) => it.quality?.overallScore).filter((v) => typeof v === 'number');
    const avgQuality = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    // Rough placeholder only — no row/record detection exists yet, so this
    // is simply "one estimated beneficiary per image" until AI analysis
    // (a future phase) can actually count rows within each photo.
    const estimatedBeneficiaries = images.length;
    return { ready, selected, avgQuality, estimatedBeneficiaries };
  }, [images, selectedIds]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeImage = (id) => {
    setImages((prev) => prev.filter((it) => it.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const showPlaceholder = () => {
    setNotice('AI Provider will be connected in the next phase.');
    window.setTimeout(() => setNotice(''), 3500);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
      <p className="text-[12.5px] font-bold text-[#111827] mb-1">AI Review</p>
      <p className="text-[10.5px] text-[#6B7280] mb-3">
        Review your optimized images before analysis. AI analysis isn't connected yet — this screen only
        prepares the images and selection for that future step.
      </p>

      {/* Top Summary */}
      <div className="flex rounded-xl border border-[#E5E7EB] py-2.5 mb-3" style={{ background: '#F9FAFB' }}>
        <SummaryStat label="Images Ready" value={stats.ready} />
        <SummaryStat label="Images Selected" value={stats.selected} />
        <SummaryStat label="Avg Quality" value={`${stats.avgQuality}`} />
        <SummaryStat label="Est. Beneficiaries" value={stats.estimatedBeneficiaries} />
      </div>

      {notice && (
        <div
          className="text-[11px] font-semibold rounded-lg px-3 py-2 mb-3"
          style={{ background: '#EDE9FE', color: '#6D28D9' }}
        >
          {notice}
        </div>
      )}

      {images.length === 0 ? (
        <div className="text-center text-[11.5px] text-[#9CA3AF] rounded-xl border border-dashed border-[#E5E7EB] py-6 px-3">
          No images left to review. Go back to capture or upload more.
        </div>
      ) : (
        images.map((item, index) => (
          <ImageCard
            key={item.id}
            item={item}
            index={index}
            selected={selectedIds.has(item.id)}
            onToggleSelect={toggleSelect}
            onRemove={removeImage}
            onAnalyze={showPlaceholder}
          />
        ))
      )}

      {/* Bottom Actions */}
      <div className="flex gap-2 mt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border-2 py-3 text-[12.5px] font-bold"
          style={{ borderColor: '#7C3AED', color: '#7C3AED', minHeight: 44 }}
        >
          Back
        </button>
        <button
          type="button"
          disabled={stats.selected === 0}
          onClick={showPlaceholder}
          className="flex-1 rounded-xl py-3 text-[12.5px] font-bold text-white disabled:opacity-40"
          style={{ background: '#7C3AED', minHeight: 44 }}
        >
          Analyze Selected Images ({stats.selected})
        </button>
      </div>
    </div>
  );
}
