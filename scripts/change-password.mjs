// ============================================================================
// Password change — rotates ONE account's password, identified by email.
//
// Usage:
//   npm run db:password -- network@cics.benisuef.ieee           # generates + prints
//   npm run db:password -- network@cics.benisuef.ieee 'Chosen1!'
//   npm run db:password -- network                               # domain is assumed
//
// Unlike db:passwords (which applies TRACK_DEFAULT_PASSWORD to every login),
// this touches exactly one account — the admin account included, which has no
// password UI in the app.
// ============================================================================

import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL_DOMAIN = process.env.TRACK_EMAIL_DOMAIN ?? 'ieee.local';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (or the legacy SUPABASE_SERVICE_ROLE_KEY) in .env',
  );
  process.exit(1);
}

/** ~96 bits of entropy — safe to read aloud to a committee. */
const generatePassword = () => randomBytes(12).toString('base64url');

const [, , rawEmail, chosenPassword] = process.argv;

if (!rawEmail) {
  console.error('Usage: npm run db:password -- <email> [new-password]');
  console.error('Example: npm run db:password -- admin@' + EMAIL_DOMAIN);
  process.exit(1);
}

// Allow bare track slugs, since every track login is <slug>@<domain>.
const email = rawEmail.includes('@')
  ? rawEmail.toLowerCase()
  : `${rawEmail}@${EMAIL_DOMAIN}`.toLowerCase();
if (email !== rawEmail) console.log(`resolved to: ${email}`);

if (chosenPassword !== undefined && chosenPassword.length < 8) {
  console.warn(
    `! warning: a ${chosenPassword.length}-character password is weak for a shared login`,
  );
}

const password = chosenPassword || generatePassword();

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Find the account. listUsers is paginated; 1000 covers any realistic chapter.
const { data: userList, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error('Could not list users:', listError.message);
  process.exit(1);
}

const account = userList.users.find((user) => user.email?.toLowerCase() === email);

if (!account) {
  console.error(`No account found for ${email}.`);
  console.error('Known logins:');
  for (const user of userList.users) console.error(`  ${user.email}`);
  process.exit(1);
}

// Every login in this app has a profile row; a match without one suggests the
// wrong project or a hand-made account, so confirm before overwriting.
const { data: profile } = await db
  .from('profiles')
  .select('display_name, role')
  .eq('id', account.id)
  .maybeSingle();

if (!profile) {
  console.error(`${email} exists in auth but has no profile row — refusing to change it.`);
  process.exit(1);
}

const { error: updateError } = await db.auth.admin.updateUserById(account.id, { password });
if (updateError) {
  console.error(`Could not change the password: ${updateError.message}`);
  process.exit(1);
}

// Prove the new password actually works rather than trusting the API's 200.
const check = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error: signInError } = await check.auth.signInWithPassword({ email, password });
await check.auth.signOut();

console.log(`\nPassword changed for ${email}`);
console.log(`  role:  ${profile.role}${profile.display_name ? ` (${profile.display_name})` : ''}`);
console.log(`  login: ${password}`);
console.log(`  verified: ${signInError ? `NO — ${signInError.message}` : 'yes'}`);

if (!chosenPassword) console.log('\nThis password is shown only once. Store it now.');
