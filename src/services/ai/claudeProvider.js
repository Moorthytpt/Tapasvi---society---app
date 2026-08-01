/**
 * src/services/ai/claudeProvider.js
 * -----------------------------------------------------------------------
 * Claude provider skeleton — same shape and same "not connected yet"
 * behavior as chatgptProvider.js. See that file's header comment for
 * the full explanation; kept identical in structure on purpose so any
 * future real integration is a same-shaped change across providers.
 * -----------------------------------------------------------------------
 */

import { AIProvider, AI_ERROR_TYPES, createAIResponse } from './AIProvider';

export class ClaudeProvider extends AIProvider {
  static id = 'claude';
  static displayName = 'Claude';

  async initialize() {
    return true;
  }

  isConfigured() {
    return Boolean(this.config?.apiKey);
  }

  async analyzeImage(image) {
    if (!this.isConfigured()) {
      return createAIResponse({
        provider: ClaudeProvider.id,
        error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'Claude is not connected yet.' },
      });
    }
    return createAIResponse({
      provider: ClaudeProvider.id,
      error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'Claude integration not implemented yet.' },
    });
  }

  async analyzeBatch(images) {
    if (!this.isConfigured()) {
      return createAIResponse({
        provider: ClaudeProvider.id,
        error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'Claude is not connected yet.' },
      });
    }
    return createAIResponse({
      provider: ClaudeProvider.id,
      error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'Claude integration not implemented yet.' },
    });
  }

  // eslint-disable-next-line class-methods-use-this
  cancel() {}
}

export default ClaudeProvider;

