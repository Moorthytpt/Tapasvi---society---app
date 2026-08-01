// src/services/ocr/tesseractOcr.js
//
// Real Tesseract.js engine wrapper. Phase 2 update: loadTesseract(), the
// full-page recognize() logic, createBatchWorker() (persistent worker for
// cell-by-cell OCR), HeaderDetector (detectHeaderRow), and the layout-first
// orchestrator (runLayoutAwarePipeline / TableDetector+RowDetector+
// ColumnDetector+CellCropper+OCRProcessor+FieldValidator combined) were
// migrated here verbatim from App.jsx's SmartBeneficiaryImportModule OCR
// pipeline — same behavior, just relocated out of the React component.

import { detectTableGrid, cropCell, buildTemplateFromGrid, applyTemplateToImage } from "./imagePreprocessor.js";
import { matchHeaderField, validateField } from "./fieldMapper.js";

let _tesseractLoadPromise = null;

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (_tesseractLoadPromise) return _tesseractLoadPromise;
  _tesseractLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error("Could not load the OCR engine. Check your internet connection."));
    document.head.appendChild(script);
  });
  return _tesseractLoadPromise;
}

/**
 * Preloads the Tesseract.js script.
 * @returns {Promise<void>}
 */
export async function initialize() {
  await loadTesseract();
}

/**
 * Full-page OCR. Normalized return shape:
 *   { text, confidence, lines: [{ text, y, words: [{ text, x, confidence }] }] }
 * `lines`/`words` carry position data used by the row/column detector in
 * fieldMapper.js.
 * @param {HTMLCanvasElement|File|Blob} imageOrCanvas
 * @param {{ lang?: string, onProgress?: (p:number)=>void }} [options]
 */
export async function recognize(imageOrCanvas, { lang = "eng", onProgress } = {}) {
  const Tesseract = await loadTesseract();
  const { data } = await Tesseract.recognize(imageOrCanvas, lang, {
    logger: m => { if (m.status === "recognizing text" && onProgress) onProgress(m.progress); },
  });
  const lines = (data.lines || []).map(l => ({
    text: l.text || "",
    y: l.bbox?.y0 ?? 0,
    words: (l.words || []).map(w => ({ text: w.text || "", x: w.bbox?.x0 ?? 0, confidence: Math.round(w.confidence || 0) })),
  }));
  return { text: data.text || "", confidence: Math.round(data.confidence || 0), lines };
}

/**
 * Used by the layout-first cell-by-cell pipeline: a single persistent
 * worker recognizes dozens of small cell crops without paying Tesseract's
 * worker-init cost on every single cell.
 * @param {string} lang
 * @returns {Promise<{ recognize: (cellCanvas: HTMLCanvasElement) => Promise<{text:string,confidence:number}>, terminate: () => void }>}
 */
export async function createBatchWorker(lang = "eng") {
  const Tesseract = await loadTesseract();
  const worker = await Tesseract.createWorker(lang);
  return {
    async recognize(cellCanvas) {
      const { data } = await worker.recognize(cellCanvas);
      return { text: (data.text || "").trim(), confidence: Math.round(data.confidence || 0) };
    },
    terminate: () => worker.terminate(),
  };
}

/**
 * No-op: recognize() manages its own worker lifecycle internally (Tesseract
 * v5's simple API), and createBatchWorker()'s returned object has its own
 * terminate(). Kept for interface parity with the generic engine contract.
 * @returns {Promise<void>}
 */
export async function terminate() {
  // Nothing to release at the module level.
}

/**
 * HeaderDetector — OCRs just the header band (row 0..1) one cell at a
 * time and matches each against the header-keyword dictionary. Column
 * anchors come from THIS image's own header cells, never a fixed pixel
 * layout.
 * @param {{ canvas: HTMLCanvasElement, rows: number[], cols: number[] }} grid
 * @param {{ recognize: (c: HTMLCanvasElement) => Promise<{text:string,confidence:number}> }} worker
 * @returns {Promise<Array<{colIndex:number, field:string, headerText:string}> | null>}
 */
export async function detectHeaderRow(grid, worker) {
  const { canvas, rows, cols } = grid;
  const map = [];
  for (let c = 0; c < cols.length - 1; c++) {
    const cell = cropCell(canvas, cols[c], rows[0], cols[c + 1], rows[1]);
    let text = "";
    try { ({ text } = await worker.recognize(cell)); } catch { /* skip an unreadable header cell */ }
    const field = matchHeaderField(text);
    if (field && !map.some(m => m.field === field)) map.push({ colIndex: c, field, headerText: text.trim() });
  }
  return map.length >= 2 ? map : null;
}

/**
 * Orchestrator: TableDetector -> HeaderDetector -> crops + OCRs every data
 * cell -> FieldValidator on each cell. Returns an array of row records (one
 * per detected register row) or null if the layout wasn't confidently
 * detectable, so the caller falls back to full-page OCR + position-based
 * detection.
 * @param {HTMLCanvasElement} canvas
 * @param {string} lang
 * @param {(done:number, total:number) => void} [onRowProgress]
 * @param {{ colFractions: number[], headerMap: Array }} [template]
 * @param {(t: object) => void} [onTemplateReady]
 */
export async function runLayoutAwarePipeline(canvas, lang, onRowProgress, template, onTemplateReady) {
  let grid = detectTableGrid(canvas);
  const worker = await createBatchWorker(lang);
  try {
    let headerMap = grid ? await detectHeaderRow(grid, worker) : null;

    if ((!grid || !headerMap) && template) {
      const templated = applyTemplateToImage(canvas, template);
      if (templated) { grid = templated; headerMap = template.headerMap; }
    }
    if (!grid || !headerMap) return null;

    if (onTemplateReady && !template) onTemplateReady(buildTemplateFromGrid(grid, headerMap));

    const totalRows = Math.max(0, grid.rows.length - 2);
    const records = [];
    for (let r = 1; r < grid.rows.length - 1; r++) {
      const rec = { _fieldConfidence: {}, _cellBoxes: {}, extra_notes: "" };
      let any = false;
      for (let c = 0; c < grid.cols.length - 1; c++) {
        const colInfo = headerMap.find(h => h.colIndex === c);
        const field = colInfo ? colInfo.field : null;
        const box = { x0: grid.cols[c], y0: grid.rows[r], x1: grid.cols[c + 1], y1: grid.rows[r + 1] };
        const cell = cropCell(grid.canvas, box.x0, box.y0, box.x1, box.y1);
        let text = "", confidence = 0;
        try { ({ text, confidence } = await worker.recognize(cell)); } catch { /* leave this cell blank, still reviewable */ }
        const validated = validateField(field || "extra_notes", text);
        if (validated.value) any = true;
        const targetField = field || "extra_notes";
        rec[targetField] = [rec[targetField], validated.value].filter(Boolean).join(" ").trim();
        rec._fieldConfidence[targetField] = Math.min(confidence || 0, validated.confidenceCap ?? 100);
        rec._cellBoxes[targetField] = box;
      }
      if (any) records.push(rec);
      onRowProgress?.(r, totalRows);
    }
    return records.length > 0 ? records : null;
  } finally {
    worker.terminate();
  }
}

export default {
  initialize, recognize, terminate, createBatchWorker, detectHeaderRow, runLayoutAwarePipeline,
  key: "tesseract", label: "Tesseract.js (on-device, free)",
};
