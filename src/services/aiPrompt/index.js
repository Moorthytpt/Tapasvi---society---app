/**
 * src/services/aiPrompt/index.js
 * -----------------------------------------------------------------------
 * Public entry point for the Smart AI Prompt Generator services.
 * -----------------------------------------------------------------------
 */

export { generatePrompt } from './promptGenerator';
export { copyToClipboard } from './clipboard';
export { addHistoryEntry, getHistory, clearHistory } from './history';

/** Web URLs the "Open ChatGPT / Gemini / Claude" buttons open in a new tab. No API calls — just navigation. */
export const AI_APP_LINKS = {
  chatgpt: 'https://chatgpt.com',
  gemini: 'https://gemini.google.com',
  claude: 'https://claude.ai',
};

