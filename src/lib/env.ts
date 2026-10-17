import { z } from 'zod';

/**
 * Supabase is deprecating the legacy `anon` / `service_role` JWT keys by the
 * end of 2026 in favour of publishable (`sb_publishable_…`) and secret
 * (`sb_secret_…`) keys. We read the current names first and fall back to the
 * legacy ones so existing .env files keep working through the migration.
 */
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Environment variables are validated once at startup — a missing variable
 * fails fast with a clear message instead of surfacing as a runtime mystery.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),

  /** Publishable key — safe to ship to the browser, constrained by RLS. */
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),

  /** Secret key — server-only, bypasses RLS. Optional so public pages still build. */
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),

  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),

  TRACK_EMAIL_DOMAIN: z.string().min(1).default('ieee.local'),
  TRACK_DEFAULT_PASSWORD: z.string().min(8).default('ChangeMe123!'),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  SUPABASE_SECRET_KEY: secretKey,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  TRACK_EMAIL_DOMAIN: process.env.TRACK_EMAIL_DOMAIN,
  TRACK_DEFAULT_PASSWORD: process.env.TRACK_DEFAULT_PASSWORD,
});
