/**
 * src/services/aiPrompt/promptGenerator.js
 * -----------------------------------------------------------------------
 * Builds the fixed, professional prompt text that a field worker copies
 * and pastes into an external AI app (ChatGPT, Gemini, Claude, ...)
 * alongside their photographed register image. Pure string generation —
 * no network calls, no AI SDK, nothing here talks to any provider.
 *
 * v3: added remarks handling (life-status annotations like "Death" /
 * "Deceased" / "Expired" written in a register must go to a separate
 * `remarks` field, never into an ID/name field) and automatic Age
 * calculation from DOB. Still returns the same JSON envelope from v2,
 * just with one more field per record. Only this file changed.
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
- This applies to EVERY part of your response, including field labels/names — not just the data values. Never write field names in Telugu (e.g. never write "పేరు" instead of "Name", never write "ఆధార్" instead of "Aadhaar"). Field names must always be the exact English words listed under FIELDS below, and the JSON keys must always be the exact English keys shown in the structure below.

Examples
వెంకటేష్ → Venkatesh
లక్ష్మి → Lakshmi
గీత → Geetha
తిరుపతి → Tirupati

REMARKS RULE
- If a value like "Death", "Deceased", "Expired", or similar appears anywhere in the row, do NOT put it in Voter ID, Aadhaar, Mobile, or Name.
- Store it in the "remarks" field instead.
- Never place remarks text inside any ID field, under any circumstance.
- If there is no such note for a beneficiary, return "N/A" for remarks.

AGE RULE
- If DOB is available, automatically calculate Age from it.
- If Age cannot be calculated (DOB missing or UNCLEAR), return "UNCLEAR" for age.

VALIDATION RULES
- Aadhaar must contain exactly 12 digits.
- Mobile must contain exactly 10 digits.
- Date format must be DD/MM/YYYY.
- Never guess numbers.
- If unsure, return UNCLEAR.

FIELDS (use these exact English names — never Telugu)
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
Remarks
${extraNote ? `\n${extraNote}\n` : ''}
OUTPUT RULES
1. First count the total beneficiaries visible.
2. Return exactly that many records.
3. Return ONLY valid JSON.
4. The JSON keys must be in English exactly as shown below — never translated, never renamed.

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
      "program": "",
      "remarks": ""
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
