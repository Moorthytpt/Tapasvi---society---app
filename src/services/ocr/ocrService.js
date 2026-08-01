// src/services/ocr/ocrService.js
//
// Central OCR service — the module App.jsx (or any caller) talks to.
// Phase 2 update: scanDocument() now contains the REAL migrated pipeline
// (image enhancement -> layout-first cell OCR -> OCR-position row/column
// detection -> single-record fallback) that used to live inline in
// App.jsx's runOcr(). Nothing about the algorithm changed — this is the
// same fallback chain, same result shape, same field list, just moved out
// of the React component so App.jsx no longer contains OCR engine logic.
//
// NOTE on signature: Phase 1 sketched scanDocument(image) ->
// {success, confidence, fields} for a single image producing a single
// record. The real working pipeline processes a BATCH of pages and
// produces MANY records per page (a register page has many people on it),
// each with its own per-field confidence — so scanDocument here takes an
// array of files and returns an array of records. Forcing the real,
// working, row-aware pipeline into the narrower single-record shape would
// have meant deleting real functionality to fit a shape that was never
// actually wired up to real logic, so this scans-a-batch signature is a
// deliberate, documented deviation from the Phase 1 draft, not a
// simplification of the algorithm itself.

import { enhanceImageForOcr, detectTableGrid } from "./imagePreprocessor.js";
import { detectColumnsFromHeaderRow, extractRowsFromLines, parseVoterIdText } from "./fieldMapper.js";
import * as tesseractOcr from "./tesseractOcr.js";
import paddleOcr from "./paddleOcr.js";

const ENGINES = {
  tesseract: tesseractOcr,
  paddleocr: paddleOcr,
};

// Change this one constant to switch every OCR call in the app to a
// different engine (once paddleocr — or any other — is actually wired up).
const ACTIVE_ENGINE_KEY = "tesseract";

function getEngine(key = ACTIVE_ENGINE_KEY) {
  return ENGINES[key] || ENGINES.tesseract;
}

/**
 * Scans a batch of document images end to end: enhance -> try layout-first
 * cell-by-cell OCR (table/header/row/column detection before OCR) -> fall
 * back to full-page OCR + position-based row/column detection -> fall back
 * further to single-record parsing. This is the exact pipeline that used
 * to run inline inside App.jsx's runOcr().
 *
 * @param {File[]} files
 * @param {{ lang?: string, engine?: string, onProgress?: (u:{phase?:string,label?:string,percent?:number})=>void }} [options]
 * @returns {Promise<{ results: Array<object>, skipped: number, lastFileError: string, usedLayoutPipelineCount: number }>}
 */
export async function scanDocument(files, options = {}) {
  const { lang = "eng", onProgress } = options;
  const engine = getEngine(options.engine);

  const results = [];
  let skipped = 0;
  let lastFileError = "";
  let usedLayoutPipelineCount = 0;
  let registerTemplate = null; // RegisterTemplateManager — learned from the first confidently-detected page in this batch

  // 1) Enhancement pass — all files first (same as the original inline loop).
  const enhanced = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.({
      phase: "enhance",
      label: `Enhancing image ${i + 1} of ${files.length}...`,
      percent: Math.round(((i + 1) / files.length) * 100),
    });
    try {
      enhanced.push(await enhanceImageForOcr(files[i]));
    } catch {
      enhanced.push(files[i]); // if enhancement itself fails, fall back to the raw file
    }
  }

  onProgress?.({ phase: "ocr", percent: 0 });

  for (let i = 0; i < files.length; i++) {
    const file = files[i]; // original, kept for the preview thumbnail
    onProgress?.({ label: `Reading ${i + 1} of ${files.length}: ${file.name}` });
    try {
      const photoUrl = URL.createObjectURL(file);

      // 1) Layout-first: detect the table grid, header, and OCR cell-by-cell.
      //    Falls back to the learned register template if fresh detection
      //    fails on this page but a template already exists.
      let rowsForThisImage = null;
      if (engine.runLayoutAwarePipeline) {
        try {
          rowsForThisImage = await engine.runLayoutAwarePipeline(
            enhanced[i], lang,
            (done, total) => {
              onProgress?.({
                label: `Reading table — row ${done} of ${Math.max(total, 1)} (image ${i + 1} of ${files.length})...`,
                percent: Math.round(((i + done / Math.max(total, 1)) / files.length) * 100),
              });
            },
            registerTemplate,
            (learnedTemplate) => { registerTemplate = learnedTemplate; }
          );
        } catch { rowsForThisImage = null; }
      }

      let pageConfidence = 0, pageRawText = "", pageLines = [];
      if (rowsForThisImage) {
        usedLayoutPipelineCount++;
      } else {
        // 2) Fall back to full-page OCR + OCR-position row/column detection.
        const { text, confidence, lines } = await engine.recognize(enhanced[i], {
          lang,
          onProgress: (p) => onProgress?.({ percent: Math.round(((i + p) / files.length) * 100) }),
        });
        pageConfidence = confidence; pageRawText = text || ""; pageLines = lines || [];
        const columnMap = detectColumnsFromHeaderRow(lines);
        if (columnMap) rowsForThisImage = extractRowsFromLines(lines, columnMap, confidence);
        if (!rowsForThisImage || rowsForThisImage.length === 0) {
          // 3) Fall back further to single-record parsing of the whole page.
          const parsed = parseVoterIdText(pageRawText);
          rowsForThisImage = [{ ...parsed, _fieldConfidence: {}, _rowRawText: pageRawText }];
        }
      }

      rowsForThisImage.forEach((row, j) => {
        const fieldConfVals = Object.values(row._fieldConfidence || {});
        const rowConfidence = fieldConfVals.length
          ? Math.round(fieldConfVals.reduce((a, b) => a + b, 0) / fieldConfVals.length)
          : pageConfidence;
        results.push({
          _id: `ocr-${i}-${j}-${Date.now()}`,
          _selected: true,
          _photoUrl: photoUrl,
          _confidence: rowConfidence,
          _isDuplicate: false,
          _rawText: pageRawText,             // full-page raw text, kept for reference/storage
          _rowRawText: row._rowRawText || "", // just this row's words, if it came from position-based detection
          _fieldConfidence: row._fieldConfidence || {}, // per-field confidence
          _ocrLines: pageLines,
          name: row.name || "", voter_id: row.voter_id || "", aadhaar_number: row.aadhaar_number || "",
          phone: row.phone || "", age: row.age || "", gender: row.gender || "",
          house_no: row.house_no || "", father_husband_name: row.father_husband_name || "",
          village: row.village || "", mandal: row.mandal || "",
          extra_notes: row.extra_notes || "", // occupation/caste name/ration/etc — no dedicated field, shown + saved in notes
          category: row.category || "", // BC/SC/ST/OC — only auto-filled when OCR read an exact known code
          district: "Tirupati", state: "Andhra Pradesh",
          program: "waste", status: "New",
        });
      });
    } catch (fileErr) {
      skipped++; // one bad/corrupt image shouldn't abort the whole batch
      lastFileError = fileErr?.message || String(fileErr);
    }
  }

  return { results, skipped, lastFileError, usedLayoutPipelineCount };
}

/**
 * Lists the OCR engines currently registered, for any future settings UI.
 * @returns {Array<{ key: string, label: string }>}
 */
export function listEngines() {
  return Object.values(ENGINES).map(e => ({ key: e.key, label: e.label }));
}
