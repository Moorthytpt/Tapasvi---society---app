// src/services/ocr/fieldMapper.js
//
// Declares the canonical set of fields TAPASVI OCR should eventually
// extract, and the shape a mapping result takes. NO extraction/matching
// logic lives here yet (no regex, no keyword search) — that's a later
// phase. This phase only defines the contract every OCR engine's raw
// output gets normalized into.

/**
 * Canonical field list. `key` is what appears in the returned `fields`
 * object; `label` is the human-readable name for review UIs.
 */
export const FIELD_DEFINITIONS = [
  { key: "name", label: "Name" },
  { key: "father_husband_name", label: "Father/Husband Name" },
  { key: "gender", label: "Gender" },
  { key: "age", label: "Age" },
  { key: "mobile", label: "Mobile" },
  { key: "aadhaar_number", label: "Aadhaar" },
  { key: "address", label: "Address" },
  { key: "village", label: "Village" },
  { key: "mandal", label: "Mandal" },
  { key: "district", label: "District" },
  { key: "occupation", label: "Occupation" },
  { key: "education", label: "Education" },
  { key: "program", label: "Program" },
];

/**
 * Returns an empty fields object matching FIELD_DEFINITIONS — the shape
 * every OCR result's `fields` property should have, before any real
 * extraction logic exists.
 * @returns {Record<string, string>}
 */
export function emptyFields() {
  return Object.fromEntries(FIELD_DEFINITIONS.map(f => [f.key, ""]));
}

/**
 * Maps raw OCR output (text/lines from an engine) into the canonical field
 * shape. NOT IMPLEMENTED YET — returns empty fields. Real extraction
 * (header-keyword matching, row/column detection, regex validation for
 * Aadhaar/phone/etc.) is a later phase; a working reference implementation
 * of that approach already exists in the current app's OCR pipeline
 * (App.jsx — detectColumnsFromHeaderRow, extractRowsFromLines,
 * validateField) and can be ported into this function then.
 * @param {{ text: string, lines: Array }} _rawOcrResult
 * @returns {Record<string, string>}
 */
export function mapFields(_rawOcrResult) {
  // TODO: implement real field extraction/mapping here.
  return emptyFields();
}

