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
//
// The custom no-op `lock` is a workaround for a known issue where supabase-js's
// default Web Locks-based session lock can deadlock silently in some browser
// configurations (extensions, multi-tab, certain mobile browsers), causing
// `getSession()` to hang forever and the splash screen to never go away.
// Since this app uses a single client-side connection per tab, we don't need
// the cross-tab lock — making it a no-op is safe.
export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});

export const isSupabaseConfigured = Boolean(url && anonKey);
