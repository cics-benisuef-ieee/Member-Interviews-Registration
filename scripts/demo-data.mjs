// ============================================================================
// Demo data — realistic members and interviews so every screen has something to
// render. Without this the database is empty and most pages only ever show
// their empty state, which hides bugs.
//
// Idempotent and scoped: only members whose email ends in @demo.local are
// touched, so running this repeatedly replaces exactly the demo data and never
// touches real registrations.
//
// Usage:  npm run db:demo
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_DOMAIN = 'demo.local';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Deterministic randomness so every run produces the same dataset ─────────

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261018);
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (items) => items[Math.floor(rand() * items.length)];

const FIRST_NAMES = [
  'Ahmed',
  'Mariam',
  'Youssef',
  'Salma',
  'Omar',
  'Nour',
  'Khaled',
  'Farida',
  'Mostafa',
  'Aya',
  'Hassan',
  'Rana',
  'Ali',
  'Hana',
  'Ziad',
  'Layla',
  'Karim',
  'Jana',
  'Mahmoud',
  'Dina',
  'Amr',
  'Yara',
  'Tarek',
  'Menna',
  'Bassem',
  'Rawan',
  'Sherif',
  'Nada',
  'Ibrahim',
  'Sara',
];

const LAST_NAMES = [
  'Hassan',
  'Mahmoud',
  'Ibrahim',
  'El-Sayed',
  'Abdel-Rahman',
  'Fathy',
  'Mansour',
  'Zaki',
  'Shawky',
  'Gaber',
  'Nabil',
  'Farouk',
  'Soliman',
  'Adel',
];

/** A stable, unique demo member. The index keeps emails collision-free. */
function makeMember(index) {
  const fullName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  return {
    full_name: fullName,
    phone: `+20 1${int(0, 2)} ${int(100, 999)} ${int(1000, 9999)}`,
    email: `member${index}@${DEMO_DOMAIN}`,
    notes: rand() < 0.25 ? 'Prefers an afternoon slot.' : null,
  };
}

/** Formats a date-string day plus an hour offset as a timestamptz. */
const stamp = (day, hour, minute) =>
  `${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;

function shiftDay(day, deltaDays) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

/** Fails loudly if two generated rows would collide on a unique constraint. */
function assertUnique(rows, keyOf, label) {
  const seen = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    if (seen.has(key)) {
      console.error(`Generated a duplicate ${label}: ${key}`);
      console.error('  first:', seen.get(key));
      console.error('  again:', row);
      process.exit(1);
    }
    seen.set(key, row);
  }
}

// ── Data generation ────────────────────────────────────────────────────────

/** The outcome half of a finished interview on a past day. */
function pastDayOutcome(day, index) {
  const startHour = 9 + (index % 6);
  return {
    status: rand() < 0.72 ? 'PASSED' : 'REJECTED',
    started_at: stamp(day, startHour, 0),
    finished_at: stamp(day, startHour, int(15, 45)),
  };
}

async function main() {
  const { data: today, error: dayError } = await db.rpc('get_queue_day');
  if (dayError) {
    console.error('Could not read the queue day:', dayError.message);
    process.exit(1);
  }

  const { data: tracks, error: trackError } = await db
    .from('tracks')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  if (trackError || !tracks.length) {
    console.error('Could not read tracks:', trackError?.message ?? 'no active tracks');
    process.exit(1);
  }

  console.log(`Replacing demo data for ${today} and the two days before it…`);

  // Only ever remove our own rows; interviews cascade from members.
  const { error: clearError } = await db.from('members').delete().like('email', `%@${DEMO_DOMAIN}`);
  if (clearError) {
    console.error('Could not clear previous demo data:', clearError.message);
    process.exit(1);
  }

  const days = [today, shiftDay(today, -1), shiftDay(today, -2)];

  // Queue numbers must not collide with anything already stored for the same
  // track and day — including real registrations made through the public form.
  // Start each (track, day) counter after the highest number already present.
  const { data: existingSlots, error: slotError } = await db
    .from('interviews')
    .select('track_id, queue_day, queue_number');
  if (slotError) {
    console.error('Could not read existing queue numbers:', slotError.message);
    process.exit(1);
  }

  const highestSlot = new Map();
  for (const row of existingSlots ?? []) {
    const key = `${row.track_id}|${row.queue_day}`;
    highestSlot.set(key, Math.max(highestSlot.get(key) ?? 0, row.queue_number));
  }

  /** Hands out the next free queue number for a track on a day. */
  function allocSlot(trackId, day) {
    const key = `${trackId}|${day}`;
    const next = (highestSlot.get(key) ?? 0) + 1;
    highestSlot.set(key, next);
    return next;
  }

  const memberRows = [];
  for (let i = 1; i <= 90; i += 1) memberRows.push(makeMember(i));

  const { data: members, error: memberError } = await db
    .from('members')
    .insert(memberRows)
    .select('id, full_name');
  if (memberError) {
    console.error('Could not insert demo members:', memberError.message);
    process.exit(1);
  }

  const interviewRows = [];
  let cursor = 0;
  const nextMember = () => members[cursor++ % members.length].id;

  // ── Today: a live mix, including tracks that need attention ──────────────
  tracks.forEach((track, trackIndex) => {
    const isLive = trackIndex < 4; // first four tracks have someone interviewing

    // Finished earlier today.
    for (let i = 0; i < int(1, 3); i += 1) {
      interviewRows.push({
        member_id: nextMember(),
        track_id: track.id,
        queue_day: today,
        queue_number: allocSlot(track.id, today),
        status: rand() < 0.7 ? 'PASSED' : 'REJECTED',
        started_at: stamp(today, 9 + i, 0),
        finished_at: stamp(today, 9 + i, int(20, 50)),
      });
    }

    if (isLive) {
      interviewRows.push({
        member_id: nextMember(),
        track_id: track.id,
        queue_day: today,
        queue_number: allocSlot(track.id, today),
        status: 'IN_INTERVIEW',
        started_at: stamp(today, 11, int(5, 55)),
      });
    }

    // Everyone still waiting — tracks without a live interview are the ones
    // the admin "needs attention" panel should surface.
    for (let i = 0; i < int(1, 5); i += 1) {
      interviewRows.push({
        member_id: nextMember(),
        track_id: track.id,
        queue_day: today,
        queue_number: allocSlot(track.id, today),
        status: 'WAITING',
      });
    }
  });

  // ── Past days: completed records for the history table ───────────────────
  for (const day of days.slice(1)) {
    tracks.forEach((track) => {
      for (let i = 0; i < int(3, 6); i += 1) {
        interviewRows.push({
          member_id: nextMember(),
          track_id: track.id,
          queue_day: day,
          queue_number: allocSlot(track.id, day),
          ...pastDayOutcome(day, i),
        });
      }
    });
  }

  // Catch generation mistakes locally, where the message is useful, rather than
  // letting the database reject the batch with a constraint name.
  assertUnique(
    interviewRows,
    (row) => `${row.track_id}|${row.queue_day}|${row.queue_number}`,
    'queue slot',
  );
  assertUnique(
    interviewRows,
    (row) => `${row.member_id}|${row.track_id}|${row.queue_day}`,
    'member slot',
  );

  const { error: interviewError } = await db.from('interviews').insert(interviewRows);
  if (interviewError) {
    console.error('Could not insert demo interviews:', interviewError.message);
    process.exit(1);
  }
  // ── One same-day transfer, so the board and history show the linkage ─────
  // Uses a dedicated member outside the rotating pool: a transfer is the same
  // person interviewed by one track then queued for another, and the pool would
  // risk colliding with the (member, track, day) unique constraint.
  const { data: transferMember, error: transferMemberError } = await db
    .from('members')
    .insert({
      full_name: 'Youssef Abdel-Rahman',
      phone: '+20 100 555 0123',
      email: `transfer@${DEMO_DOMAIN}`,
      notes: 'Originally applied for Front-end Development.',
    })
    .select('id')
    .single();
  if (transferMemberError) {
    console.error('Could not insert the transfer member:', transferMemberError.message);
    process.exit(1);
  }

  const { data: source, error: sourceError } = await db
    .from('interviews')
    .insert({
      member_id: transferMember.id,
      track_id: tracks[0].id,
      queue_day: today,
      queue_number: allocSlot(tracks[0].id, today),
      status: 'NEEDS_ANOTHER_TRACK',
      started_at: stamp(today, 10, 0),
      finished_at: stamp(today, 10, 30),
      notes: 'Strong on fundamentals; better suited to a different track.',
    })
    .select('id')
    .single();
  if (sourceError) {
    console.error('Could not insert the source interview:', sourceError.message);
    process.exit(1);
  }

  const { error: transferError } = await db.from('interviews').insert({
    member_id: transferMember.id,
    track_id: tracks[1].id,
    queue_day: today,
    queue_number: allocSlot(tracks[1].id, today),
    status: 'WAITING',
    transferred_from_id: source.id,
  });
  if (transferError) {
    console.error('Could not insert the transferred interview:', transferError.message);
    process.exit(1);
  }

  console.log(`  members:    ${members.length + 1}`);
  console.log(`  interviews: ${interviewRows.length + 2} across ${days.length} days`);
  console.log(
    `  live now:   ${tracks
      .slice(0, 4)
      .map((t) => t.name)
      .join(', ')}`,
  );
  console.log(
    `  transferred: ${transferMember.full_name ?? 'demo member'} ${tracks[0].name} → ${tracks[1].name}`,
  );
  console.log(
    `\nRemove it all later with: delete from members where email like '%@${DEMO_DOMAIN}';`,
  );
}

main().catch((error) => {
  console.error('Demo seed failed:', error.message ?? error);
  process.exit(1);
});
