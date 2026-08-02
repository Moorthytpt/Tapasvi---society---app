// src/services/bulkImport/textParser.js
//
// Converts an AI app's transcription of a photographed register page into
// the same canonical beneficiary-record shape the rest of the app uses.
// This sidesteps in-browser OCR accuracy entirely: the AI app does the
// reading (off-device, using a far more capable model), and this module
// just parses its output.
//
// Three input formats are auto-detected, tried in this order:
//   1. JSON        — { "totalBeneficiaries": N, "records": [ {...} ] }
//   2. Label text   — "Name: X / Father/Husband: Y / ..." (a new record
//                      starts at every "Name:" line)
//   3. Table text   — a bare column-header block ("#", "Name",
//                      "Father/Husband", ...) followed by repeating
//                      "index, then one value per header" blocks
// Whichever format is pasted, parseAIText() returns the same array shape,
// so nothing downstream (Preview, validation, import) needed to change.
//
// EXTENSIBILITY: format support is a small registry (FORMAT_PARSERS)
// of { id, detect(text), parse(text) } entries, tried in order. Adding a
// future format (e.g. CSV) means registering one more entry via
// registerFormatParser() — existing entries and parseAIText() itself
// never need to change.

// Label variations (lowercase, no punctuation) -> canonical field key.
// Matched by substring, same style as the OCR module's header-keyword
// dictionary, so multiple phrasings of the same label all work. Reused
// by both the label-text parser (as "Label: value") and the table-text
// parser (as a bare column header).
const LABEL_MAP = [
  { field: "name", labels: ["name", "పేరు"] },
  { field: "father_husband_name", labels: ["father/husband", "father husband", "father", "husband", "guardian", "తండ్రి/భర్త", "తండ్రి", "భర్త", "సంరక్షకుడు"] },
  { field: "gender", labels: ["gender", "sex", "లింగం", "జెండర్"] },
  { field: "_dobRaw", labels: ["dob", "date of birth", "birth date", "పుట్టిన తేదీ", "జననతేదీ"] },
  { field: "age", labels: ["age", "వయస్సు"] },
  { field: "aadhaar_number", labels: ["aadhaar", "aadhar", "ఆధార్", "ఆధార్ నెంబరు", "ఆధార్ నెంబర్"] },
  { field: "voter_id", labels: ["voter id", "voter", "epic", "ఓటర్ ఐడి", "ఓటరు గుర్తింపు"] },
  { field: "phone", labels: ["mobile", "phone", "contact number", "contact", "cell no", "cell number", "cell", "మొబైల్", "ఫోన్", "సంప్రదింపు నెంబర్"] },
  { field: "village", labels: ["village", "గ్రామం"] },
  { field: "mandal", labels: ["mandal", "మండలం"] },
  { field: "district", labels: ["district", "జిల్లా"] },
  { field: "state", labels: ["state", "రాష్ట్రం"] },
  { field: "program", labels: ["program", "కార్యక్రమం", "ప్రోగ్రామ్"] },
  { field: "category", labels: ["category", "caste", "కులం", "వర్గం"] },
  { field: "house_no", labels: ["house no", "house number", "address", "ఇంటి నెంబరు", "చిరునామా"] },
  { field: "extra_notes", labels: ["occupation", "education", "remarks", "notes", "ration card", "voter", "relation", "relationship", "bank a/c", "bank account", "bank ac", "వృత్తి", "విద్య", "గమనికలు", "రేషన్ కార్డు"] },
];

function matchLabel(rawLabel) {
  const t = (rawLabel || "").trim().toLowerCase();
  // Prefer the longest matching label phrase so "father/husband" beats "father".
  let best = null;
  for (const entry of LABEL_MAP) {
    for (const l of entry.labels) {
      if (t === l || t.startsWith(l)) {
        if (!best || l.length > best.matchedLength) best = { field: entry.field, matchedLength: l.length };
      }
    }
  }
  return best?.field || null;
}

function normalizeGender(text) {
  const t = (text || "").trim().toLowerCase();
  if (/^f|female/.test(t)) return "Female";
  if (/^m|male/.test(t)) return "Male";
  return text?.trim() || "";
}

// Parses a DOB string in common formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD,
// or a bare 4-digit year like "1991") into an age in years as of today.
// Returns "" if unparseable.
function ageFromDob(dobText) {
  if (!dobText) return "";
  const t = dobText.trim();

  // Bare year only (Format 2's example uses "DOB: 1991").
  const yearOnly = t.match(/^(\d{4})$/);
  if (yearOnly) {
    const age = new Date().getFullYear() - (+yearOnly[1]);
    return age >= 0 && age < 130 ? String(age) : "";
  }

  let day, month, year;
  let m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) { day = +m[1]; month = +m[2]; year = +m[3]; }
  else {
    m = t.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (m) { year = +m[1]; month = +m[2]; day = +m[3]; }
  }
  if (!year || !month || !day) return "";
  const dob = new Date(year, month - 1, day);
  if (isNaN(dob.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear = (today.getMonth() > dob.getMonth()) || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age--;
  return age >= 0 && age < 130 ? String(age) : "";
}

function emptyRecord() {
  return {
    name: "", father_husband_name: "", gender: "", age: "", _dobRaw: "",
    aadhaar_number: "", voter_id: "", phone: "", village: "", mandal: "",
    district: "", state: "", program: "", category: "", house_no: "", extra_notes: "",
  };
}

// --- Shared value normalization (used by every format parser) ------------
// "UNCLEAR" / "N/A" are meaningful values the AI is instructed to return
// (per promptGenerator.js) and must survive untouched into the record —
// never get treated as garbage or collapsed to "". Genuinely-missing
// values ("", "null", "nil", "none") become "" — the internal NULL
// representation Preview/validators already treat as "no value".
function canonicalizeValue(raw) {
  const t = (raw == null ? "" : String(raw)).trim();
  if (!t) return "";
  const upper = t.toUpperCase();
  if (upper === "UNCLEAR") return "UNCLEAR";
  if (upper === "N/A" || upper === "NA" || upper === "NOT AVAILABLE" || upper === "NOT APPLICABLE") return "N/A";
  if (upper === "NULL" || upper === "NIL" || upper === "NONE" || upper === "-" || t === "—" || t === "–" || t === "--") return "";
  return t;
}
function cleanText(raw) {
  return canonicalizeValue(raw);
}
// Strips everything but digits (so Aadhaar/Mobile are accepted with or
// without spaces/dashes) — unless the value is a placeholder like
// "UNCLEAR", which is kept as-is rather than collapsed to "".
function cleanDigits(raw) {
  const v = canonicalizeValue(raw);
  if (v === "" || v === "UNCLEAR" || v === "N/A") return v;
  return v.replace(/\D/g, "");
}

/** Applies one field's raw value onto a record, using the same normalization rules regardless of which format parser is calling it. `rawLabel` (the original column/field name as written) is used to prefix extra_notes entries, since several different source labels (Relation, Ration Card, Bank A/c, ...) all share that one sink field and must accumulate rather than overwrite each other. */
function applyFieldValue(rec, field, rawValue, rawLabel) {
  if (!field) return;
  if (field === "gender") rec.gender = normalizeGender(canonicalizeValue(rawValue));
  else if (field === "aadhaar_number") rec.aadhaar_number = cleanDigits(rawValue);
  else if (field === "phone") rec.phone = cleanDigits(rawValue);
  else if (field === "extra_notes") {
    const v = cleanText(rawValue);
    if (v && v !== "N/A") {
      const prefix = rawLabel ? `${cleanText(rawLabel).replace(/\s+/g, " ")}: ` : "";
      rec.extra_notes = rec.extra_notes ? `${rec.extra_notes} | ${prefix}${v}` : `${prefix}${v}`;
    }
  }
  else rec[field] = cleanText(rawValue);
}

function fillAgeFromDob(rec) {
  if (!rec.age && rec._dobRaw && rec._dobRaw !== "UNCLEAR" && rec._dobRaw !== "N/A") {
    const computed = ageFromDob(rec._dobRaw);
    if (computed) rec.age = computed;
  }
}

// ===========================================================================
// FORMAT 1 — JSON
// ===========================================================================
function tryParseAIJson(rawText) {
  const trimmed = (rawText || "").trim();
  if (!trimmed) return null;
  // Some AI apps add a code fence even when told not to — strip it before
  // deciding whether this is JSON at all.
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  if (!unfenced.startsWith("{")) return null; // not JSON-shaped
  try {
    return JSON.parse(unfenced);
  } catch (e) {
    return { __invalidJson: true };
  }
}

function mapJsonRecord(rec) {
  const r = emptyRecord();
  rec = rec || {};

  applyFieldValue(r, "name", rec.name);
  applyFieldValue(r, "father_husband_name", rec.fatherName);
  applyFieldValue(r, "gender", rec.gender);
  applyFieldValue(r, "_dobRaw", rec.dob);
  applyFieldValue(r, "aadhaar_number", rec.aadhaar);
  applyFieldValue(r, "voter_id", rec.voterId);
  applyFieldValue(r, "phone", rec.mobile);
  applyFieldValue(r, "village", rec.village);
  applyFieldValue(r, "mandal", rec.mandal);
  applyFieldValue(r, "district", rec.district);
  applyFieldValue(r, "program", rec.program);
  applyFieldValue(r, "house_no", rec.address);

  // No canonical top-level field exists for ration card / occupation /
  // education / remarks (the label-text format doesn't have one either —
  // LABEL_MAP already funnels those into extra_notes). Same sink here.
  const notes = [];
  const rc = cleanText(rec.rationCard);
  const occ = cleanText(rec.occupation);
  const edu = cleanText(rec.education);
  const rem = cleanText(rec.remarks);
  if (rc && rc !== "N/A") notes.push(`Ration Card: ${rc}`);
  if (occ && occ !== "N/A") notes.push(`Occupation: ${occ}`);
  if (edu && edu !== "N/A") notes.push(`Education: ${edu}`);
  if (rem && rem !== "N/A") notes.push(`Remarks: ${rem}`);
  r.extra_notes = notes.join(" | ");

  // Age: recalculate from DOB whenever DOB is present and parseable
  // (source of truth), otherwise fall back to whatever age the AI gave
  // (preserving "UNCLEAR" rather than losing it).
  const computedAge = r._dobRaw && r._dobRaw !== "UNCLEAR" && r._dobRaw !== "N/A" ? ageFromDob(r._dobRaw) : "";
  r.age = computedAge || cleanText(rec.age);

  return r;
}

function parseJsonFormat(rawText) {
  const parsed = tryParseAIJson(rawText);
  if (!parsed || parsed.__invalidJson || !Array.isArray(parsed.records)) return [];
  return parsed.records.map(mapJsonRecord);
}

// ===========================================================================
// FORMAT 2 — Label-based plain text ("Name: X / Father/Husband: Y / ...")
// A new record starts at every recognized "Name" line (in English OR
// Telugu — "Name:" or "పేరు:") — more robust than requiring blank-line
// separators, since pasted clipboard text doesn't always keep them.
// ===========================================================================

// Matches "Label:" boundaries anywhere in a line — includes the Telugu
// Unicode block (\u0C00-\u0C7F) alongside A-Za-z, since AI apps sometimes
// answer with Telugu field names even when the prompt asked for English.
// Used globally (not just at line-start) so a line packing two labels
// together, e.g. "పుట్టిన తేదీ: 1-1-1950, వయస్సు: 70", still yields both.
const LABEL_BOUNDARY_RE = /([A-Za-z\u0C00-\u0C7F][A-Za-z\u0C00-\u0C7F\s/]*?)\s*:\s*/g;

function extractLabelValuePairs(line) {
  const pairs = [];
  const matches = [...line.matchAll(LABEL_BOUNDARY_RE)];
  for (let i = 0; i < matches.length; i++) {
    const label = matches[i][1];
    const valueStart = matches[i].index + matches[i][0].length;
    const valueEnd = i + 1 < matches.length ? matches[i + 1].index : line.length;
    const value = line.slice(valueStart, valueEnd).trim().replace(/,\s*$/, "");
    pairs.push([label, value]);
  }
  return pairs;
}

function parseLabelTextFormat(rawText) {
  const lines = (rawText || "").split("\n").map(l => l.trim()).filter(Boolean);
  const records = [];
  let current = null;

  for (const line of lines) {
    for (const [rawLabel, value] of extractLabelValuePairs(line)) {
      const field = matchLabel(rawLabel);
      if (!field) continue; // unrecognized label — skip rather than guess

      if (field === "name") {
        // A new "Name" line always starts a new record, even if the
        // previous one is incomplete — that's still one AI-transcribed
        // beneficiary, just with some fields it couldn't read.
        current = emptyRecord();
        records.push(current);
      }
      if (!current) {
        // Text before the first "Name" line — start a record anyway so
        // nothing pasted gets silently dropped.
        current = emptyRecord();
        records.push(current);
      }

      applyFieldValue(current, field, value, rawLabel);
    }
  }

  records.forEach(fillAgeFromDob);
  return records;
}

// ===========================================================================
// FORMAT 3 — Table-like plain text: a bare column-header block, then
// repeating "row index, then one value per header" blocks. Example:
//   #
//   Name
//   Father/Husband
//   Gender
//   DOB
//   Aadhaar
//
//   1
//   A. Geetha
//   UNCLEAR
//   Female
//   11/07/1996
//   599232884282
// ===========================================================================
function looksLikeTableFormat(rawText) {
  const lines = (rawText || "").split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 3) return false;
  let i = /^#$/.test(lines[0]) || /^(no\.?|s\.?no\.?|sl\.?no\.?)$/i.test(lines[0]) ? 1 : 0;
  let headerCount = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.includes(":")) break; // that's the label-text format, not this one
    const field = matchLabel(line);
    if (!field) break;
    headerCount++;
    i++;
  }
  return headerCount >= 2; // at least 2 recognizable bare column headers in a row
}

function parseTableFormat(rawText) {
  const lines = (rawText || "").split("\n").map(l => l.trim()).filter(Boolean);
  let i = /^#$/.test(lines[0]) || /^(no\.?|s\.?no\.?|sl\.?no\.?)$/i.test(lines[0]) ? 1 : 0;

  const headers = [];
  while (i < lines.length) {
    const line = lines[i];
    if (line.includes(":")) break;
    const field = matchLabel(line);
    if (!field) break;
    headers.push({ field, label: line });
    i++;
  }
  if (headers.length === 0) return [];

  const records = [];
  while (i < lines.length) {
    // An optional row-index line ("1", "1.", "1)") before each record's values.
    if (/^\d{1,3}[.)]?$/.test(lines[i])) i++;

    const rec = emptyRecord();
    for (let h = 0; h < headers.length && i < lines.length; h++, i++) {
      applyFieldValue(rec, headers[h].field, lines[i], headers[h].label);
    }
    if (Object.keys(rec).some(k => !k.startsWith("_") && rec[k])) records.push(rec);
  }

  records.forEach(fillAgeFromDob);
  return records;
}

// ===========================================================================
// FORMAT 4 — Value-only plain text: no header row at all, just a row-index
// line followed by N raw values, repeating. Since there's no header to
// read column names from, a fixed default column order is assumed (the
// same order the AI Prompt Generator's fields start with). The number of
// values per record is inferred from the gap between the first two row
// numbers, so it adapts to however many columns this particular response
// actually has — but which field is which is necessarily a best-effort
// guess without headers, which is the inherent limitation of this format.
// Example:
//   1
//   A. Geetha
//   UNCLEAR
//   Female
//   11/07/1996
//   599232884282
// ===========================================================================
const VALUE_ONLY_DEFAULT_ORDER = ["name", "father_husband_name", "gender", "_dobRaw", "aadhaar_number"];

function looksLikeValueOnlyFormat(rawText) {
  const lines = (rawText || "").split("\n").map(l => l.trim()).filter(Boolean);
  return lines.length >= 2 && /^\d{1,3}[.)]?$/.test(lines[0]);
}

function parseValueOnlyFormat(rawText) {
  const lines = (rawText || "").split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0 || !/^\d{1,3}[.)]?$/.test(lines[0])) return [];

  const indexPositions = [];
  lines.forEach((l, idx) => { if (/^\d{1,3}[.)]?$/.test(l)) indexPositions.push(idx); });

  let blockSize = VALUE_ONLY_DEFAULT_ORDER.length;
  if (indexPositions.length >= 2) blockSize = indexPositions[1] - indexPositions[0] - 1;
  if (blockSize <= 0) return [];

  const order = VALUE_ONLY_DEFAULT_ORDER.slice(0, blockSize);

  const records = [];
  let i = 0;
  while (i < lines.length) {
    if (/^\d{1,3}[.)]?$/.test(lines[i])) i++;
    const rec = emptyRecord();
    for (let f = 0; f < blockSize && i < lines.length; f++, i++) {
      const field = order[f];
      if (field) applyFieldValue(rec, field, lines[i]);
    }
    if (Object.keys(rec).some(k => !k.startsWith("_") && rec[k])) records.push(rec);
  }
  records.forEach(fillAgeFromDob);
  return records;
}

// ===========================================================================
// Format registry — extensible: future formats register here, nothing
// above or below needs to change.
// ===========================================================================
const FORMAT_PARSERS = [];

/** Adds a new pasteable-format parser. Tried in registration order by parseAIText(). */
export function registerFormatParser({ id, detect, parse }) {
  FORMAT_PARSERS.push({ id, detect, parse });
}

registerFormatParser({
  id: "json",
  detect: (text) => {
    const parsed = tryParseAIJson(text);
    return parsed !== null; // matches both valid JSON and "looked like JSON but failed"
  },
  parse: parseJsonFormat,
});

registerFormatParser({
  id: "label-text",
  detect: (text) => (text || "").split("\n").some((line) =>
    extractLabelValuePairs(line).some(([label]) => matchLabel(label) === "name")
  ),
  parse: parseLabelTextFormat,
});

registerFormatParser({
  id: "table-text",
  detect: looksLikeTableFormat,
  parse: parseTableFormat,
});

registerFormatParser({
  id: "value-only-text",
  detect: looksLikeValueOnlyFormat,
  parse: parseValueOnlyFormat,
});

/**
 * Parses an AI app's transcription of a register page into an array of
 * canonical beneficiary record objects. Auto-detects the format (JSON,
 * table-like text, or label-based text) — the returned array shape is
 * identical regardless of which one matched.
 *
 * On a JSON structural problem (invalid JSON, missing "records" array),
 * returns an empty array with a `.parseError` string attached — existing
 * callers that only check `.length` (e.g. "no records found") keep
 * working unchanged; a caller that wants the specific reason can read
 * `result.parseError`.
 *
 * @param {string} rawText
 * @returns {Array<object> & { parseError?: string }}
 */
export function parseAIText(rawText) {
  for (const { detect, parse } of FORMAT_PARSERS) {
    if (detect(rawText)) {
      const result = parse(rawText);
      if (result.length > 0 || result.parseError) return result;
      // A format "detected" but produced zero usable records (e.g. JSON
      // parsed but had an empty records array) — fall through and let a
      // later format try, rather than giving up immediately.
    }
  }

  // JSON-specific structural errors get a friendly reason attached, even
  // if nothing above matched (e.g. valid-looking JSON braces but no
  // "records" key at all).
  const maybeJson = tryParseAIJson(rawText);
  if (maybeJson) {
    const out = [];
    if (maybeJson.__invalidJson) {
      out.parseError = "This looks like JSON but couldn't be read — check that nothing was cut off when copying the AI's response.";
    } else if (!Array.isArray(maybeJson.records)) {
      out.parseError = "The AI's JSON response is missing a \"records\" array.";
    } else if (typeof maybeJson.totalBeneficiaries !== "number") {
      console.warn("AI JSON response is missing \"totalBeneficiaries\" — continuing with the records array only.");
    }
    return out;
  }

  // Nothing registered matched — most permissive fallback, tried in the
  // same "otherwise" spirit as the registry: value-only last, since it's
  // the least specific format (a bare index number is the only signal it
  // needs). If even that finds nothing, fall back to the original
  // label-text behavior so old pasted text with no recognizable structure
  // still gets a best-effort attempt rather than nothing at all.
  const valueOnlyResult = parseValueOnlyFormat(rawText);
  if (valueOnlyResult.length > 0) return valueOnlyResult;
  return parseLabelTextFormat(rawText);
}
