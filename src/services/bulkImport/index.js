// src/services/bulkImport/index.js
//
// Single entry point for the Bulk AI Import service layer. parseAIText()
// is the "pasted structured text" source; future sources (CSV, Excel, a
// direct AI-provider API call, or OCR) should each get their own parser
// function here that produces the SAME record shape — the Preview/Import
// UI in App.jsx never needs to change when a new source is added.

export { parseAIText } from "./textParser.js";
export { validateRecord, validateBatch } from "./validators.js";
