import React from 'react';
import { providerManager } from '../../services/ai/providerManager';

/**
 * ProviderConfig
 * -----------------------------------------------------------------------
 * Placeholder "Connect Provider" screen, reached from AI Review's
 * provider-status banner. This is intentionally inert: it lists the
 * registered providers and their status, with no authentication and no
 * API wiring. Real connection flows are a future phase.
 * -----------------------------------------------------------------------
 */
export default function ProviderConfig({ onBack }) {
  const providers = providerManager.listProviders();

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
      <p className="text-[12.5px] font-bold text-[#111827] mb-1">Connect AI Provider</p>
      <p className="text-[10.5px] text-[#6B7280] mb-3">
        This is a placeholder. Connecting a real provider (API key setup, authentication) is a future phase —
        nothing here sends data anywhere yet.
      </p>

      {providers.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between rounded-xl border border-[#E5E7EB] px-3 py-2.5 mb-2"
        >
          <span className="text-[12px] font-semibold text-[#111827]">{p.displayName}</span>
          <span
            className="text-[9.5px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#F3F4F6', color: '#6B7280' }}
          >
            Not connected
          </span>
        </div>
      ))}

      <button
        type="button"
        onClick={onBack}
        className="w-full rounded-xl border-2 py-3 text-[12.5px] font-bold mt-2"
        style={{ borderColor: '#7C3AED', color: '#7C3AED', minHeight: 44 }}
      >
        Back
      </button>
    </div>
  );
}

