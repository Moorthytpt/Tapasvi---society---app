/**
 * src/services/ai/providerConnection.js
 * -----------------------------------------------------------------------
 * Talks to the "ai-provider" Supabase Edge Function (test/save/disconnect
 * a user's AI provider API key) and reads connection status directly from
 * the key-excluding `user_ai_providers_status` view. This file NEVER
 * stores or logs a raw API key beyond the single request that sends it —
 * the key itself is only ever held in React state in ProviderConfig.jsx
 * for as long as the user is typing, and is discarded after the
 * test/save call completes.
 *
 * IMPORTANT — one-time setup before this works:
 * Fill in SUPABASE_ANON_KEY below with the same anon key already used in
 * App.jsx's `createClient(...)` call (the second argument there). It's
 * the same public key already in your app — not a new secret.
 * -----------------------------------------------------------------------
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://srdfsdqitsmpzjfsxkib.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyZGZzZHFpdHNtcHpqZnN4a2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjQxMTQsImV4cCI6MjA5ODMwMDExNH0.LlbXgr9R-6ODYCm3rwJ2gv0F6b2lVditY4temE1flXU"
);'; // <- copy from App.jsx's createClient(...) second argument

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-provider`;

// Lightweight client used only to read the safe status view — never
// touches the locked-down base table (that's the Edge Function's job).
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function callEdgeFunction(payload) {
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The anon key doubles as a valid JWT the Edge Function's default
        // verification accepts — this is what lets Field Workers (who
        // have no personal Supabase session) call it at all.
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!data) return { success: false, message: 'Network Error' };
    return data;
  } catch (e) {
    return { success: false, message: 'Internet Offline' };
  }
}

/** Verifies a key against the real provider WITHOUT saving it. */
export function testProviderKey(userId, provider, apiKey) {
  return callEdgeFunction({ action: 'test', userId, provider, apiKey });
}

/** Verifies (again, defense in depth) and saves an encrypted key for this user+provider. */
export function saveProviderKey(userId, provider, apiKey) {
  return callEdgeFunction({ action: 'save', userId, provider, apiKey });
}

/** Removes a user's saved key for a provider. */
export function disconnectProvider(userId, provider) {
  return callEdgeFunction({ action: 'disconnect', userId, provider });
}

/**
 * Reads connection status (never the key itself) for every provider this
 * user has touched. Filtering by user_id happens here, in app code — see
 * the Phase 1 note on why this is an app-level, not database-level,
 * boundary for Field Workers specifically.
 */
export async function getProviderStatuses(userId) {
  const { data, error } = await supabase
    .from('user_ai_providers_status')
    .select('provider, is_connected, last_verified_at, updated_at')
    .eq('user_id', String(userId));
  if (error) return {};
  const byProvider = {};
  for (const row of data || []) byProvider[row.provider] = row;
  return byProvider;
}

