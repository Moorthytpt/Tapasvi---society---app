// src/services/bulkImport/validators.js
//
// Non-blocking validation for Bulk AI Import records. Every check returns
// a human-readable warning string when it fails; the caller decides how to
// display these (the Preview screen shows them as badges) — nothing here
// prevents editing or importing, per the "show warnings only" requirement.

const AADHAAR_RE = /^\d{12}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;

// Aadhaar/Mobile values of NULL, "", "N/A", or "UNCLEAR" mean "the AI
// couldn't read this" or "there's no such value" — not "here is bad
// data to flag/compare". Duplicate-checking or format-checking a
// placeholder like that would just create noisy, misleading warnings
// (e.g. two different people both showing "UNCLEAR" would look like a
// duplicate Aadhaar otherwise).
function isPlaceholderOrEmpty(v) {
  if (v == null) return true;
  const t = String(v).trim().toUpperCase();
  return t === "" || t === "NULL" || t === "N/A" || t === "UNCLEAR";
}

/**
 * Validates a single record in isolation (no cross-record checks —
 * duplicate Aadhaar is handled separately by validateBatch below, since it
 * needs the full list).
 * @param {object} rec
 * @returns {string[]} warning messages, empty if none
 */
export function validateRecord(rec) {
  const warnings = [];
  if (!rec.name?.trim()) warnings.push("Missing Name");

  if (!rec.aadhaar_number) {
    warnings.push("Missing Aadhaar");
  } else if (!AADHAAR_RE.test(rec.aadhaar_number)) {
    warnings.push("Invalid Aadhaar (must be 12 digits)");
  }

  if (!isPlaceholderOrEmpty(rec.phone) && !MOBILE_RE.test(rec.phone)) {
    warnings.push("Invalid Mobile");
  }

  if (rec._dobRaw && !rec.age) warnings.push("Invalid DOB");
  if (!rec.program?.trim()) warnings.push("Program Missing");
  return warnings;
}

/**
 * Validates a whole batch, adding cross-record "Duplicate Aadhaar"
 * warnings (against both the rest of this batch AND already-saved
 * beneficiaries, if provided). Records with a NULL/N/A/UNCLEAR Aadhaar
 * are excluded from duplicate-checking entirely — see isPlaceholderOrEmpty.
 * @param {object[]} records
 * @param {object[]} [existingBeneficiaries] - already-saved records, checked by identity_number
 * @returns {Record<string, string[]>} map of record index -> warning list
 */
export function validateBatch(records, existingBeneficiaries = []) {
  const aadhaarCounts = {};
  records.forEach(r => {
    if (!isPlaceholderOrEmpty(r.aadhaar_number)) {
      aadhaarCounts[r.aadhaar_number] = (aadhaarCounts[r.aadhaar_number] || 0) + 1;
    }
  });
  const existingAadhaars = new Set(existingBeneficiaries.map(b => b.identity_number).filter(Boolean));

  const result = {};
  records.forEach((rec, i) => {
    const warnings = validateRecord(rec);
    if (!isPlaceholderOrEmpty(rec.aadhaar_number)) {
      if (aadhaarCounts[rec.aadhaar_number] > 1) warnings.push("Duplicate Aadhaar (in this batch)");
      if (existingAadhaars.has(rec.aadhaar_number)) warnings.push("Duplicate Aadhaar (already a beneficiary)");
    }
    result[i] = warnings;
  });
  return result;
}
