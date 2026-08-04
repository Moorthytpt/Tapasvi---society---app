import React, { useState, useEffect, useCallback } from 'react';
import { testProviderKey, saveProviderKey, disconnectProvider, getProviderStatuses } from '../../services/ai/providerConnection';

/**
 * ProviderConfig
 * -----------------------------------------------------------------------
 * "Connect AI Provider" screen — reached from AI Review's provider-status
 * banner. Every Field Worker who opens this connects THEIR OWN API key
 * (OpenAI / Gemini / Claude) — never the Super Admin's. The key is only
 * ever sent to the "ai-provider" Edge Function; this component never
 * stores it anywhere itself beyond the input field while typing.
 *
 * Usage: <ProviderConfig currentUser={currentUser} onBack={...} showToast={showToast} />
 * `currentUser` needs a stable identity: currentUser.userId (Field
 * Worker, from app_users) or currentUser.supabaseUser?.id (Admin).
 * -----------------------------------------------------------------------
 */

const PROVIDERS = [
  { id: 'openai', displayName: 'OpenAI (ChatGPT)', placeholder: 'sk-...' },
  { id: 'gemini', displayName: 'Google Gemini', placeholder: 'AIza...' },
  { id: 'claude', displayName: 'Anthropic Claude', placeholder: 'sk-ant-...' },
];

function fmtTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

function ProviderCard({ provider, state, onChange, onTest, onSave, onDisconnect, onToggleShow }) {
  const { apiKeyInput, showKey, testing, saving, testResult, testMessage, isConnected, lastVerifiedAt } = state;
  const busy = testing || saving;

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] font-bold text-[#111827]">{provider.displayName}</p>
        {isConnected ? (
          <span
            className="text-[9.5px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#DCFCE7', color: '#16A34A' }}
          >
            ✓ Connected
          </span>
        ) : (
          <span
            className="text-[9.5px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#F3F4F6', color: '#6B7280' }}
          >
            Not connected
          </span>
        )}
      </div>

      {isConnected && lastVerifiedAt && (
        <p className="text-[9.5px] text-[#9CA3AF] mb-2">Last verified: {fmtTime(lastVerifiedAt)}</p>
      )}

      <div className="relative mb-2">
        <input
          type={showKey ? 'text' : 'password'}
          value={apiKeyInput}
          onChange={(e) => onChange(provider.id, e.target.value)}
          placeholder={isConnected ? '•••••••••••••••••••• (saved)' : provider.placeholder}
          disabled={busy}
          className="w-full rounded-xl border border-[#E5E7EB] pl-3 pr-16 py-2.5 text-[12.5px]"
        />
        <button
          type="button"
          onClick={() => onToggleShow(provider.id)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] font-bold px-2 py-1"
          style={{ color: '#7C3AED' }}
        >
          {showKey ? 'Hide' : 'Show'}
        </button>
      </div>

      {testResult && (
        <p
          className="text-[10.5px] font-semibold mb-2"
          style={{ color: testResult === 'verified' ? '#16A34A' : '#DC2626' }}
        >
          {testResult === 'verified' ? '✓ ' : '⚠ '}
          {testMessage}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !apiKeyInput.trim()}
          onClick={() => onTest(provider.id)}
          className="flex-1 rounded-lg border-2 py-2 text-[11px] font-bold disabled:opacity-40"
          style={{ borderColor: '#7C3AED', color: '#7C3AED', minHeight: 38 }}
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          type="button"
          disabled={busy || !apiKeyInput.trim()}
          onClick={() => onSave(provider.id)}
          className="flex-1 rounded-lg py-2 text-[11px] font-bold text-white disabled:opacity-40"
          style={{ background: '#7C3AED', minHeight: 38 }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {isConnected && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDisconnect(provider.id)}
            className="flex-1 rounded-lg border py-2 text-[11px] font-bold disabled:opacity-40"
            style={{ borderColor: '#FCA5A5', color: '#DC2626', minHeight: 38 }}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProviderConfig({ currentUser, onBack, showToast }) {
  const userId = currentUser?.userId || currentUser?.supabaseUser?.id || null;

  const [state, setState] = useState(() =>
    Object.fromEntries(
      PROVIDERS.map((p) => [
        p.id,
        {
          apiKeyInput: '',
          showKey: false,
          testing: false,
          saving: false,
          testResult: null, // 'verified' | 'invalid' | null
          testMessage: '',
          isConnected: false,
          lastVerifiedAt: null,
        },
      ])
    )
  );
  const [localToast, setLocalToast] = useState('');
  const [loadingStatus, setLoadingStatus] = useState(true);

  const notify = useCallback(
    (message) => {
      if (showToast) showToast(message);
      else {
        setLocalToast(message);
        window.setTimeout(() => setLocalToast(''), 3000);
      }
    },
    [showToast]
  );

  const patch = (providerId, partial) =>
    setState((prev) => ({ ...prev, [providerId]: { ...prev[providerId], ...partial } }));

  useEffect(() => {
    if (!userId) {
      setLoadingStatus(false);
      return;
    }
    getProviderStatuses(userId).then((statuses) => {
      setState((prev) => {
        const next = { ...prev };
        for (const p of PROVIDERS) {
          const row = statuses[p.id];
          if (row) {
            next[p.id] = { ...next[p.id], isConnected: !!row.is_connected, lastVerifiedAt: row.last_verified_at };
          }
        }
        return next;
      });
      setLoadingStatus(false);
    });
  }, [userId]);

  const handleChange = (providerId, value) => patch(providerId, { apiKeyInput: value, testResult: null });
  const handleToggleShow = (providerId) => patch(providerId, { showKey: !state[providerId].showKey });

  const handleTest = async (providerId) => {
    if (!userId) return notify('No Provider Connected. Please connect your provider first.');
    patch(providerId, { testing: true, testResult: null });
    const result = await testProviderKey(userId, providerId, state[providerId].apiKeyInput.trim());
    patch(providerId, {
      testing: false,
      testResult: result.success ? 'verified' : 'invalid',
      testMessage: result.message || (result.success ? 'Verified' : 'Unknown Error'),
    });
  };

  const handleSave = async (providerId) => {
    if (!userId) return notify('No Provider Connected. Please connect your provider first.');
    patch(providerId, { saving: true, testResult: null });
    const result = await saveProviderKey(userId, providerId, state[providerId].apiKeyInput.trim());
    if (result.success) {
      patch(providerId, {
        saving: false,
        isConnected: true,
        lastVerifiedAt: new Date().toISOString(),
        apiKeyInput: '',
        showKey: false,
        testResult: null,
      });
      notify(`${PROVIDERS.find((p) => p.id === providerId).displayName} connected.`);
    } else {
      patch(providerId, { saving: false, testResult: 'invalid', testMessage: result.message || 'Could not save' });
    }
  };

  const handleDisconnect = async (providerId) => {
    patch(providerId, { saving: true });
    const result = await disconnectProvider(userId, providerId);
    patch(providerId, {
      saving: false,
      isConnected: false,
      lastVerifiedAt: null,
      apiKeyInput: '',
      testResult: null,
    });
    notify(
      result.success
        ? `${PROVIDERS.find((p) => p.id === providerId).displayName} disconnected.`
        : 'Could not disconnect — try again.'
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
      <p className="text-[12.5px] font-bold text-[#111827] mb-1">Connect AI Provider</p>
      <p className="text-[10.5px] text-[#6B7280] mb-3">
        Connect your own API key for each provider you use. Your key is sent securely and never shown to other
        users or the Super Admin.
      </p>

      {!userId && (
        <div className="text-[11px] font-semibold rounded-lg px-3 py-2 mb-3" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
          Couldn't identify your account — please log out and back in, then try again.
        </div>
      )}

      {localToast && (
        <div className="text-[11px] font-semibold rounded-lg px-3 py-2 mb-3" style={{ background: '#EDE9FE', color: '#6D28D9' }}>
          {localToast}
        </div>
      )}

      {loadingStatus ? (
        <p className="text-[11px] text-[#9CA3AF] py-4 text-center">Loading your provider settings...</p>
      ) : (
        PROVIDERS.map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            state={state[p.id]}
            onChange={handleChange}
            onToggleShow={handleToggleShow}
            onTest={handleTest}
            onSave={handleSave}
            onDisconnect={handleDisconnect}
          />
        ))
      )}

      <button
        type="button"
        onClick={onBack}
        className="w-full rounded-xl border-2 py-3 text-[12.5px] font-bold mt-1"
        style={{ borderColor: '#7C3AED', color: '#7C3AED', minHeight: 44 }}
      >
        Back
      </button>
    </div>
  );
}
