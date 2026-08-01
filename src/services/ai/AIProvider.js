/**
 * src/services/ai/AIProvider.js
 * -----------------------------------------------------------------------
 * Base interface for a pluggable AI provider (ChatGPT, Claude, Gemini,
 * or a future in-house TAPASVI AI). This file defines the CONTRACT only
 * — it does not call any AI API. Every concrete provider
 * (chatgptProvider.js, claudeProvider.js, geminiProvider.js, ...)
 * extends this class and implements its methods.
 *
 * The UI (AI Review screen) and providerManager.js only ever talk to
 * this interface — they never know which concrete provider is active.
 * That's what lets a future provider be added, or the active one
 * swapped, without touching any UI code.
 * -----------------------------------------------------------------------
 */

/** Standard error "type" values used across every provider and the manager. */
export const AI_ERROR_TYPES = {
  PROVIDER_UNAVAILABLE: 'provider_unavailable', // not configured / not installed
  CONNECTION_FAILED: 'connection_failed', // network / auth failure reaching the provider
  TIMEOUT: 'timeout',
  INVALID_RESPONSE: 'invalid_response', // provider responded but not in a usable shape
  CANCELLED: 'cancelled', // user cancelled mid-request
};

/** Ordered loading stages shown in the UI while a batch analysis runs. */
export const AI_LOADING_STAGES = [
  { key: 'preparing', label: 'Preparing images...' },
  { key: 'connecting', label: 'Connecting provider...' },
  { key: 'uploading', label: 'Uploading images...' },
  { key: 'waiting', label: 'Waiting for AI response...' },
  { key: 'processing', label: 'Processing results...' },
];

/**
 * Builds a standardized response object. Every provider method that
 * resolves (success or failure) should return something shaped like
 * this — the UI and providerManager only ever handle this one shape.
 */
export function createAIResponse({
  success = false,
  provider = '',
  records = [],
  warnings = [],
  processingTime = 0,
  error = null, // { type: AI_ERROR_TYPES.*, message: string } | null
} = {}) {
  return { success, provider, records, warnings, processingTime, error };
}

export class AIProvider {
  /** Unique, stable id used as the registry key (e.g. "chatgpt", "claude", "gemini"). */
  static id = 'base';
  /** Human-readable name shown in the UI. */
  static displayName = 'AI Provider';

  constructor(config = {}) {
    this.config = config; // e.g. { apiKey: null } — providers read whatever they need from here
  }

  /**
   * One-time setup (load SDK, validate config shape, etc). Must be safe
   * to call even when the provider isn't configured — it should just
   * leave the provider in a not-configured state, not throw.
   */
  // eslint-disable-next-line class-methods-use-this
  async initialize() {
    throw new Error('initialize() not implemented');
  }

  /** Returns true only if this provider has everything it needs (e.g. an API key) to actually run. */
  // eslint-disable-next-line class-methods-use-this
  isConfigured() {
    throw new Error('isConfigured() not implemented');
  }

  /**
   * Analyzes a single optimized image.
   * @param {{ id: string, canvas?: HTMLCanvasElement, dataUrl?: string }} image
   * @returns {Promise<ReturnType<typeof createAIResponse>>}
   */
  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  async analyzeImage(image) {
    throw new Error('analyzeImage() not implemented');
  }

  /**
   * Analyzes a batch of optimized images in one call.
   * @param {Array<{ id: string, canvas?: HTMLCanvasElement, dataUrl?: string }>} images
   * @param {{ onStageChange?: (stageKey: string) => void }} [options]
   * @returns {Promise<ReturnType<typeof createAIResponse>>}
   */
  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  async analyzeBatch(images, options) {
    throw new Error('analyzeBatch() not implemented');
  }

  /** Cancels any in-flight analyzeImage/analyzeBatch call for this provider. Safe to call when nothing is running. */
  // eslint-disable-next-line class-methods-use-this
  cancel() {
    throw new Error('cancel() not implemented');
  }
}

export default AIProvider;

