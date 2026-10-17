import { redirect } from 'next/navigation';
import { getSessionUser } from './session';
import type { SessionUser } from './auth.types';

/** Requires any signed-in account; otherwise sends the visitor to /login. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

/** Requires an admin account; a track account is sent to its own board. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== 'ADMIN') redirect('/board');
  return user;
}

/** Requires a track's shared login; an admin is sent to the admin panel. */
export async function requireTrackUser(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role === 'ADMIN') redirect('/admin');
  if (!user.trackId) redirect('/login');
  return user;
}
