 /**
 * src/services/aiPrompt/promptGenerator.js
 * -----------------------------------------------------------------------
 * Builds the fixed, professional prompt text that a field worker copies
 * and pastes into an external AI app (ChatGPT, Gemini, Claude, ...)
 * alongside their photographed register image. Pure string generation —
 * no network calls, no AI SDK, nothing here talks to any provider.
 *
 * v2: the prompt now asks the AI to return machine-readable JSON
 * (instead of the earlier "Beneficiary 1 / Name: ..." plain-text
 * format), so a future parser can consume it directly. This file is
 * the only thing that changed — the rest of the Bulk AI Import
 * workflow (Section 2 paste box, parser, preview, import) is untouched
 * and still accepts whatever text is pasted there.
 * -----------------------------------------------------------------------
 */

/**
 * Returns the ready-to-copy prompt text. `options.extraNote` lets a
 * caller append a short context line (e.g. "This page has 6 rows.")
 * without changing the rest of the prompt.
 */
export function generatePrompt(options = {}) {
  const { extraNote = '' } = options;

  return `You are an AI data extraction assistant for TAPASVI DMS.

Read the attached beneficiary register image carefully.

GENERAL RULES
- Read every beneficiary row.
- Never skip any beneficiary.
- Never invent data.
- Never merge two beneficiaries into one.
- Never create a beneficiary that does not exist.
- Preserve the exact row order.
- If a field cannot be read confidently, return "UNCLEAR".
- If a field is empty, return "N/A".

LANGUAGE RULES
- If text is already English, keep it exactly.
- If text is Telugu, convert it into natural English transliteration.
- Never return Telugu.
- Return English only.

Examples
వెంకటేష్ → Venkatesh
లక్ష్మి → Lakshmi
గీత → Geetha
తిరుపతి → Tirupati

VALIDATION RULES
- Aadhaar must contain exactly 12 digits.
- Mobile must contain exactly 10 digits.
- Date format must be DD/MM/YYYY.
- Never guess numbers.
- If unsure, return UNCLEAR.

FIELDS
Name
Father/Husband
Gender
DOB
Age
Aadhaar
Voter ID
Ration Card
Mobile
Address
Village
Mandal
District
Occupation
Education
Program
${extraNote ? `\n${extraNote}\n` : ''}
OUTPUT RULES
1. First count the total beneficiaries visible.
2. Return exactly that many records.
3. Return ONLY valid JSON.

Use this structure exactly:

{
  "totalBeneficiaries": 0,
  "records": [
    {
      "name": "",
      "fatherName": "",
      "gender": "",
      "dob": "",
      "age": "",
      "aadhaar": "",
      "voterId": "",
      "rationCard": "",
      "mobile": "",
      "address": "",
      "village": "",
      "mandal": "",
      "district": "",
      "occupation": "",
      "education": "",
      "program": ""
    }
  ]
}

FINAL RULES
- No markdown.
- No explanations.
- No notes.
- No comments.
- No code blocks.
- Return JSON only.`;
}

export default generatePrompt;
