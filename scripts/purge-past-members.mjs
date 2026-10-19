// ============================================================================
// Purge past members — clears the live `members` table of everyone whose day is
// over, so a finished day's people stop lingering in the admin members list.
//
// Their interviews stay, member snapshot and all (migration 0010), so history is
// untouched: every interview still shows the person's name, contact details and
// a durable `member_ref`. Nothing is lost — only the working table is emptied.
//
// Usage:  npm run db:purge-past
//         npm run db:purge-past -- 2026-10-01   (only members before that day)
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const before = process.argv[2] ?? null;

const { data: day } = await db.rpc('get_queue_day');
console.log(`Purging members whose interviews are all before ${before ?? day} …`);

const { data: removed, error } = await db.rpc('purge_past_members', { p_before: before });

if (error) {
  console.error(`Could not purge past members: ${error.message}`);
  console.error('If this mentions a missing function, run 0010_member_history.sql first.');
  process.exit(1);
}

console.log(`Removed ${removed} member(s). Their interview history was kept.`);
