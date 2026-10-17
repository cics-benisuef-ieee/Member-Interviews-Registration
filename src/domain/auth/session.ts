import { cache } from 'react';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { IDENTITY_HEADERS } from './identity-headers';
import type { SessionUser, UserRole } from './auth.types';

/**
 * The signed-in account for the current request, or null when signed out.
 *
 * The middleware already verified the session and forwarded the identity as
 * request headers, so this is normally free. When the headers are missing — a
 * route outside the middleware matcher, or a direct server-side call — we fall
 * back to asking Supabase, so the answer never silently changes.
 *
 * React's `cache` scopes both paths to a single render, so a layout, a page,
 * and any guard they call share one lookup.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const forwarded = readForwardedIdentity(await headers());
  return forwarded ?? readIdentityFromSupabase();
});

/** Reads the identity the middleware attached, if it is present and complete. */
function readForwardedIdentity(headerList: Headers): SessionUser | null {
  const id = headerList.get(IDENTITY_HEADERS.id);
  const role = headerList.get(IDENTITY_HEADERS.role);
  if (!id || !isUserRole(role)) return null;

  return {
    id,
    email: headerList.get(IDENTITY_HEADERS.email) ?? '',
    displayName: safeDecode(headerList.get(IDENTITY_HEADERS.displayName)),
    role,
    trackId: headerList.get(IDENTITY_HEADERS.trackId) || null,
  };
}

/** Fallback: verify directly with Supabase. Costs two round trips. */
async function readIdentityFromSupabase(): Promise<SessionUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role, track_id')
    .eq('id', user.id)
    .single();

  if (!profile || !isUserRole(profile.role)) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    displayName: profile.display_name ?? '',
    role: profile.role,
    trackId: profile.track_id,
  };
}

function isUserRole(value: string | null): value is UserRole {
  return value === 'ADMIN' || value === 'COMMITTEE';
}

function safeDecode(value: string | null): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    // A malformed header should never break rendering.
    return value;
  }
}
