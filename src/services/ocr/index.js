// src/services/ocr/index.js
//
// Single entry point for the OCR service layer. Callers (App.jsx or
// anything else) should import from here rather than reaching into
// individual files directly — that's what keeps the engine swappable and
// the internals free to change without breaking callers.

export { scanDocument, listEngines } from "./ocrService.js";

export {
  FIELD_DEFINITIONS,
  emptyFields,
  mapFields,
  parseVoterIdText,
  detectColumnsFromHeaderRow,
  extractRowsFromLines,
  validateField,
  checkOcrEligibility,
  matchHeaderField,
  HEADER_KEYWORDS,
} from "./fieldMapper.js";

export {
  toCanvas,
  resizeImage,
  toGrayscale,
  increaseContrast,
  sharpen,
  reduceNoise,
  correctRotation,
  preprocessImage,
  enhanceImageForOcr,
  detectTableGrid,
  cropCell,
  buildTemplateFromGrid,
  applyTemplateToImage,
  binarizeCanvas,
  rotateCanvas,
  findPeaks,
  estimateSkewAngle,
} from "./imagePreprocessor.js";

// Individual engine wrappers — exported as namespaces so callers that need
// engine-specific functionality (e.g. App.jsx's PDF-OCR fallback, which
// calls tesseractOcr.recognize() directly on a rendered PDF page canvas)
// can still reach it, without every caller needing to know engine
// internals for the common scanDocument() path.
export * as tesseractOcr from "./tesseractOcr.js";
export { default as paddleOcr } from "./paddleOcr.js";
