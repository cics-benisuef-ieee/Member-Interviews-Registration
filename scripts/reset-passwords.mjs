// ============================================================================
// Password rotation — sets every login's password to TRACK_DEFAULT_PASSWORD.
//
// Why this exists: seed.mjs is idempotent and only sets a password when it
// creates an account. That is deliberate, so re-running the seed never
// clobbers a password changed from the admin panel. The side effect is that
// editing TRACK_DEFAULT_PASSWORD after the first seed does nothing on its own
// — run this to push the new value to existing logins.
//
// Usage:  npm run db:passwords
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.TRACK_DEFAULT_PASSWORD;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (or the legacy SUPABASE_SERVICE_ROLE_KEY) in .env',
  );
  process.exit(1);
}

if (!PASSWORD) {
  console.error('TRACK_DEFAULT_PASSWORD is not set in .env — nothing to rotate to.');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Only accounts that have a profile are ours to touch — this leaves any other
// auth user in the project alone.
const { data: profiles, error: profilesError } = await db
  .from('profiles')
  .select('id, display_name');
if (profilesError) {
  console.error('Could not read profiles:', profilesError.message);
  process.exit(1);
}

const { data: userList, error: usersError } = await db.auth.admin.listUsers({ perPage: 1000 });
if (usersError) {
  console.error('Could not list users:', usersError.message);
  process.exit(1);
}

const usersById = new Map(userList.users.map((user) => [user.id, user]));

let rotated = 0;
for (const profile of profiles) {
  const user = usersById.get(profile.id);
  if (!user) {
    console.warn(`  ! skipped ${profile.display_name}: no matching auth account`);
    continue;
  }

  const { error } = await db.auth.admin.updateUserById(profile.id, { password: PASSWORD });
  if (error) {
    console.error(`  ! failed for ${user.email}: ${error.message}`);
    process.exit(1);
  }

  rotated += 1;
  console.log(`  rotated: ${user.email}`);
}

console.log(`\nRotated ${rotated} login(s) to TRACK_DEFAULT_PASSWORD.`);
