// src/services/bulkImport/textParser.js
//
// Converts an AI app's transcription of a photographed register page into
// the same canonical beneficiary-record shape the rest of the app uses.
// This sidesteps in-browser OCR accuracy entirely: the AI app does the
// reading (off-device, using a far more capable model), and this module
// just parses its output.
//
// Two input formats are supported, auto-detected:
//   1. JSON — what the current AI Prompt Generator asks for:
//        { "totalBeneficiaries": N, "records": [ { "name": "...", ... } ] }
//   2. The older labeled text format — "Name: X / Father/Husband: Y / ..."
//      A new record starts at every "Name:" line.
// Whichever format is pasted, parseAIText() returns the same array shape,
// so nothing downstream (Preview, validation, import) needed to change.

// Label variations (lowercase, no punctuation) -> canonical field key.
// Matched by substring, same style as the OCR module's header-keyword
// dictionary, so multiple phrasings of the same label all work.
const LABEL_MAP = [
  { field: "name", labels: ["name"] },
  { field: "father_husband_name", labels: ["father/husband", "father husband", "father", "husband", "guardian"] },
  { field: "gender", labels: ["gender", "sex"] },
  { field: "_dobRaw", labels: ["dob", "date of birth", "birth date"] },
  { field: "age", labels: ["age"] },
  { field: "aadhaar_number", labels: ["aadhaar", "aadhar"] },
  { field: "voter_id", labels: ["voter id", "voter", "epic"] },
  { field: "phone", labels: ["mobile", "phone", "contact number", "contact"] },
  { field: "village", labels: ["village"] },
  { field: "mandal", labels: ["mandal"] },
  { field: "district", labels: ["district"] },
  { field: "state", labels: ["state"] },
  { field: "program", labels: ["program"] },
  { field: "category", labels: ["category", "caste"] },
  { field: "house_no", labels: ["house no", "house number", "address"] },
  { field: "extra_notes", labels: ["occupation", "education", "remarks", "notes"] },
];

function matchLabel(rawLabel) {
  const t = rawLabel.trim().toLowerCase();
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

// Parses a DOB string in common formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
// into an age in years as of today. Returns "" if unparseable.
function ageFromDob(dobText) {
  if (!dobText) return "";
  const t = dobText.trim();
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

// --- JSON format support --------------------------------------------------
// "UNCLEAR" and "N/A" are meaningful values the AI is instructed to return
// (per promptGenerator.js) — they must survive into the record untouched,
// never get treated as garbage or get digit-stripped into "".
function isPlaceholder(v) {
  const t = (v == null ? "" : String(v)).trim().toUpperCase();
  return t === "UNCLEAR" || t === "N/A" || t === "";
}
function cleanText(v) {
  return v == null ? "" : String(v).trim();
}
// Strips everything but digits — unless the value is a placeholder like
// "UNCLEAR", in which case it's kept as-is rather than collapsed to "".
function cleanDigits(v) {
  if (isPlaceholder(v)) return cleanText(v);
  return String(v).replace(/\D/g, "");
}

// Detects whether pasted text is the JSON format the AI Prompt Generator
// asks for. Returns:
//   null                        - doesn't look like JSON at all (old text format)
//   { __invalidJson: true }     - looked like JSON but JSON.parse failed
//   <parsed object>             - valid JSON
function tryParseAIJson(rawText) {
  const trimmed = (rawText || "").trim();
  if (!trimmed) return null;
  // Some AI apps add a code fence even when told not to — strip it before
  // deciding whether this is JSON at all.
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  if (!unfenced.startsWith("{")) return null; // not JSON-shaped — treat as old text format
  try {
    return JSON.parse(unfenced);
  } catch (e) {
    return { __invalidJson: true };
  }
}

// Maps one JSON record (the AI Prompt Generator's field names) into the
// same canonical shape emptyRecord() produces, so nothing downstream can
// tell the difference between a JSON-sourced and text-sourced record.
function mapJsonRecord(rec) {
  const r = emptyRecord();
  rec = rec || {};

  r.name = cleanText(rec.name);
  r.father_husband_name = cleanText(rec.fatherName);
  r.gender = normalizeGender(rec.gender);
  r._dobRaw = isPlaceholder(rec.dob) ? "" : cleanText(rec.dob);
  r.aadhaar_number = cleanDigits(rec.aadhaar);
  r.voter_id = cleanText(rec.voterId);
  r.phone = cleanDigits(rec.mobile);
  r.village = cleanText(rec.village);
  r.mandal = cleanText(rec.mandal);
  r.district = cleanText(rec.district);
  r.program = cleanText(rec.program);
  r.house_no = cleanText(rec.address);

  // No canonical top-level field exists for ration card / occupation /
  // education / remarks (the old text format doesn't have one either —
  // LABEL_MAP already funnels occupation/education/remarks/notes into
  // extra_notes). Ration card joins that same sink for consistency.
  const notes = [];
  if (!isPlaceholder(rec.rationCard)) notes.push(`Ration Card: ${cleanText(rec.rationCard)}`);
  if (!isPlaceholder(rec.occupation)) notes.push(`Occupation: ${cleanText(rec.occupation)}`);
  if (!isPlaceholder(rec.education)) notes.push(`Education: ${cleanText(rec.education)}`);
  if (!isPlaceholder(rec.remarks)) notes.push(`Remarks: ${cleanText(rec.remarks)}`);
  r.extra_notes = notes.join(" | ");

  // Age: recalculate from DOB whenever DOB is present and parseable
  // (source of truth), otherwise fall back to whatever age the AI gave
  // (preserving "UNCLEAR" rather than losing it).
  const computedAge = r._dobRaw ? ageFromDob(r._dobRaw) : "";
  r.age = computedAge || cleanText(rec.age);

  return r;
}

/**
 * Parses an AI app's transcription of a register page into an array of
 * canonical beneficiary record objects. Auto-detects JSON (the current
 * AI Prompt Generator format) vs. the older "Label: value" text format —
 * either way, the returned array shape is identical.
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
  const maybeJson = tryParseAIJson(rawText);

  if (maybeJson) {
    if (maybeJson.__invalidJson) {
      const out = [];
      out.parseError = "This looks like JSON but couldn't be read — check that nothing was cut off when copying the AI's response.";
      return out;
    }
    if (!Array.isArray(maybeJson.records)) {
      const out = [];
      out.parseError = "The AI's JSON response is missing a \"records\" array.";
      return out;
    }
    if (typeof maybeJson.totalBeneficiaries !== "number") {
      // Not fatal — proceed with whatever records are present, matching
      // the "warnings only, never blocks" approach used everywhere else
      // in Bulk AI Import.
      console.warn("AI JSON response is missing \"totalBeneficiaries\" — continuing with the records array only.");
    }
    return maybeJson.records.map(mapJsonRecord);
  }

  // --- Old "Label: value" text format (unchanged) -------------------------
  const lines = (rawText || "").split("\n").map(l => l.trim()).filter(Boolean);
  const records = [];
  let current = null;

  for (const line of lines) {
    const m = line.match(/^([A-Za-z][A-Za-z\s/]*?)\s*:\s*(.*)$/);
    if (!m) continue; // not a "Label: value" line — ignore (e.g. stray AI commentary)
    const field = matchLabel(m[1]);
    if (!field) continue; // unrecognized label — skip rather than guess
    const value = m[2].trim();

    if (field === "name") {
      // A new "Name:" line always starts a new record, even if the
      // previous one is incomplete — that's still one AI-transcribed
      // beneficiary, just with some fields it couldn't read.
      current = emptyRecord();
      records.push(current);
    }
    if (!current) {
      // Text before the first "Name:" line — start a record anyway so
      // nothing pasted gets silently dropped.
      current = emptyRecord();
      records.push(current);
    }

    if (field === "gender") current.gender = normalizeGender(value);
    else if (field === "aadhaar_number") current.aadhaar_number = value.replace(/\D/g, "");
    else if (field === "phone") current.phone = value.replace(/\D/g, "");
    else if (field === "program") current.program = value;
    else current[field] = value;
  }

  // Fill in age from DOB where age wasn't given directly.
  for (const r of records) {
    if (!r.age && r._dobRaw) r.age = ageFromDob(r._dobRaw);
  }
  return records;
}
