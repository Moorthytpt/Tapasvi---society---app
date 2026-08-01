// src/services/ocr/ocrService.js
//
// Central OCR service. This is the ONLY module App.jsx (or any other
// caller) should ever need to talk to for OCR — it hides which engine is
// running and how preprocessing/mapping happen.
//
// Swapping engines = changing ACTIVE_ENGINE_KEY below. Nothing else needs
// to change, in this file or in any caller.

import { preprocessImage } from "./imagePreprocessor.js";
import { mapFields } from "./fieldMapper.js";
import tesseractOcr from "./tesseractOcr.js";
import paddleOcr from "./paddleOcr.js";

const ENGINES = {
  tesseract: tesseractOcr,
  paddleocr: paddleOcr,
};

// Change this one constant to switch every OCR call in the app to a
// different engine.
const ACTIVE_ENGINE_KEY = "tesseract";

function getEngine(key = ACTIVE_ENGINE_KEY) {
  return ENGINES[key] || ENGINES.tesseract;
}

/**
 * Scans a document image end to end: preprocess -> run OCR -> map fields.
 * This is the single entry point callers should use.
 *
 * @param {File|Blob} image
 * @param {{ engine?: string, lang?: string }} [options]
 * @returns {Promise<{ success: boolean, confidence: number, fields: Record<string,string>, rawText?: string, error?: string }>}
 */
export async function scanDocument(image, options = {}) {
  const engine = getEngine(options.engine);
  try {
    const preprocessed = await preprocessImage(image);

    await engine.initialize();
    let result;
    try {
      result = await engine.recognize(preprocessed, { lang: options.lang });
    } finally {
      await engine.terminate();
    }

    const fields = mapFields(result);

    return {
      success: true,
      confidence: result.confidence || 0,
      fields,
      rawText: result.text || "",
    };
  } catch (e) {
    return {
      success: false,
      confidence: 0,
      fields: {},
      error: e.message || "OCR failed.",
    };
  }
}

/**
 * Lists the OCR engines currently registered, for any future settings UI.
 * @returns {Array<{ key: string, label: string }>}
 */
export function listEngines() {
  return Object.values(ENGINES).map(e => ({ key: e.key, label: e.label }));
}

