import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

type CookiesToSet = { name: string; value: string; options: CookieOptions }[];

/**
 * Server-side Supabase client bound to the request cookies. Uses the
 * publishable key, so every read and write is constrained by RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes the session.
          }
        },
      },
    },
  );
}

/**
 * Secret-key client. Bypasses RLS — only for credential management and
 * operations that must not be attributed to a signed-in user. Never used in
 * request handlers that render user data, and never reachable from the browser
 * (a secret key is rejected with HTTP 401 if sent from one).
 */
export function createAdminClient() {
  if (!env.SUPABASE_SECRET_KEY) {
    throw new Error(
      'No Supabase secret key configured. Set SUPABASE_SECRET_KEY (or the legacy SUPABASE_SERVICE_ROLE_KEY).',
    );
  }

  return createServiceClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
