/**
 * src/services/ai/chatgptProvider.js
 * -----------------------------------------------------------------------
 * ChatGPT provider skeleton. Implements the AIProvider contract but does
 * NOT call the OpenAI API — no key is read, no network request is made.
 * isConfigured() always returns false until a future phase wires in a
 * real key + request. This file exists so providerManager has something
 * concrete to register today, and so wiring in the real call later is a
 * change inside this one file, not a UI change.
 * -----------------------------------------------------------------------
 */

import { AIProvider, AI_ERROR_TYPES, createAIResponse } from './AIProvider';

export class ChatGPTProvider extends AIProvider {
  static id = 'chatgpt';
  static displayName = 'ChatGPT';

  async initialize() {
    // Nothing to set up yet — no SDK loaded, no key read.
    return true;
  }

  isConfigured() {
    // Will check for a stored API key once real integration lands.
    return Boolean(this.config?.apiKey);
  }

  async analyzeImage(image) {
    if (!this.isConfigured()) {
      return createAIResponse({
        provider: ChatGPTProvider.id,
        error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'ChatGPT is not connected yet.' },
      });
    }
    // Real API call goes here in a future phase.
    return createAIResponse({
      provider: ChatGPTProvider.id,
      error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'ChatGPT integration not implemented yet.' },
    });
  }

  async analyzeBatch(images) {
    if (!this.isConfigured()) {
      return createAIResponse({
        provider: ChatGPTProvider.id,
        error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'ChatGPT is not connected yet.' },
      });
    }
    return createAIResponse({
      provider: ChatGPTProvider.id,
      error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'ChatGPT integration not implemented yet.' },
    });
  }

  // eslint-disable-next-line class-methods-use-this
  cancel() {
    // No in-flight request possible yet — nothing to cancel.
  }
}

export default ChatGPTProvider;

