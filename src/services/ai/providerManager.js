/**
 * src/services/ai/providerManager.js
 * -----------------------------------------------------------------------
 * Registers AI providers, tracks which one is active, and is the ONLY
 * thing the UI (AI Review screen) talks to for analysis. The UI never
 * imports a concrete provider directly — that's what lets ChatGPT,
 * Claude, Gemini, or a future in-house TAPASVI AI be added or swapped
 * without any UI change.
 *
 * Nothing in this file calls a real AI API. Today every registered
 * provider is unconfigured (no API key), so every analysis attempt
 * resolves with a standardized "provider unavailable" response — never
 * fake/mock beneficiary records.
 * -----------------------------------------------------------------------
 */

import { AI_ERROR_TYPES, AI_LOADING_STAGES, createAIResponse } from './AIProvider';
import { ChatGPTProvider } from './chatgptProvider';
import { ClaudeProvider } from './claudeProvider';
import { GeminiProvider } from './geminiProvider';

export { AI_ERROR_TYPES, AI_LOADING_STAGES };

class ProviderManager {
  constructor() {
    this.providers = new Map(); // id -> provider instance
    this.activeProviderId = null;
    this._cancelRequested = false;

    // Register the built-in provider skeletons. Registering is cheap and
    // side-effect-free (no network, no key lookup), so it's safe to do
    // this unconditionally at module load.
    this.registerProvider(new ChatGPTProvider());
    this.registerProvider(new ClaudeProvider());
    this.registerProvider(new GeminiProvider());
  }

  /** Adds a provider instance to the registry. Re-registering the same id replaces it (useful for tests / future config). */
  registerProvider(providerInstance) {
    const id = providerInstance.constructor.id;
    this.providers.set(id, providerInstance);
    if (!this.activeProviderId) this.activeProviderId = id;
  }

  /** Lists every registered provider as { id, displayName, isConfigured }. */
  listProviders() {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.constructor.id,
      displayName: p.constructor.displayName,
      isConfigured: safeIsConfigured(p),
    }));
  }

  /** True if at least one registered provider is fully configured and ready to use. */
  isAnyProviderConfigured() {
    return this.listProviders().some((p) => p.isConfigured);
  }

  setActiveProvider(id) {
    if (!this.providers.has(id)) return false;
    this.activeProviderId = id;
    return true;
  }

  getActiveProvider() {
    return this.activeProviderId ? this.providers.get(this.activeProviderId) : null;
  }

  /** Signals any in-progress analyzeBatch() call to stop at the next checkpoint. */
  cancelActive() {
    this._cancelRequested = true;
    const active = this.getActiveProvider();
    if (active && typeof active.cancel === 'function') {
      try {
        active.cancel();
      } catch (e) {
        // Cancelling should never itself throw into the caller.
      }
    }
  }

  /**
   * Runs a batch analysis through the active provider, reporting loading
   * stages along the way via onStageChange. Always resolves (never
   * throws) with a standardized response — callers don't need try/catch.
   *
   * @param {Array} images
   * @param {{ onStageChange?: (stageKey: string, label: string) => void }} [options]
   */
  async analyzeBatch(images, options = {}) {
    const { onStageChange } = options;
    const start = Date.now();
    this._cancelRequested = false;

    const report = (stageKey) => {
      const stage = AI_LOADING_STAGES.find((s) => s.key === stageKey);
      if (onStageChange && stage) onStageChange(stage.key, stage.label);
    };

    report('preparing');
    if (!images || images.length === 0) {
      return createAIResponse({
        provider: this.activeProviderId || '',
        error: { type: AI_ERROR_TYPES.INVALID_RESPONSE, message: 'No images to analyze.' },
        processingTime: Date.now() - start,
      });
    }

    const active = this.getActiveProvider();
    if (!active) {
      return createAIResponse({
        provider: '',
        error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'No AI provider is registered.' },
        processingTime: Date.now() - start,
      });
    }

    if (!safeIsConfigured(active)) {
      return createAIResponse({
        provider: active.constructor.id,
        error: { type: AI_ERROR_TYPES.PROVIDER_UNAVAILABLE, message: 'No AI provider connected.' },
        processingTime: Date.now() - start,
      });
    }

    if (this._cancelRequested) {
      return createAIResponse({
        provider: active.constructor.id,
        error: { type: AI_ERROR_TYPES.CANCELLED, message: 'Cancelled by user.' },
        processingTime: Date.now() - start,
      });
    }

    report('connecting');
    try {
      await active.initialize();
    } catch (e) {
      return createAIResponse({
        provider: active.constructor.id,
        error: { type: AI_ERROR_TYPES.CONNECTION_FAILED, message: e?.message || 'Could not connect to the AI provider.' },
        processingTime: Date.now() - start,
      });
    }

    if (this._cancelRequested) {
      return createAIResponse({
        provider: active.constructor.id,
        error: { type: AI_ERROR_TYPES.CANCELLED, message: 'Cancelled by user.' },
        processingTime: Date.now() - start,
      });
    }

    report('uploading');
    report('waiting');
    try {
      const result = await active.analyzeBatch(images, { onStageChange: onStageChange });
      report('processing');

      if (this._cancelRequested) {
        return createAIResponse({
          provider: active.constructor.id,
          error: { type: AI_ERROR_TYPES.CANCELLED, message: 'Cancelled by user.' },
          processingTime: Date.now() - start,
        });
      }

      if (!result || typeof result !== 'object') {
        return createAIResponse({
          provider: active.constructor.id,
          error: { type: AI_ERROR_TYPES.INVALID_RESPONSE, message: 'Provider returned an unexpected response.' },
          processingTime: Date.now() - start,
        });
      }

      return createAIResponse({ ...result, processingTime: Date.now() - start });
    } catch (e) {
      const isTimeout = e?.name === 'TimeoutError' || /timeout/i.test(e?.message || '');
      return createAIResponse({
        provider: active.constructor.id,
        error: {
          type: isTimeout ? AI_ERROR_TYPES.TIMEOUT : AI_ERROR_TYPES.CONNECTION_FAILED,
          message: e?.message || 'The AI provider request failed.',
        },
        processingTime: Date.now() - start,
      });
    }
  }
}

function safeIsConfigured(provider) {
  try {
    return Boolean(provider.isConfigured());
  } catch (e) {
    return false;
  }
}

// Singleton — the whole app shares one registry/active-provider state.
export const providerManager = new ProviderManager();
export default providerManager;

