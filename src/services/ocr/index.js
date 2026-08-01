// src/services/ocr/index.js
//
// Single entry point for the OCR service layer. Callers (App.jsx or
// anything else) should import from here rather than reaching into
// individual files directly — that's what keeps the engine swappable and
// the internals free to change without breaking callers.

export { scanDocument, listEngines } from "./ocrService.js";
export { FIELD_DEFINITIONS, emptyFields, mapFields } from "./fieldMapper.js";
export {
  toCanvas,
  resizeImage,
  toGrayscale,
  increaseContrast,
  sharpen,
  reduceNoise,
  correctRotation,
  preprocessImage,
} from "./imagePreprocessor.js";

// Individual engine wrappers are exported too, in case a caller ever needs
// to bypass ocrService and talk to one engine directly (rare — prefer
// scanDocument() for normal use).
export { default as tesseractOcr } from "./tesseractOcr.js";
export { default as paddleOcr } from "./paddleOcr.js";

