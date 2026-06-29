import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client. Reads env that is NEVER exposed to the browser.
// Used by the Route Handlers under /app/api/*.

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

export const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "chatbot_sessions";

export function getServerClient() {
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_KEY. Copy .env.example to .env.local and fill them in."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
