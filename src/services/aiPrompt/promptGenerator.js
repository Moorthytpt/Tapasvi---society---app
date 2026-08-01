/**
 * src/services/aiPrompt/promptGenerator.js
 * -----------------------------------------------------------------------
 * Builds the fixed, professional prompt text that a field worker copies
 * and pastes into an external AI app (ChatGPT, Gemini, Claude, ...)
 * alongside their photographed register image. Pure string generation —
 * no network calls, no AI SDK, nothing here talks to any provider.
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

Read the attached beneficiary register image.

Rules
- Read every row. Never skip a beneficiary.
- Never invent data.
- If handwriting is unclear, return UNCLEAR for that field. Do not guess.

Language Rules
- If text is already in English, keep it exactly.
- If text is Telugu, convert it into natural English transliteration.
  Examples: వెంకటేష్ → Venkatesh, లక్ష్మి → Lakshmi, తిరుపతి → Tirupati.
- Return English only. Never return Telugu.

Output Format (repeat for every beneficiary)
Beneficiary N
Name:
Father/Husband:
Gender:
DOB:
Age:
Aadhaar:
Voter ID:
Ration Card:
Mobile:
Address:
Village:
Mandal:
District:
Occupation:
Education:
Program:

Validation
- Aadhaar must be exactly 12 digits, or UNCLEAR if not confidently readable.
- Mobile must be exactly 10 digits, or UNCLEAR if not confidently readable.
- Date format: DD/MM/YYYY.
- Blank field: N/A
- Unreadable field: UNCLEAR
- Never merge two beneficiaries into one record.
- Never create a beneficiary that isn't in the image.
${extraNote ? `\n${extraNote}\n` : ''}
Final Response
- Return only the structured beneficiary records in the format above.
- No explanations, no markdown, no extra text.`;
}

export default generatePrompt;

