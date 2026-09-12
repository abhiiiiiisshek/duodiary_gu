import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * VITE_PUBLIC_* is accepted alongside VITE_*, because everyone arriving from
 * Next.js writes NEXT_PUBLIC_ out of habit and Vite silently ignores a name it
 * does not recognise -- which looks exactly like "the database is not connected".
 */
const env = import.meta.env as unknown as Record<string, string | undefined>;
const pick = (...names: string[]) => names.map((n) => env[n]).find((v) => v && v.trim());

const url = pick('VITE_SUPABASE_URL', 'VITE_PUBLIC_SUPABASE_URL');
const anonKey = pick('VITE_SUPABASE_ANON_KEY', 'VITE_PUBLIC_SUPABASE_ANON_KEY');

/** Names of the VITE_ variables this build can actually see. Values never leave. */
export const visibleEnvNames = Object.keys(env)
  .filter((n) => n.startsWith('VITE_'))
  .sort();

/**
 * The app is useless without a backend, but it should say so plainly rather than
 * crash on a null client. `isConfigured` drives a setup screen; everything else
 * can then assume a real client.
 */
export const isConfigured = Boolean(url && anonKey && !url.includes('your-project-ref'));

export const supabase: SupabaseClient = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/** Postgres errors arrive as objects; surface the message a person can act on. */
export function readableError(error: unknown): string {
  if (!error) return 'Something went wrong.';
  if (typeof error === 'string') return error;
  const e = error as { message?: string; hint?: string };
  return e.message ?? e.hint ?? 'Something went wrong.';
}
