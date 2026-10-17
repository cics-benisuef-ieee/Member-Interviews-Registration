import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

/**
 * Browser-side Supabase client. Uses the publishable key, which is safe to
 * expose — Row Level Security decides what this client can actually reach.
 */
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
