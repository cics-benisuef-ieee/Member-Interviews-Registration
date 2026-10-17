import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { IDENTITY_HEADERS, IDENTITY_HEADER_NAMES } from '@/domain/auth/identity-headers';
import type { UserRole } from '@/domain/auth/auth.types';

const ADMIN_HOME = '/admin';
const BOARD_HOME = '/board';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** The profile fields the app needs to authorise and label a request. */
interface RequestProfile {
  role: UserRole;
  track_id: string | null;
  display_name: string | null;
}

/**
 * Verifies the session once, enforces role-based access, and forwards the
 * verified identity to the render as request headers.
 *
 * Doing it here rather than in each layout means a protected page costs one
 * session check instead of one per component that asks "who is this?".
 */
export async function updateSession(request: NextRequest) {
  // Strip any inbound identity headers before we trust the request: otherwise a
  // client could simply send `x-user-role: ADMIN` and impersonate an admin.
  const requestHeaders = new Headers(request.headers);
  for (const name of IDENTITY_HEADER_NAMES) requestHeaders.delete(name);

  // Tokens Supabase refreshes while we verify. They are attached to whichever
  // response we return, including redirects.
  const refreshedCookies: CookieToSet[] = [];

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          refreshedCookies.push(...cookiesToSet);
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser() — it can cause
  // hard-to-debug session refresh bugs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtectedArea = path.startsWith('/board') || path.startsWith('/admin');

  const continueWithIdentity = () =>
    applyCookies(NextResponse.next({ request: { headers: requestHeaders } }), refreshedCookies);

  const redirectTo = (pathname: string, nextPath?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = '';
    if (nextPath) url.searchParams.set('next', nextPath);
    return applyCookies(NextResponse.redirect(url), refreshedCookies);
  };

  if (!user) {
    return isProtectedArea ? redirectTo('/login', path) : continueWithIdentity();
  }

  const profile = await fetchProfile(supabase, user.id);

  // The login page is only useful to people who are not signed in.
  if (path === '/login') {
    // A signed-in account with no profile row cannot be authorised anywhere, so
    // we let it stay on /login (where it can sign out) instead of bouncing it
    // between /login and /board forever.
    if (!profile) return continueWithIdentity();
    return redirectTo(profile.role === 'ADMIN' ? ADMIN_HOME : BOARD_HOME);
  }

  if (isProtectedArea) {
    if (!profile) return redirectTo('/login', path);
    if (path.startsWith('/admin') && profile.role !== 'ADMIN') return redirectTo(BOARD_HOME);
    if (path.startsWith('/board') && profile.role === 'ADMIN') return redirectTo(ADMIN_HOME);
  }

  if (profile) {
    requestHeaders.set(IDENTITY_HEADERS.id, user.id);
    requestHeaders.set(IDENTITY_HEADERS.email, user.email ?? '');
    requestHeaders.set(IDENTITY_HEADERS.role, profile.role);
    requestHeaders.set(IDENTITY_HEADERS.trackId, profile.track_id ?? '');
    // Display names can contain non-ASCII characters; headers must stay ASCII.
    requestHeaders.set(
      IDENTITY_HEADERS.displayName,
      encodeURIComponent(profile.display_name ?? ''),
    );
  }

  return continueWithIdentity();
}

function applyCookies(response: NextResponse, cookies: CookieToSet[]): NextResponse {
  for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
  return response;
}

async function fetchProfile(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<RequestProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('role, track_id, display_name')
    .eq('id', userId)
    .single();

  return (data as RequestProfile | null) ?? null;
}
