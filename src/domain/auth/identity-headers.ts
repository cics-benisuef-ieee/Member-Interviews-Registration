/**
 * Identity headers that the middleware attaches to a request after Supabase has
 * verified the session.
 *
 * Server components read these instead of asking Supabase again, which turns
 * "one session check per component" into one check per request.
 *
 * Security: the middleware deletes any inbound copy of these names before it
 * sets them, so a client cannot promote itself to admin by sending the header.
 * They are only trustworthy on a path matched by the middleware.
 */
export const IDENTITY_HEADERS = {
  id: 'x-user-id',
  email: 'x-user-email',
  role: 'x-user-role',
  trackId: 'x-user-track',
  displayName: 'x-user-name',
} as const;

export const IDENTITY_HEADER_NAMES: readonly string[] = Object.values(IDENTITY_HEADERS);
