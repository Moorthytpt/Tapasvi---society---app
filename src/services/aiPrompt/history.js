/**
 * src/services/aiPrompt/history.js
 * -----------------------------------------------------------------------
 * Records a local log of Bulk AI Import runs: when, who, how many
 * images/records, duplicates, errors, and which external AI app was
 * used to transcribe. Stored in localStorage — explicitly NOT a
 * database change, since the Supabase schema must stay untouched.
 *
 * This is a simple, dependency-free log. If TAPASVI ever wants this
 * synced across devices, that would mean adding a real table — a
 * decision for a future phase, not implied by this file.
 * -----------------------------------------------------------------------
 */

const STORAGE_KEY = 'tapasvi_bulk_ai_import_history';
const MAX_ENTRIES = 200; // keep the log from growing unbounded in localStorage

/**
 * @typedef {Object} ImportHistoryEntry
 * @property {string} date - e.g. "01/08/2026"
 * @property {string} time - e.g. "14:32"
 * @property {string} fieldWorker - name/username of whoever ran the import
 * @property {number} imagesCount
 * @property {number} importedCount
 * @property {number} duplicates
 * @property {number} errors
 * @property {string} providerUsed - "ChatGPT" | "Gemini" | "Claude" | "Manual" | "Unknown"
 */

function readAll() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function writeAll(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    return true;
  } catch (e) {
    return false;
  }
}

/** Adds one entry to the front of the history log. Fills in date/time automatically if not provided. */
export function addHistoryEntry(entry) {
  const now = new Date();
  const full = {
    date: entry.date || now.toLocaleDateString('en-GB'), // DD/MM/YYYY
    time: entry.time || now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    fieldWorker: entry.fieldWorker || 'Unknown',
    imagesCount: Number(entry.imagesCount) || 0,
    importedCount: Number(entry.importedCount) || 0,
    duplicates: Number(entry.duplicates) || 0,
    errors: Number(entry.errors) || 0,
    providerUsed: entry.providerUsed || 'Manual',
  };
  const entries = readAll();
  entries.unshift(full);
  writeAll(entries);
  return full;
}

/** Returns all history entries, most recent first. */
export function getHistory() {
  return readAll();
}

/** Clears the entire history log (explicit user action only — never called automatically). */
export function clearHistory() {
  return writeAll([]);
}

export default { addHistoryEntry, getHistory, clearHistory };

