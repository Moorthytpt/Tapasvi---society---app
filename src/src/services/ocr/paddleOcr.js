// src/services/ocr/paddleOcr.js
//
// Placeholder wrapper for a possible future PaddleOCR engine (known for
// stronger handwriting and Indic-script support than Tesseract). NOT
// integrated in this phase — this file only establishes the same interface
// shape as tesseractOcr.js so ocrService.js can swap engines later without
// any caller needing to change.
//
// INTEGRATION NOTES for later: PaddleOCR has no official browser/WASM
// build maintained the way Tesseract.js is, so this would likely need
// either (a) a small backend service (Python + PaddleOCR) called over
// HTTP the same way the (now-removed) Cloud Vision backend was, or (b) a
// community WASM port, evaluated for reliability first. Nothing here
// should be built until that decision is made.

/**
 * @returns {Promise<void>}
 */
export async function initialize() {
  // TODO: not implemented — PaddleOCR is not wired up yet.
}

/**
 * @param {HTMLCanvasElement|File|Blob} _image
 * @param {{ lang?: string }} [_options]
 * @returns {Promise<{ text: string, confidence: number, lines: Array }>}
 */
export async function recognize(_image, _options = {}) {
  throw new Error("PaddleOCR is not integrated yet — this is a placeholder module.");
}

/**
 * @returns {Promise<void>}
 */
export async function terminate() {
  // TODO: not implemented — PaddleOCR is not wired up yet.
}

export default { initialize, recognize, terminate, key: "paddleocr", label: "PaddleOCR (not integrated)" };

