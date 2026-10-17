import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Runs on every non-asset request.
 *
 * Note: with a `src` directory this file must live in `src/`, not the project
 * root — a root-level middleware.ts is ignored and the app silently loses
 * session refresh and route protection.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Everything except static assets needs a session check.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
