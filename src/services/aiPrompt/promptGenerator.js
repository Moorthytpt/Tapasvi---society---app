/**
 * src/services/aiPrompt/promptGenerator.js
 * -----------------------------------------------------------------------
 * Builds the fixed, professional prompt text that a field worker copies
 * and pastes into an external AI app (ChatGPT, Gemini, Claude, ...)
 * alongside their photographed register image. Pure string generation —
 * no network calls, no AI SDK, nothing here talks to any provider.
 *
 * v4: stricter extraction-specialist prompt. Key differences from v3:
 *   - Uses JSON `null` for unreadable/missing values instead of the
 *     string "UNCLEAR"/"N/A" (textParser.js's mapJsonRecord handles
 *     null safely either way — it's treated the same as an empty
 *     string internally).
 *   - Explicitly forbids completing/guessing partial numbers (Aadhaar,
 *     Mobile, Account Number, IFSC) — must be null rather than a
 *     best-guess.
 *   - Telugu is still transliterated into natural English spelling
 *     (pronunciation, not meaning) — applied to every text field, not
 *     just name — same as v1-v3, restated explicitly here.
 *   - New fields: rowNumber, accountNumber, ifsc, houseNumber,
 *     confidence, category, and a top-level pageNumber. Renamed:
 *     fatherName -> fatherOrHusband, dob -> dateOfBirth.
 *   - Explicit remarks-isolation rule retained from v3 (life-status
 *     notes like "Death" must never land in an ID/name field).
 * textParser.js's mapJsonRecord() accepts BOTH this schema and the
 * older v1-v3 field names, so older AI responses (or a provider that
 * doesn't perfectly follow this exact prompt) still parse correctly.
 * -----------------------------------------------------------------------
 */

/**
 * Returns the ready-to-copy prompt text. `options.extraNote` lets a
 * caller append a short context line (e.g. "This page has 6 rows.")
 * without changing the rest of the prompt.
 */
export function generatePrompt(options = {}) {
  const { extraNote = '' } = options;

  return `You are an expert AI specialized in extracting beneficiary information from handwritten and printed NGO register photos.

TASK

Analyze all uploaded register photo(s).

Extract EVERY beneficiary row exactly as written.

IMPORTANT RULES

1. Read ONLY visible text.
2. Never guess or invent missing information.
3. Never complete partial Aadhaar, Mobile, Account Number, IFSC or any number.
4. If a value is unreadable or incomplete, return null.
5. Preserve the original row order.
6. Never skip any visible beneficiary.
7. Never create extra beneficiaries.
8. If text is already English, keep it exactly.
9. If text is Telugu, transliterate it into natural English spelling — the pronunciation, not a translation of meaning.
10. Apply transliteration to every text field: name, fatherOrHusband, village, mandal, category, education, and remarks — not just name.
11. Never return Telugu script anywhere in the JSON output.
12. Do not correct spelling beyond transliteration.
13. Ignore page borders, stamps, arrows, signatures and decorations.
14. If multiple photos belong to the same page, merge them into one response.
15. If a beneficiary's remarks include a life-status note (e.g. "Death", "Deceased", "Expired"), put it only in "remarks" — never in aadhaar, mobile, voterId, or name.
16. Return ONLY one valid JSON object.
17. Do NOT use Markdown.
18. Do NOT write explanations.
19. Accuracy is more important than completeness.
20. Never fabricate or infer missing information.

Transliteration examples
వెంకటేష్ → Venkatesh
లక్ష్మి → Lakshmi
రాములు → Ramulu
తిరుపతి → Tirupati
చంద్రగిరి → Chandragiri
${extraNote ? `\n${extraNote}\n` : ''}
OUTPUT JSON

{
  "pageNumber": 1,
  "totalBeneficiaries": 0,
  "records": [
    {
      "rowNumber": 1,
      "name": null,
      "fatherOrHusband": null,
      "gender": null,
      "age": null,
      "dateOfBirth": null,
      "education": null,
      "category": null,
      "mobile": null,
      "aadhaar": null,
      "voterId": null,
      "rationCard": null,
      "accountNumber": null,
      "ifsc": null,
      "houseNumber": null,
      "village": null,
      "mandal": null,
      "district": "Tirupati",
      "state": "Andhra Pradesh",
      "program": null,
      "remarks": null,
      "confidence": "High"
    }
  ]
}

VALIDATION

- totalBeneficiaries must equal the number of records.
- Every visible row must produce exactly one record.
- Do not duplicate records.
- If Aadhaar is not exactly 12 visible digits, return null.
- If Mobile is not exactly 10 visible digits, return null.
- If Age is unreadable, return null.
- If Gender is unclear, return null.
- If Education is missing, return null.
- If Category/Caste is missing, return null.

FINAL OUTPUT

Return ONLY the JSON object.

Nothing else.`;
}

export default generatePrompt;
