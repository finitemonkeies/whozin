import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function assertEnv(name: string, value: string | undefined) {
  if (!value) {
    // Hard fail early so you don’t silently point to nowhere
    throw new Error(`[ENV] Missing ${name}. Check your .env and restart dev server.`);
  }
}

assertEnv("VITE_SUPABASE_URL", supabaseUrl);
assertEnv("VITE_SUPABASE_ANON_KEY", supabaseAnonKey);

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // important for OAuth code exchange
  },
});

/**
 * Useful for debugging “wrong project” issues.
 * Example URL: https://<PROJECT_REF>.supabase.co
 */
export function getSupabaseProjectRef(): string {
  try {
    const host = new URL(supabaseUrl!).host; // <ref>.supabase.co
    return host.split(".")[0] ?? "unknown";
  } catch {
    return "unknown";
  }
}
