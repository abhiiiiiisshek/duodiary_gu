import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

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
