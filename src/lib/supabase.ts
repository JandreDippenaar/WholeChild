import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env and fill them in.",
  );
}

// We intentionally don't pass a Database generic here — we hand-type the
// rows in src/types/db.ts and cast .select() results in src/lib/queries.ts.
// supabase-js v2.46+ expects a generated schema shape that our hand-written
// types don't match exactly, so the typed-client experience hurts more than
// it helps for this small app.
export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const isSupabaseConfigured = Boolean(url && anonKey);
