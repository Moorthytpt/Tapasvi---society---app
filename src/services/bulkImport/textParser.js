// src/services/bulkImport/textParser.js
//
// Converts labeled "Name: X / Father/Husband: Y / ..." text — the kind of
// output a phone AI app (ChatGPT, Gemini, Claude, etc.) produces when a
// field worker photographs a register and asks it to transcribe the page —
// into the same canonical beneficiary-record shape the rest of the app
// uses. This sidesteps in-browser OCR accuracy entirely: the AI app does
// the reading (off-device, using a far more capable model), and this
// module just parses its structured text output.
//
// A new record starts at every "Name:" line — this is more robust than
// requiring blank-line separators, since pasted text from a phone
// clipboard doesn't always preserve blank lines between records.

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

/**
 * Parses pasted "Label: value" text (possibly many beneficiaries back to
 * back) into an array of canonical beneficiary record objects.
 * @param {string} rawText
 * @returns {Array<object>}
 */
export function parseAIText(rawText) {
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
