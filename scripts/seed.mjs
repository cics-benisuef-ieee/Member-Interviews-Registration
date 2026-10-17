// ============================================================================
// Seed script — creates the 11 tracks (A→Z), an admin login, and one shared
// login per track. Idempotent: safe to run multiple times.
//
// Usage:  npm run db:seed
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const TRACK_NAMES = [
  'Agentic AI',
  'Back-end Development',
  'Data Analysis',
  'Embedded Systems',
  'Flutter',
  'Front-end Development',
  'Machine Learning',
  'Mechanical Design',
  'Network',
  'Red-Team',
  'UI/UX',
];

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase is retiring the legacy `service_role` key in favour of `sb_secret_…`.
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL_DOMAIN = process.env.TRACK_EMAIL_DOMAIN ?? 'ieee.local';
const SEED_PASSWORD = process.env.TRACK_DEFAULT_PASSWORD ?? 'ChangeMe123!';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (or the legacy SUPABASE_SERVICE_ROLE_KEY) in .env',
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function ensureTracks() {
  const { data: existing, error } = await db.from('tracks').select('id, name, slug, is_active');
  if (error) throw error;

  const byName = new Map(existing.map((t) => [t.name, t]));

  for (const name of TRACK_NAMES) {
    if (byName.has(name)) continue;
    const { error } = await db
      .from('tracks')
      .insert({ name, slug: slugify(name), is_active: true });
    if (error) throw error;
    console.log(`+ track: ${name}`);
  }

  // Re-read so newly inserted tracks get their database-assigned ids.
  const { data: tracks, error: tracksError } = await db.from('tracks').select('id, name, slug');
  if (tracksError) throw tracksError;
  return tracks.sort((a, b) => a.name.localeCompare(b.name));
}

async function listExistingUsers() {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return new Map(data.users.map((u) => [u.email, u]));
}

async function ensureUser(existingUsers, email, displayName, role, trackId) {
  let user = existingUsers.get(email);

  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: SEED_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log(`+ login:  ${email}`);
  }

  const { error } = await db
    .from('profiles')
    .upsert(
      { id: user.id, display_name: displayName, role, track_id: trackId },
      { onConflict: 'id' },
    );
  if (error) throw error;

  return user.id;
}

async function main() {
  console.log('Seeding tracks…');
  const tracks = await ensureTracks();

  console.log('Seeding logins…');
  const users = await listExistingUsers();

  await ensureUser(users, `admin@${EMAIL_DOMAIN}`, 'Chapter Admin', 'ADMIN', null);
  for (const track of tracks) {
    await ensureUser(users, `${track.slug}@${EMAIL_DOMAIN}`, track.name, 'COMMITTEE', track.id);
  }

  console.log('\nDone. Credentials (password shared for all logins):');
  console.log(`  password: ${SEED_PASSWORD}\n`);
  console.log(`  admin@${EMAIL_DOMAIN}                        → Admin panel`);
  for (const track of tracks) {
    console.log(`  ${`${track.slug}@${EMAIL_DOMAIN}`.padEnd(36)} → ${track.name}`);
  }
  console.log('\nExisting logins keep their current password.');
  console.log('After changing TRACK_DEFAULT_PASSWORD, run `npm run db:passwords` to apply it.');
}

main().catch((error) => {
  console.error('Seed failed:', error.message ?? error);
  process.exit(1);
});
