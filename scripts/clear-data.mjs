// Empties the queue so the site starts from a clean slate: every interview is
// removed, then every member.
//
// A JSON backup is written first. This is irreversible at the database level,
// and a snapshot costs almost nothing to keep around.
//
// Tracks, their board logins, and app settings are configuration rather than
// queue data, so they are deliberately left untouched.
import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'node:fs/promises';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

// Supabase caps a single response, so page through large tables rather than
// trusting one request to return everything.
async function fetchAll(table) {
  const rows = [];
  const PAGE = 1000;

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Reading ${table} failed: ${error.message}`);

    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

const interviews = await fetchAll('interviews');
const members = await fetchAll('members');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `/tmp/opencode/backup-${stamp}.json`;
await writeFile(backupPath, JSON.stringify({ interviews, members }, null, 2));
console.log(
  `Backed up ${members.length} members and ${interviews.length} interviews to ${backupPath}`,
);

// Interviews go first: they reference members, and their audit_log rows follow
// automatically through ON DELETE CASCADE. The neq() guard keeps the request
// syntactically explicit about deleting every row.
const { error: interviewError } = await db.from('interviews').delete().neq('id', ZERO_UUID);
if (interviewError) throw new Error(`Deleting interviews failed: ${interviewError.message}`);

const { error: memberError } = await db.from('members').delete().neq('id', ZERO_UUID);
if (memberError) throw new Error(`Deleting members failed: ${memberError.message}`);

const { count } = await db.from('interviews').select('id', { count: 'exact', head: true });
const { count: memberCount } = await db
  .from('members')
  .select('id', { count: 'exact', head: true });
console.log(`Queue is empty — ${count} interviews and ${memberCount} members remain.`);
