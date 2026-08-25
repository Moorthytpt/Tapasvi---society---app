// src/services/bulkImport/validators.js
//
// Non-blocking validation for Bulk AI Import records. Every check returns
// a human-readable warning string when it fails; the caller decides how to
// display these (the Preview screen shows them as badges) — nothing here
// prevents editing or importing, per the "show warnings only" requirement.

const AADHAAR_RE = /^\d{12}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
// Indian EPIC (Voter ID) numbers: 3 letters followed by 7 digits, e.g. IAX0787200.
const VOTER_ID_RE = /^[A-Z]{3}\d{7}$/i;

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

  // Aadhaar and Voter ID (EPIC) are alternative identity proofs — a record
  // is only missing identity if BOTH are absent. This matters for sources
  // like voter-roll exports that legitimately only ever have a Voter ID,
  // never an Aadhaar number; those used to get a false "Missing Aadhaar" on
  // every single record.
  const hasAadhaar = !isPlaceholderOrEmpty(rec.aadhaar_number);
  const hasVoterId = !isPlaceholderOrEmpty(rec.voter_id);
  if (!hasAadhaar && !hasVoterId) {
    warnings.push("Missing Aadhaar/Voter ID");
  } else {
    if (hasAadhaar && !AADHAAR_RE.test(rec.aadhaar_number)) {
      warnings.push("Invalid Aadhaar (must be 12 digits)");
    }
    if (hasVoterId && !VOTER_ID_RE.test(rec.voter_id)) {
      warnings.push("Invalid Voter ID (expected format like IAX0787200)");
    }
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
  const voterIdCounts = {};
  records.forEach(r => {
    if (!isPlaceholderOrEmpty(r.aadhaar_number)) {
      aadhaarCounts[r.aadhaar_number] = (aadhaarCounts[r.aadhaar_number] || 0) + 1;
    }
    if (!isPlaceholderOrEmpty(r.voter_id)) {
      voterIdCounts[r.voter_id] = (voterIdCounts[r.voter_id] || 0) + 1;
    }
  });
  const existingAadhaars = new Set(existingBeneficiaries.map(b => b.identity_number).filter(Boolean));
  // existingBeneficiaries only exposes one identity_number column (shared by
  // both Aadhaar and Voter ID rows, per identity_type) — reuse the same set
  // for the Voter ID check below rather than assuming a separate column.
  const existingVoterIds = existingAadhaars;

  const result = {};
  records.forEach((rec, i) => {
    const warnings = validateRecord(rec);
    if (!isPlaceholderOrEmpty(rec.aadhaar_number)) {
      if (aadhaarCounts[rec.aadhaar_number] > 1) warnings.push("Duplicate Aadhaar (in this batch)");
      if (existingAadhaars.has(rec.aadhaar_number)) warnings.push("Duplicate Aadhaar (already a beneficiary)");
    }
    if (!isPlaceholderOrEmpty(rec.voter_id)) {
      if (voterIdCounts[rec.voter_id] > 1) warnings.push("Duplicate Voter ID (in this batch)");
      if (existingVoterIds.has(rec.voter_id)) warnings.push("Duplicate Voter ID (already a beneficiary)");
    }
    result[i] = warnings;
  });
  return result;
}
