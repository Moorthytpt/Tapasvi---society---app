// src/services/ocr/tesseractOcr.js
//
// Wrapper module for the Tesseract.js OCR engine — SCAFFOLDING ONLY for
// this phase. initialize()/recognize()/terminate() are stubbed to return
// mock values with the correct shape, so ocrService.js and callers can be
// built and tested against a stable interface before the real engine is
// wired in.
//
// NEXT INTEGRATION STEP (Phase 2): replace the mock recognize() body with
// a real Tesseract.js call. A working reference implementation already
// exists in the current app (App.jsx's SmartBeneficiaryImportModule OCR
// pipeline) — same general shape: load the Tesseract.js script once, run
// Tesseract.recognize(canvas, lang), normalize { text, confidence, lines }.
// That existing code is left untouched for now so the OCR button keeps
// working while this module is being built out in parallel.

let initialized = false;

/**
 * Prepares the engine for use (loading the Tesseract.js script/worker in
 * the real implementation). Currently a no-op stub.
 * @returns {Promise<void>}
 */
export async function initialize() {
  // TODO: load Tesseract.js and warm up a worker here.
  initialized = true;
}

/**
 * Runs OCR on a preprocessed image and returns text + confidence + line
 * position data. Currently returns a fixed mock result.
 * @param {HTMLCanvasElement|File|Blob} _image
 * @param {{ lang?: string }} [_options]
 * @returns {Promise<{ text: string, confidence: number, lines: Array }>}
 */
export async function recognize(_image, _options = {}) {
  if (!initialized) await initialize();
  // TODO: replace with a real Tesseract.recognize() call.
  return {
    text: "",
    confidence: 0,
    lines: [],
    _mock: true, // callers can check this flag to know the engine isn't wired up yet
  };
}

/**
 * Releases any engine resources (terminating the Tesseract.js worker in the
 * real implementation). Currently a no-op stub.
 * @returns {Promise<void>}
 */
export async function terminate() {
  // TODO: terminate the Tesseract.js worker here.
  initialized = false;
}

export default { initialize, recognize, terminate, key: "tesseract", label: "Tesseract.js (on-device, free)" };
