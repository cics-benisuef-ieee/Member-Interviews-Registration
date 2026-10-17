import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';

const ADMIN_HOME = '/admin';
const BOARD_HOME = '/board';

/** Refreshes the auth session and enforces route-level role access. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
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

  if (!user) {
    if (isProtectedArea) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Signed-in users do not need the login page.
  if (path === '/login') {
    const role = await fetchRole(supabase, user.id);
    const url = request.nextUrl.clone();
    url.pathname = role === 'ADMIN' ? ADMIN_HOME : BOARD_HOME;
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (isProtectedArea) {
    const role = await fetchRole(supabase, user.id);
    const url = request.nextUrl.clone();

    if (path.startsWith('/admin') && role !== 'ADMIN') {
      url.pathname = BOARD_HOME;
      url.search = '';
      return NextResponse.redirect(url);
    }

    if (path.startsWith('/board') && role === 'ADMIN') {
      url.pathname = ADMIN_HOME;
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

async function fetchRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<'ADMIN' | 'COMMITTEE' | null> {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
  return data?.role ?? null;
}
