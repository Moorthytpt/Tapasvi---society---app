/**
 * src/services/ai/geminiProvider.js
 * -----------------------------------------------------------------------
 * Gemini provider skeleton — same shape and same "not connected yet"
 * behavior as chatgptProvider.js / claudeProvider.js. See those files'
 * header comments for the full explanation.
 * -----------------------------------------------------------------------
 */

import { AIProvider, AI_ERROR_TYPES, createAIResponse } from './AIProvider';

export class GeminiProvider extends AIProvider {
  static id = 'gemini';
  static displayName = 'Gemini';

  async initialize() {
    return true;
  }

  isConfigured() {
    return Boolean(this.config?.apiKey);
  }

  async analyzeImage(image) {
    if (!this.isConfigured()) {
      return createAIResponse({
        provider: GeminiProvider.id,
        error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'Gemini is not connected yet.' },
      });
    }
    return createAIResponse({
      provider: GeminiProvider.id,
      error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'Gemini integration not implemented yet.' },
    });
  }

  async analyzeBatch(images) {
    if (!this.isConfigured()) {
      return createAIResponse({
        provider: GeminiProvider.id,
        error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'Gemini is not connected yet.' },
      });
    }
    return createAIResponse({
      provider: GeminiProvider.id,
      error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'Gemini integration not implemented yet.' },
    });
  }

  // eslint-disable-next-line class-methods-use-this
  cancel() {}
}

export default GeminiProvider;
