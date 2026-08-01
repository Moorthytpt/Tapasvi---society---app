// src/services/ocr/fieldMapper.js
//
// Field extraction/mapping logic. Phase 2 update: HEADER_KEYWORDS,
// matchHeaderField, parseVoterIdText, detectColumnsFromHeaderRow,
// extractRowsFromLines, validateField, and checkOcrEligibility were
// migrated here verbatim from App.jsx's SmartBeneficiaryImportModule OCR
// pipeline — same regexes, same thresholds, same behavior.
//
// FIELD_DEFINITIONS below was updated to match the real field set the
// working pipeline actually extracts (Phase 1 had drafted a provisional
// list before any extraction logic existed — see final report).

/**
 * Canonical field list actually produced by the OCR pipeline.
 */
export const FIELD_DEFINITIONS = [
  { key: "name", label: "Name" },
  { key: "voter_id", label: "Voter ID" },
  { key: "aadhaar_number", label: "Aadhaar Number" },
  { key: "age", label: "Age" },
  { key: "gender", label: "Gender" },
  { key: "house_no", label: "House No" },
  { key: "village", label: "Village" },
  { key: "mandal", label: "Mandal" },
  { key: "district", label: "District" },
  { key: "state", label: "State" },
  { key: "phone", label: "Phone" },
  { key: "father_husband_name", label: "Father/Husband Name" },
  { key: "category", label: "Category" },
  { key: "extra_notes", label: "Occupation / Caste name / Ration No / Family No / Education / Bank A/c / Remarks" },
  { key: "program", label: "Register Under Program" },
];

/**
 * @returns {Record<string, string>}
 */
export function emptyFields() {
  return Object.fromEntries(FIELD_DEFINITIONS.map(f => [f.key, ""]));
}

// Kept in sync with App.jsx's CATEGORY_OPTIONS (used across the wider app
// for Beneficiary Forms, not just OCR) — duplicated here as a small,
// read-only list so this module has no dependency on App.jsx.
const CATEGORY_OPTIONS = ["SC", "ST", "BC", "OC", "Minority"];

// Heuristic parser — OCR gives raw lines of text, not structured fields.
// Looks for common Indian Voter ID (EPIC) card label patterns, plus
// Aadhaar/phone number patterns.
export function parseVoterIdText(raw) {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const joined = raw.replace(/\n/g, " ");
  const result = { name: "", voter_id: "", aadhaar_number: "", phone: "", age: "", gender: "", house_no: "", father_husband_name: "", village: "" };

  const epicMatch = joined.match(/\b([A-Z]{3}\d{7})\b/);
  if (epicMatch) result.voter_id = epicMatch[1];

  // Aadhaar: 12 digits, usually printed/written as 3 groups of 4 (spaces or
  // hyphens optional). Require a digit-boundary on both sides so this
  // doesn't grab a stray 12-digit chunk out of a longer number.
  const aadhaarMatch = joined.match(/(?<!\d)(\d{4}[\s-]?\d{4}[\s-]?\d{4})(?!\d)/);
  if (aadhaarMatch) result.aadhaar_number = aadhaarMatch[1].replace(/[\s-]/g, "");

  // Indian mobile: 10 digits starting 6-9, optionally with +91 / 0 prefix.
  const phoneMatch = joined.match(/(?:\+?91[\s-]?|0)?\b([6-9]\d{9})\b/);
  if (phoneMatch) result.phone = phoneMatch[1];

  const ageMatch = joined.match(/Age\s*[:\-]?\s*(\d{1,3})/i);
  if (ageMatch) result.age = ageMatch[1];

  if (/\bFemale\b/i.test(joined)) result.gender = "Female";
  else if (/\bMale\b/i.test(joined)) result.gender = "Male";

  const nameLine = lines.find(l => /^Name\s*[:\-]/i.test(l));
  if (nameLine) result.name = nameLine.replace(/^Name\s*[:\-]\s*/i, "").trim();

  const relLine = lines.find(l => /(Father|Husband|Mother)('?s)?\s*Name\s*[:\-]/i.test(l));
  if (relLine) result.father_husband_name = relLine.replace(/^.*?Name\s*[:\-]\s*/i, "").trim();

  const houseLine = lines.find(l => /House\s*No/i.test(l));
  if (houseLine) result.house_no = houseLine.replace(/^.*?House\s*No\.?\s*[:\-]?\s*/i, "").trim();

  return result;
}

/* ============================================================
   AI ROW & COLUMN DETECTION (register/table pages)
   Uses the position data the OCR engine gives us (line.y, word.x,
   word.confidence) instead of any fixed pixel layout, so it works on any
   register photo, not just one specific one.
   ============================================================ */
export const HEADER_KEYWORDS = [
  { field: "name", words: ["పేరు", "name"] },
  { field: "age", words: ["వయస్సు", "వయసు", "age"] },
  { field: "gender", words: ["లింగ", "gender"] },
  { field: "house_no", words: ["ఇంటి", "గృహ", "house"] },
  { field: "father_husband_name", words: ["తండ్రి", "భర్త", "father", "husband"] },
  { field: "aadhaar_number", words: ["ఆధార్", "aadhaar", "aadhar"] },
  { field: "voter_id", words: ["ఓటరు", "epic", "voter"] },
  { field: "phone", words: ["మొబైల్", "ఫోన్", "సెల్", "phone", "mobile"] },
  { field: "village", words: ["గ్రామ", "ఊరు", "village"] },
  { field: "mandal", words: ["మండల", "mandal"] },
  { field: "category", words: ["వర్గం", "కేటగిరి", "category"] },
  { field: "extra_notes", words: ["వృత్తి", "కులం", "రేషన్", "కుటుంబ", "కుటుంబ సంఖ్య", "చదువు", "విద్య", "బ్యాంక్", "ఖాతా", "వ్యాఖ్య", "పుట్టిన తేదీ", "occupation", "caste", "ration", "family number", "education", "bank", "account", "remarks", "dob"] },
];

export function matchHeaderField(wordText) {
  const t = (wordText || "").toLowerCase();
  for (const h of HEADER_KEYWORDS) {
    if (h.words.some(kw => t.includes(kw.toLowerCase()))) return h.field;
  }
  return null;
}

/**
 * Returns { headerY, columns: [{ field, x }] } or null if no confident
 * header row found.
 */
export function detectColumnsFromHeaderRow(lines) {
  let best = null;
  for (const line of lines || []) {
    const matches = [];
    for (const w of line.words || []) {
      const field = matchHeaderField(w.text);
      if (field && !matches.some(m => m.field === field)) matches.push({ field, x: w.x });
    }
    if (matches.length >= 2 && (!best || matches.length > best.matches.length)) {
      best = { y: line.y, matches };
    }
  }
  if (!best) return null;
  return { headerY: best.y, columns: best.matches.sort((a, b) => a.x - b.x) };
}

/**
 * Splits every line below the header row into one candidate record per
 * row, assigning each word to its nearest column by x-distance.
 */
export function extractRowsFromLines(lines, columnMap, pageConfidence) {
  const dataLines = (lines || []).filter(l => l.y > columnMap.headerY + 5);
  const rows = [];
  for (const line of dataLines) {
    if (!line.words || line.words.length === 0) continue;
    const buckets = {};
    for (const w of line.words) {
      let nearest = columnMap.columns[0];
      let bestDist = Infinity;
      for (const c of columnMap.columns) {
        const dist = Math.abs(w.x - c.x);
        if (dist < bestDist) { bestDist = dist; nearest = c; }
      }
      if (!buckets[nearest.field]) buckets[nearest.field] = { texts: [], confs: [] };
      buckets[nearest.field].texts.push(w.text);
      buckets[nearest.field].confs.push(w.confidence ?? pageConfidence);
    }
    const fieldConfidence = {};
    const record = {};
    let anyText = false;
    for (const field of Object.keys(buckets)) {
      const { texts, confs } = buckets[field];
      const joined = texts.join(" ").trim();
      if (joined) anyText = true;
      record[field] = joined;
      fieldConfidence[field] = Math.round(confs.reduce((a, b) => a + b, 0) / (confs.length || 1));
    }
    if (!anyText) continue;
    const rowText = line.words.map(w => w.text).join(" ");
    const enrichment = parseVoterIdText(rowText);
    for (const key of ["voter_id", "aadhaar_number", "phone"]) {
      if (!record[key] && enrichment[key]) { record[key] = enrichment[key]; fieldConfidence[key] = pageConfidence; }
    }
    rows.push({ ...record, _rowRawText: rowText, _fieldConfidence: fieldConfidence });
  }
  return rows;
}

/**
 * FieldValidator — format-checks + normalizes a cell's OCR text for its
 * mapped field. When a value fails validation it is still returned
 * (nothing silently dropped) but its confidence is capped low.
 */
export function validateField(field, rawText) {
  const text = (rawText || "").trim();
  if (field === "aadhaar_number") {
    const digits = text.replace(/\D/g, "");
    return digits.length === 12 ? { value: digits, valid: true } : { value: digits || text, valid: false, confidenceCap: 35 };
  }
  if (field === "voter_id") {
    const m = text.toUpperCase().match(/[A-Z]{3}\d{7}/);
    return m ? { value: m[0], valid: true } : { value: text, valid: false, confidenceCap: 35 };
  }
  if (field === "phone") {
    const digits = text.replace(/\D/g, "").slice(-10);
    return /^[6-9]\d{9}$/.test(digits) ? { value: digits, valid: true } : { value: digits || text, valid: false, confidenceCap: 35 };
  }
  if (field === "age") {
    const num = text.replace(/\D/g, "");
    const n = parseInt(num, 10);
    return (num && n > 0 && n < 120) ? { value: num, valid: true } : { value: num || text, valid: false, confidenceCap: 35 };
  }
  if (field === "category") {
    const norm = text.toUpperCase().replace(/[^A-Z]/g, "");
    return CATEGORY_OPTIONS.includes(norm) ? { value: norm, valid: true } : { value: text, valid: false, confidenceCap: 35 };
  }
  if (field === "gender") {
    if (/^(f|female|స్త్రీ|ఆడ)/i.test(text)) return { value: "Female", valid: true };
    if (/^(m|male|పురుష|మగ)/i.test(text)) return { value: "Male", valid: true };
    return { value: text, valid: false, confidenceCap: 35 };
  }
  return { value: text, valid: text.length >= 2, confidenceCap: text.length >= 2 ? undefined : 35 };
}

/**
 * Program-eligibility check used by the review screen's "Eligible:" badges.
 * @param {{ age?: string|number, gender?: string }} rec
 * @returns {string[]}
 */
export function checkOcrEligibility(rec) {
  const age = Number(rec.age);
  const eligible = [];
  if (age >= 15 && age <= 35) eligible.push("RYDEAP");
  if (rec.gender === "Female" && age >= 18 && age <= 45) eligible.push("Women's Empowerment");
  eligible.push("Waste Management");
  return eligible;
}

/**
 * Maps a single OCR result (from a whole-page recognize() call) to the
 * canonical field shape, using detectColumnsFromHeaderRow +
 * extractRowsFromLines when position data is available, falling back to
 * parseVoterIdText on raw text otherwise. Returns an ARRAY of field
 * objects (one per detected row) — Phase 1 assumed a single-record shape
 * before this logic existed; the real pipeline is row-aware (a register
 * page has many people on it), so this signature reflects reality.
 * @param {{ text: string, lines?: Array, confidence?: number }} rawOcrResult
 * @returns {Array<Record<string, string>>}
 */
export function mapFields(rawOcrResult) {
  const { text = "", lines = [], confidence = 0 } = rawOcrResult || {};
  const columnMap = detectColumnsFromHeaderRow(lines);
  if (columnMap) {
    const rows = extractRowsFromLines(lines, columnMap, confidence);
    if (rows.length > 0) return rows;
  }
  return [{ ...parseVoterIdText(text), _fieldConfidence: {}, _rowRawText: text }];
}
