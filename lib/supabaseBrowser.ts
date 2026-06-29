"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Browser client used ONLY for the realtime subscription (Postgres changes).
// Realtime needs a client-side connection, so these two values are public by
// necessity. They are SEPARATE from the server read key:
//   - NEXT_PUBLIC_SUPABASE_URL        -> your project URL (not secret)
//   - NEXT_PUBLIC_SUPABASE_ANON_KEY   -> anon key, used for the realtime socket
//
// Realtime only DELIVERS change events the anon role is allowed to see (RLS
// still applies). When a change arrives, the app re-fetches the authoritative
// data through the server API — so no PII is ever read directly in the browser
// beyond what your RLS already permits on the realtime channel.
//
// If you do not set these, the app silently falls back to polling every 15s.

let client: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  if (!client) {
    client = createClient(url, anon, {
      auth: { persistSession: false },
    });
  }
  return client;
}
