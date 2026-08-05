import React, { useState, useEffect, useMemo } from 'react';
import { getProviderStatuses, analyzeImage } from '../../services/ai/providerConnection';
import { parseAIText } from '../../services/bulkImport';
import ProviderConfig from './ProviderConfig';

/**
 * Resizes/recompresses an image data URL so the payload sent to the AI
 * provider stays under maxBytes, while keeping enough resolution for
 * handwriting to stay legible. Runs entirely client-side (canvas), before
 * the base64 string is ever built — never touches OCR/parser logic.
 * Returns { dataUrl, bytes } where bytes is the size of the base64
 * payload that will actually be sent.
 */
async function compressImageForAnalysis(dataUrl, maxBytes = 1_000_000) {
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image for compression'));
    image.src = dataUrl;
  });

  const estimateBytes = (url) => {
    const commaIndex = url.indexOf(',');
    const base64 = commaIndex >= 0 ? url.slice(commaIndex + 1) : url;
    return Math.ceil((base64.length * 3) / 4);
  };

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Handwriting needs real resolution — start large, only shrink as far
  // as actually needed to hit maxBytes.
  const MAX_DIMENSION = 2000;
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (Math.max(width, height) > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const render = (w, h) => {
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
  };

  render(width, height);

  let quality = 0.9;
  let outUrl = canvas.toDataURL('image/jpeg', quality);
  let bytes = estimateBytes(outUrl);

  // First, back off JPEG quality — cheaper than shrinking dimensions and
  // preserves detail better.
  while (bytes > maxBytes && quality > 0.4) {
    quality -= 0.1;
    outUrl = canvas.toDataURL('image/jpeg', quality);
    bytes = estimateBytes(outUrl);
  }

  // Still too big at the quality floor — shrink dimensions and try again
  // once, never going below a size where handwriting would become unreadable.
  if (bytes > maxBytes) {
    const scale = Math.sqrt(maxBytes / bytes);
    const w2 = Math.max(900, Math.round(width * scale));
    const h2 = Math.max(900, Math.round(height * scale));
    render(w2, h2);
    outUrl = canvas.toDataURL('image/jpeg', 0.7);
    bytes = estimateBytes(outUrl);
  }

  return { dataUrl: outUrl, bytes };
}


/**
 * AIReview
 * -----------------------------------------------------------------------
 * Phase 3 of Bulk AI Import: the screen shown after "Continue with
 * Images" on the Camera/Gallery capture screen.
 *
 * Navigation: Camera -> Optimizer -> AI Review -> Preview Records (shared
 * with the manual "Paste AI Output" path)
 *
 * "Analyze with AI" / "Analyze Selected Images" call the real
 * "ai-provider" Edge Function for whichever provider this user has
 * connected (via providerConnection.js), asking for the same
 * "Label: value" text format the manual Paste AI Output box expects.
 * On success that text is parsed with the same parseAIText() used there,
 * and the resulting records are handed to the parent via
 * onRecordsReady() — landing on the exact same Preview Records screen
 * either way, with editing/import unchanged.
 *
 * This component still doesn't touch OCR or the database directly —
 * the parent (BulkAIImportModule) owns records/import, this screen just
 * hands it parsed records the same way the paste box does.
 *
 * Usage:
 *   <AIReview images={capturedImages} onBack={() => setScreen('capture')}
 *             currentUser={currentUser} showToast={showToast}
 *             onRecordsReady={(records) => ...} />
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

function ImageCard({ item, index, selected, onToggleSelect, onRemove, onAnalyze, analyzing }) {
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
          disabled={analyzing}
          onClick={() => onAnalyze(item.id)}
          className="flex-1 rounded-lg py-2 text-[11.5px] font-bold text-white disabled:opacity-40"
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

export default function AIReview({ images: initialImages, onBack, currentUser, showToast, onRecordsReady }) {
  const userId = currentUser?.userId || currentUser?.supabaseUser?.id || null;

  const [images, setImages] = useState(initialImages || []);
  const [selectedIds, setSelectedIds] = useState(() => new Set((initialImages || []).map((it) => it.id)));
  const [localScreen, setLocalScreen] = useState('review'); // 'review' | 'config'
  // analysis: { status: 'idle'|'loading'|'success'|'error', stageLabel, message }
  const [analysis, setAnalysis] = useState({ status: 'idle', stageLabel: '', message: '' });
  // Which provider (if any) this user has actually connected — read once
  // on mount from the safe status view, same source ProviderConfig uses.
  const [connectedProviderId, setConnectedProviderId] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setStatusLoading(false);
      return;
    }
    let cancelled = false;
    getProviderStatuses(userId).then((statuses) => {
      if (cancelled) return;
      const connected = Object.values(statuses).find((s) => s.is_connected);
      setConnectedProviderId(connected ? connected.provider : null);
      setStatusLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

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

  const runAnalysis = async (imageIds) => {
    const targets = images.filter((it) => imageIds.includes(it.id));
    if (targets.length === 0) return;

    if (!userId) {
      setAnalysis({ status: 'error', stageLabel: '', message: "Couldn't identify your account — please log out and back in." });
      return;
    }
    if (!connectedProviderId) {
      setAnalysis({ status: 'error', stageLabel: '', message: 'No AI provider connected.' });
      return;
    }

    setAnalysis({ status: 'loading', stageLabel: 'Analyzing with AI...', message: '' });

    const prompt =
      'Transcribe this handwritten beneficiary register. For each person, output plain text in exactly ' +
      'this format — one field per line, a blank line between people, no markdown, no code fences, no ' +
      'extra commentary:\n\n' +
      'Name: <value>\nFather/Husband: <value>\nGender: <Male or Female>\nDOB: <DD/MM/YYYY if visible>\n' +
      'Aadhaar: <number if visible>\nMobile: <number if visible>\nHouse No: <value if visible>\n' +
      'Village: <value>\nMandal: <value>\nDistrict: <value>\nCategory: <BC/SC/ST/OC if visible>\n' +
      'Education: <value if visible>\nProgram: <value if visible>\n\n' +
      'Leave a field blank after the colon if you cannot read it. Do not invent data.';

    const results = [];
    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      const label = targets.length > 1 ? `image ${i + 1} of ${targets.length}` : 'image';

      setAnalysis({ status: 'loading', stageLabel: `Compressing ${label}...`, message: '' });
      let compressed;
      try {
        compressed = await compressImageForAnalysis(item.dataUrl);
      } catch (e) {
        results.push({ success: false, message: 'Could not read this image.' });
        continue;
      }
      const sizeKb = (compressed.bytes / 1024).toFixed(0);
      console.log(`[AIReview] ${label}: compressed payload ${sizeKb} KB`);

      const match = /^data:([^;]+);base64,(.*)$/s.exec(compressed.dataUrl || '');
      if (!match) {
        results.push({ success: false, message: 'Could not read this image.' });
        continue;
      }
      const [, mimeType, imageBase64] = match;

      setAnalysis({ status: 'loading', stageLabel: `Analyzing ${label} (${sizeKb} KB)...`, message: '' });
      const startedAt = Date.now();
      const result = await analyzeImage(userId, connectedProviderId, imageBase64, mimeType, prompt);
      const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`[AIReview] ${label}: ${connectedProviderId} responded in ${elapsedSec}s (success: ${!!(result && result.success)})`);
      setAnalysis({
        status: 'loading',
        stageLabel: `${label}: ${sizeKb} KB, ${connectedProviderId} responded in ${elapsedSec}s`,
        message: '',
      });

      results.push(result);
    }

    const succeeded = results.filter((r) => r && r.success);
    if (succeeded.length === 0) {
      const message = (results[0] && results[0].message) || 'Analysis failed.';
      setAnalysis({ status: 'error', stageLabel: '', message });
      return;
    }

    // Same parser the manual "Paste AI Output" path uses — the AI's
    // response goes straight into the same canonical-record pipeline,
    // so it lands on the exact same Preview Records screen either way.
    const combinedText = succeeded.map((r) => r.text || '').join('\n\n');
    const parsed = parseAIText(combinedText);
    if (parsed.length === 0) {
      setAnalysis({
        status: 'error',
        stageLabel: '',
        message: "Got a response from AI, but couldn't find any usable records in it. Try again, or use Paste AI Output instead.",
      });
      return;
    }

    setAnalysis({ status: 'idle', stageLabel: '', message: '' });
    onRecordsReady(parsed);
  };

  const isConfigured = !statusLoading && !!connectedProviderId;

  if (localScreen === 'config') {
    return <ProviderConfig currentUser={currentUser} onBack={() => setLocalScreen('review')} showToast={showToast} />;
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
      <p className="text-[12.5px] font-bold text-[#111827] mb-1">AI Review</p>
      <p className="text-[10.5px] text-[#6B7280] mb-3">
        Review your optimized images, then analyze with your connected AI provider — or go back and use
        Paste AI Output instead.
      </p>

      {/* Top Summary */}
      <div className="flex rounded-xl border border-[#E5E7EB] py-2.5 mb-3" style={{ background: '#F9FAFB' }}>
        <SummaryStat label="Images Ready" value={stats.ready} />
        <SummaryStat label="Images Selected" value={stats.selected} />
        <SummaryStat label="Avg Quality" value={`${stats.avgQuality}`} />
        <SummaryStat label="Est. Beneficiaries" value={stats.estimatedBeneficiaries} />
      </div>

      {/* Provider Status */}
      {!isConfigured && (
        <div
          className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-3"
          style={{ background: '#FEF2F2' }}
        >
          <span className="text-[11px] font-semibold text-[#B91C1C]">No AI provider connected.</span>
          <button
            type="button"
            onClick={() => setLocalScreen('config')}
            className="text-[10.5px] font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ background: '#7C3AED' }}
          >
            Connect Provider
          </button>
        </div>
      )}

      {analysis.status === 'loading' && (
        <div
          className="text-[11px] font-semibold rounded-lg px-3 py-2 mb-3"
          style={{ background: '#EDE9FE', color: '#6D28D9' }}
        >
          {analysis.stageLabel}
        </div>
      )}

      {analysis.status === 'error' && (
        <div
          className="text-[11px] font-semibold rounded-lg px-3 py-2 mb-3"
          style={{ background: '#FEF2F2', color: '#B91C1C' }}
        >
          {analysis.message}
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
            onAnalyze={(id) => runAnalysis([id])}
            analyzing={analysis.status === 'loading'}
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
          disabled={stats.selected === 0 || analysis.status === 'loading'}
          onClick={() => runAnalysis(Array.from(selectedIds))}
          className="flex-1 rounded-xl py-3 text-[12.5px] font-bold text-white disabled:opacity-40"
          style={{ background: '#7C3AED', minHeight: 44 }}
        >
          Analyze Selected Images ({stats.selected})
        </button>
      </div>
    </div>
  );
}
