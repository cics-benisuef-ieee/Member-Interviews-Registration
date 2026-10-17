export type UserRole = 'ADMIN' | 'COMMITTEE';

/** The signed-in account: an admin, or a shared login bound to one track. */
export interface SessionUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  trackId: string | null;
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === 'ADMIN';
}

/** Home screen for a role — used after login and by redirects. */
export function homePathFor(user: SessionUser): string {
  return isAdmin(user) ? '/admin' : '/board';
}
