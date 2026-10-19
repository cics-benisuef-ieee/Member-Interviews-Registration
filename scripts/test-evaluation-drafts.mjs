// ============================================================================
// Integration test for evaluation drafts, post-finish editing, and the member
// snapshot (migrations 0008 + 0009 + 0010 + the app layers).
//
// It exercises the real path a committee member takes on the board:
//
//   form fields → evaluationFromFormData → evaluationInputSchema (zod)
//     → save_interview_evaluation (the live database function)
//     → the row as the board reads it back
//     → complete_interview, the gate that must stay shut for a draft
//
// The TypeScript domain files are compiled with the repo's own tsc into
// build/ (gitignored), so the test runs the same code the app ships — not a
// copy of it. Everything runs against the project's Supabase on a scratch
// member marked @itest.local, which is removed again at the end.
//
// Usage:  npm run db:test-evaluation
// ============================================================================

import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL_DOMAIN = process.env.TRACK_EMAIL_DOMAIN ?? 'ieee.local';
const SEED_PASSWORD = process.env.TRACK_DEFAULT_PASSWORD ?? 'ChangeMe123!';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

// ── The app's own parsing code, compiled from src/ ─────────────────────────

console.log('Compiling the domain layer from src/ …');
execFileSync(
  'npx',
  [
    'tsc',
    'src/domain/interviews/evaluation.ts',
    'src/domain/interviews/evaluation.schema.ts',
    '--outDir',
    'build/itest',
    '--module',
    'commonjs',
    '--target',
    'es2022',
    '--moduleResolution',
    'node',
    '--esModuleInterop',
    '--skipLibCheck',
  ],
  { stdio: 'inherit' },
);

const { evaluationFromFormData, evaluationInputSchema, scoreFieldName, notesFieldName } =
  await import('../build/itest/evaluation.schema.js');
// The criteria list comes from the app too: the test never retypes a field name,
// because a single mistyped key ("notes_mitivation") silently reads as empty.
const { EVALUATION_CRITERIA } = await import('../build/itest/evaluation.js');

// ── Clients ────────────────────────────────────────────────────────────────

const service = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** The same calls as the server actions, running as a signed-in admin. */
const board = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** A track's own shared login — used to prove what a board may and may not do. */
const trackClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Tiny assertion harness ─────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function check(label, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  ok  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

/** Builds the form exactly as EvaluationForm does, field name for field name. */
function formFields(fields) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined) formData.append(key, String(value));
  }
  return formData;
}

/**
 * Runs a set of form fields through the app's parsing — the same two calls
 * saveInterviewEvaluationAction makes before anything reaches the database.
 */
function parseLikeTheApp(interviewId, fields) {
  const { data, scores } = evaluationFromFormData(formFields({ interviewId, ...fields }));
  return evaluationInputSchema.parse({
    interviewId,
    data,
    scores,
    recommendation: fields.recommendation || undefined,
    finalNotes: fields.finalNotes || undefined,
  });
}

/** Saves through the database exactly as the repo layer does. */
async function saveOnServer(client, interviewId, parsed) {
  return client.rpc('save_interview_evaluation', {
    p_interview_id: interviewId,
    p_evaluation: { data: parsed.data, scores: parsed.scores },
    p_recommendation: parsed.recommendation ?? null,
    p_final_notes: parsed.finalNotes ?? null,
  });
}

async function readInterview(id) {
  const { data, error } = await service
    .from('interviews')
    .select(
      'status, evaluation, overall_total, recommendation, final_notes, evaluation_updated_at, finished_at',
    )
    .eq('id', id)
    .single();
  if (error) throw new Error(`Could not read the test interview: ${error.message}`);
  return data;
}

/**
 * The eleven criteria as a filled-in form would submit them. The scores and
 * field names come from the app's own criteria list (and its key helpers), so
 * the test cannot drift from the form it is meant to imitate. Returns the
 * expected total alongside the fields.
 */
function completeFormFields({ note, recommendation = 'ACCEPTED' }) {
  const fields = {
    interviewerTechnical: 'Sara Nabil',
    interviewerAttitude: 'Omar Farid',
    recommendation,
    finalNotes: 'Solid fundamentals.',
  };

  let total = 0;
  for (const criterion of EVALUATION_CRITERIA) {
    const score = Math.min(8, criterion.max);
    fields[scoreFieldName(criterion.key)] = String(score);
    fields[notesFieldName(criterion.key)] = `${note} (${criterion.key})`;
    total += score;
  }
  return { fields, total };
}

// ── The test ───────────────────────────────────────────────────────────────

let scratchMemberId = null;
let scratchInterviewId = null;
let pastMemberId = null;
let pastInterviewId = null;
let ownedMemberId = null;
let ownedInterviewId = null;

try {
  // 0 · The deployed function must take drafts (0008+) and yet refuse them for
  //     want of permission on an id that cannot exist, not for its status.
  section('0 · Migration state');
  const probe = await service.rpc('save_interview_evaluation', {
    p_interview_id: '00000000-0000-0000-0000-000000000000',
    p_evaluation: { data: {}, scores: {} },
    p_recommendation: null,
  });
  const probeMessage = probe.error?.message ?? '';
  check(
    'migration 0009 is applied (a draft is validated, then permission is refused)',
    probeMessage.includes('not allowed to manage'),
    probeMessage
      ? `the database said "${probeMessage}" — run supabase/migrations/0009_post_finish_editing.sql in the SQL editor`
      : 'unexpected success for a non-existent interview',
  );

  const snapshotProbe = await service.from('interviews').select('member_ref').limit(1);
  check(
    'migration 0010 is applied (interviews carry a member snapshot)',
    !snapshotProbe.error,
    snapshotProbe.error
      ? `${snapshotProbe.error.message} — run supabase/migrations/0010_member_history.sql in the SQL editor`
      : '',
  );

  // 1 · Sign in as the admin login the seed script created.
  section('1 · Sign in');
  const { error: signInError } = await board.auth.signInWithPassword({
    email: `admin@${EMAIL_DOMAIN}`,
    password: SEED_PASSWORD,
  });
  check('admin login works', !signInError, signInError?.message);

  // 2 · Scratch data: one member, one queued interview, started.
  section('2 · Scratch interview');
  const { data: day } = await service.rpc('get_queue_day');
  const { data: track } = await service
    .from('tracks')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')
    .limit(1)
    .single();

  const { data: slots } = await service
    .from('interviews')
    .select('queue_number')
    .eq('track_id', track.id)
    .eq('queue_day', day);
  const queueNumber = Math.max(0, ...(slots ?? []).map((row) => row.queue_number)) + 1;

  const { data: member, error: memberError } = await service
    .from('members')
    .insert({
      full_name: 'Integration Test — Drafts',
      email: `itest-drafts@itest.local`,
      phone: '+20 100 000 0000',
      position: 'Test fixture',
      notes: 'Created and removed by scripts/test-evaluation-drafts.mjs',
    })
    .select('id')
    .single();
  scratchMemberId = member?.id ?? null;
  check('scratch member created', !memberError, memberError?.message);

  const { data: interview, error: interviewError } = await service
    .from('interviews')
    .insert({
      member_id: scratchMemberId,
      track_id: track.id,
      queue_day: day,
      queue_number: queueNumber,
      status: 'WAITING',
    })
    .select('id')
    .single();
  scratchInterviewId = interview?.id ?? null;
  check('scratch interview queued', !interviewError, interviewError?.message);

  const start = await board.rpc('start_interview', { p_interview_id: scratchInterviewId });
  const startedRow = await readInterview(scratchInterviewId);
  check(
    'interview started (WAITING → IN_INTERVIEW)',
    !start.error && startedRow.status === 'IN_INTERVIEW',
  );

  // 3 · The app layer: what the form's fields must survive.
  section('3 · App parsing (form fields → zod)');
  let parsed;
  try {
    parsed = parseLikeTheApp(scratchInterviewId, {});
    check('an empty draft parses', true);
  } catch (error) {
    check('an empty draft parses', false, error.message);
  }

  // A half-filled form: one criterion scored, one scored and annotated, one
  // only annotated — built through the same helpers the form uses.
  const partialFields = {
    [scoreFieldName('commitment')]: '7',
    [notesFieldName('commitment')]: 'Always on time.',
    [scoreFieldName('teamwork')]: '8',
    [notesFieldName('motivation')]: 'Asked why IEEE.',
    interviewerTechnical: 'Sara Nabil',
    recommendation: '',
  };
  let partialParsed;
  try {
    partialParsed = parseLikeTheApp(scratchInterviewId, partialFields);
    check('a half-filled draft parses (score only / note only / both)', true);
  } catch (error) {
    check('a half-filled draft parses (score only / note only / both)', false, error.message);
  }
  const partialJson = JSON.parse(JSON.stringify(partialParsed));
  check(
    'a note-only criterion keeps only its note',
    partialJson.scores.motivation?.notes === 'Asked why IEEE.' &&
      !('score' in partialJson.scores.motivation),
  );
  check(
    'a score-only criterion keeps only its score',
    partialJson.scores.teamwork?.score === 8 && !('notes' in partialJson.scores.teamwork),
  );
  check(
    'an untouched criterion is empty, not missing',
    Object.keys(partialJson.scores.flexibility ?? {}).length === 0,
    JSON.stringify(partialJson.scores.flexibility),
  );

  const junkCases = [
    [
      'score 11 on a criterion capped at 10',
      { [scoreFieldName('motivation')]: '11' },
      'Enter a score from 1 to 10.',
    ],
    [
      'score 0 (the form starts at 1)',
      { [scoreFieldName('motivation')]: '0' },
      'Enter a score from 1 to 10.',
    ],
    ['a non-numeric score', { [scoreFieldName('motivation')]: 'good' }, 'Enter a score.'],
    ['an unknown recommendation', { recommendation: 'MAYBE' }, 'Invalid enum value'],
  ];
  for (const [label, fields, expected] of junkCases) {
    let message = '';
    try {
      parseLikeTheApp(scratchInterviewId, fields);
    } catch (error) {
      message = error.errors ? error.errors[0].message : error.message;
    }
    check(`the app refuses ${label}`, message.includes(expected), `got "${message}"`);
  }

  // 4 · The database: an empty draft is still a draft.
  section('4 · Draft saves in the database');
  const emptySave = await saveOnServer(board, scratchInterviewId, parsed);
  check(
    'an empty draft saves (returns 0 points)',
    !emptySave.error && emptySave.data === 0,
    emptySave.error?.message,
  );

  let row = await readInterview(scratchInterviewId);
  check(
    'a draft leaves overall_total null',
    row.overall_total === null,
    `got ${row.overall_total}`,
  );
  check('a draft leaves the recommendation null', row.recommendation === null);
  check('a draft still stamps evaluation_updated_at', row.evaluation_updated_at !== null);
  check(
    'the data section round-trips empty names',
    row.evaluation?.data?.interviewerTechnical === '',
  );

  const partialSave = await saveOnServer(board, scratchInterviewId, partialParsed);
  check(
    'the partial draft saves and sums what was scored (0 + 8 + 7)',
    !partialSave.error && partialSave.data === 15,
    partialSave.error?.message ?? `got ${partialSave.data}`,
  );

  row = await readInterview(scratchInterviewId);
  check(
    'the partial draft still leaves overall_total null',
    row.overall_total === null,
    `got ${row.overall_total}`,
  );
  check(
    'a score without a note is stored',
    row.evaluation?.scores?.teamwork?.score === 8 && row.evaluation?.scores?.teamwork?.notes === '',
  );
  check(
    'a note without a score is stored',
    row.evaluation?.scores?.motivation?.notes === 'Asked why IEEE.' &&
      row.evaluation?.scores?.motivation?.score === undefined,
  );
  check(
    'a filled-in criterion is stored whole',
    row.evaluation?.scores?.commitment?.score === 7 &&
      row.evaluation?.scores?.commitment?.notes === 'Always on time.',
  );
  check(
    'one interviewer filled, one still empty',
    row.evaluation?.data?.interviewerTechnical === 'Sara Nabil' &&
      row.evaluation?.data?.interviewerAttitude === '',
  );

  // 5 · The gate: a draft can never finish an interview.
  section('5 · The finish gate stays shut for a draft');
  const earlyFinish = await board.rpc('complete_interview', {
    p_interview_id: scratchInterviewId,
    p_outcome: 'PASSED',
  });
  check(
    'complete_interview refuses a draft',
    earlyFinish.error?.message?.includes('Complete the evaluation') === true,
    earlyFinish.error?.message ?? 'it succeeded — the gate is broken',
  );

  // 6 · The database guards its own rules, whatever a client sends.
  section('6 · Database-side validation (bypassing the app on purpose)');
  const dbJunkCases = [
    [
      'a score above the criterion maximum',
      { motivation: { score: 11, notes: 'x' } },
      'between 0 and 10',
    ],
    ['a fractional score', { motivation: { score: 7.5, notes: 'x' } }, 'whole number'],
    ['a score sent as a string', { motivation: { score: '8', notes: 'x' } }, 'must be a number'],
  ];
  for (const [label, scores, expected] of dbJunkCases) {
    const { error } = await board.rpc('save_interview_evaluation', {
      p_interview_id: scratchInterviewId,
      p_evaluation: { data: { interviewerTechnical: 'a', interviewerAttitude: 'b' }, scores },
      p_recommendation: 'ACCEPTED',
      p_final_notes: null,
    });
    check(
      `the database refuses ${label}`,
      error?.message?.includes(expected) === true,
      error?.message ?? 'it succeeded',
    );
  }
  const badRecommendation = await board.rpc('save_interview_evaluation', {
    p_interview_id: scratchInterviewId,
    p_evaluation: { data: {}, scores: {} },
    p_recommendation: 'MAYBE',
    p_final_notes: null,
  });
  check(
    'the database refuses an unknown recommendation',
    badRecommendation.error?.message?.includes('Unknown recommendation') === true,
    badRecommendation.error?.message ?? 'it succeeded',
  );

  // 7 · A complete evaluation, saved the same way, unlocks finishing.
  section('7 · Completing and finishing');
  const { fields: completeFields, total: completeTotal } = completeFormFields({
    note: 'Consistently strong.',
  });
  const completeParsed = parseLikeTheApp(scratchInterviewId, completeFields);
  const completeSave = await saveOnServer(board, scratchInterviewId, completeParsed);
  check(
    `the complete form saves (${completeTotal} points)`,
    !completeSave.error && completeSave.data === completeTotal,
    completeSave.error?.message ?? `got ${completeSave.data}`,
  );

  row = await readInterview(scratchInterviewId);
  check(
    'a complete save writes overall_total',
    row.overall_total === completeTotal,
    `got ${row.overall_total}`,
  );
  check('a complete save stores the recommendation', row.recommendation === 'ACCEPTED');
  check('final notes are stored', row.final_notes === 'Solid fundamentals.');

  // 8 · Editing back into a draft re-locks the gate — nothing is one-way.
  section('8 · A completed evaluation can be edited back into a draft');
  const { data: scoresOnly } = await service
    .from('interviews')
    .select('evaluation')
    .eq('id', scratchInterviewId)
    .single();
  const edited = JSON.parse(JSON.stringify(scoresOnly.evaluation));
  delete edited.scores.commitment.notes;
  const relocked = await board.rpc('save_interview_evaluation', {
    p_interview_id: scratchInterviewId,
    p_evaluation: edited,
    p_recommendation: 'ACCEPTED',
    p_final_notes: 'Solid fundamentals.',
  });
  row = await readInterview(scratchInterviewId);
  check(
    'clearing one note makes it a draft again',
    !relocked.error && row.overall_total === null,
    relocked.error?.message ?? `total ${row.overall_total}`,
  );

  const relockFinish = await board.rpc('complete_interview', {
    p_interview_id: scratchInterviewId,
    p_outcome: 'PASSED',
  });
  check(
    'and the finish gate shuts again',
    relockFinish.error?.message?.includes('Complete the evaluation') === true,
    relockFinish.error?.message ?? 'it succeeded',
  );

  // 9 · Save complete again, then finish for real.
  section('9 · Finishing for real');
  const resave = await saveOnServer(board, scratchInterviewId, completeParsed);
  check(
    'saving the complete form again works',
    !resave.error && resave.data === completeTotal,
    resave.error?.message,
  );
  const finish = await board.rpc('complete_interview', {
    p_interview_id: scratchInterviewId,
    p_outcome: 'PASSED',
  });
  row = await readInterview(scratchInterviewId);
  check(
    'the interview passes',
    !finish.error && row.status === 'PASSED' && row.finished_at !== null,
    finish.error?.message,
  );

  const afterFinish = await saveOnServer(board, scratchInterviewId, completeParsed);
  check(
    'a finished interview can be edited',
    !afterFinish.error && afterFinish.data === completeTotal,
    afterFinish.error?.message ?? `got ${afterFinish.data}`,
  );

  const { data: revisionAudits } = await service
    .from('audit_log')
    .select('detail')
    .eq('interview_id', scratchInterviewId)
    .eq('action', 'EVALUATION_SAVED')
    .order('created_at', { ascending: false })
    .limit(1);
  check(
    'the revision is audited with the status it corrected',
    revisionAudits?.[0]?.detail?.status === 'PASSED',
    JSON.stringify(revisionAudits?.[0]?.detail),
  );

  // 10 · The decision itself can be swapped, in either direction.
  section('10 · Changing the decision');
  const reject = await board.rpc('change_interview_outcome', {
    p_interview_id: scratchInterviewId,
    p_outcome: 'REJECTED',
  });
  row = await readInterview(scratchInterviewId);
  check(
    'PASSED → REJECTED works',
    !reject.error && row.status === 'REJECTED',
    reject.error?.message ?? `status ${row.status}`,
  );

  const sameDecision = await board.rpc('change_interview_outcome', {
    p_interview_id: scratchInterviewId,
    p_outcome: 'REJECTED',
  });
  check(
    'changing to the same decision is a no-op',
    !sameDecision.error,
    sameDecision.error?.message,
  );

  const pass = await board.rpc('change_interview_outcome', {
    p_interview_id: scratchInterviewId,
    p_outcome: 'PASSED',
  });
  row = await readInterview(scratchInterviewId);
  check('REJECTED → PASSED works', !pass.error && row.status === 'PASSED', pass.error?.message);

  // 11 · Reopening puts the member back in the queue with the evaluation intact.
  section('11 · Reopening a finished interview');
  const reopen = await board.rpc('reopen_interview', { p_interview_id: scratchInterviewId });
  row = await readInterview(scratchInterviewId);
  check(
    'a finished interview reopens as WAITING',
    !reopen.error && row.status === 'WAITING' && row.finished_at === null,
    reopen.error?.message ?? `status ${row.status}`,
  );
  check(
    'reopening keeps the evaluation',
    row.overall_total === completeTotal,
    `got ${row.overall_total}`,
  );

  const reopenAgain = await board.rpc('reopen_interview', { p_interview_id: scratchInterviewId });
  check(
    'an open interview cannot be reopened',
    reopenAgain.error?.message?.includes('Only a finished interview') === true,
    reopenAgain.error?.message ?? 'it succeeded',
  );

  const changeOpen = await board.rpc('change_interview_outcome', {
    p_interview_id: scratchInterviewId,
    p_outcome: 'PASSED',
  });
  check(
    'a decision can only be changed on a finished interview',
    changeOpen.error?.message?.includes('Only a finished pass or reject') === true,
    changeOpen.error?.message ?? 'it succeeded',
  );

  // 12 · A transfer can be cancelled until the receiving track acts.
  section('12 · Reopening a transfer');
  const { data: activeTracks } = await service
    .from('tracks')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
    .limit(2);
  const target = (activeTracks ?? []).find((candidate) => candidate.id !== track.id);

  if (!target) {
    check('a second active track exists for the transfer checks', false, 'only one active track');
  } else {
    const childOf = async () => {
      const { data } = await service
        .from('interviews')
        .select('id, status, started_at')
        .eq('transferred_from_id', scratchInterviewId)
        .maybeSingle();
      return data;
    };

    await board.rpc('start_interview', { p_interview_id: scratchInterviewId });
    const handOff = await board.rpc('complete_interview', {
      p_interview_id: scratchInterviewId,
      p_outcome: 'TRANSFER',
      p_target_track_id: target.id,
    });
    const firstChild = await childOf();
    check(
      'the hand-off lands in the target queue as WAITING',
      !handOff.error && firstChild?.status === 'WAITING' && firstChild.started_at === null,
      handOff.error?.message,
    );

    const cancel = await board.rpc('reopen_interview', { p_interview_id: scratchInterviewId });
    check(
      'reopening cancels an untouched hand-off',
      !cancel.error && (await childOf()) === null,
      cancel.error?.message,
    );

    // Land a fresh hand-off, then let the target start the member.
    await board.rpc('start_interview', { p_interview_id: scratchInterviewId });
    await board.rpc('complete_interview', {
      p_interview_id: scratchInterviewId,
      p_outcome: 'TRANSFER',
      p_target_track_id: target.id,
    });
    const secondChild = await childOf();
    await board.rpc('start_interview', { p_interview_id: secondChild?.id });

    const blocked = await board.rpc('reopen_interview', { p_interview_id: scratchInterviewId });
    check(
      'a hand-off already started by the target cannot be cancelled',
      blocked.error?.message?.includes('already started') === true,
      blocked.error?.message ?? 'it succeeded',
    );
  }

  // 13 · The audit trail says which saves were drafts.
  section('13 · Audit trail');
  const { data: audits } = await service
    .from('audit_log')
    .select('action, detail')
    .eq('interview_id', scratchInterviewId)
    .eq('action', 'EVALUATION_SAVED');
  const details = (audits ?? []).map((audit) => audit.detail);
  check('saves were audited', (audits ?? []).length >= 5, `got ${(audits ?? []).length}`);
  check(
    'draft saves are marked complete: false',
    details.some((d) => d?.complete === false),
  );
  check(
    'the complete save is marked complete: true',
    details.some((d) => d?.complete === true),
  );

  // 14 · The member snapshot travels with the interview (0010).
  section('14 · Member snapshot on the interview');
  const { data: snapshotted, error: snapshotError } = await service
    .from('interviews')
    .select('member_id, member_ref, member_name, member_phone, member_position')
    .eq('id', scratchInterviewId)
    .single();
  check(
    'the interview snapshots the member on insert',
    !snapshotError &&
      snapshotted.member_ref === scratchMemberId &&
      snapshotted.member_name === 'Integration Test — Drafts' &&
      snapshotted.member_phone === '+20 100 000 0000' &&
      snapshotted.member_position === 'Test fixture',
    snapshotError?.message ?? JSON.stringify(snapshotted),
  );

  // 15 · Editing a member (from the members list or a history review) keeps the
  //      shared row and every snapshot in step.
  section('15 · Editing member details');
  const editMember = await board.rpc('update_member_details', {
    p_member_id: scratchMemberId,
    p_full_name: 'Integration Test — Renamed',
    p_phone: '+20 111 111 1111',
    p_email: 'itest-renamed@itest.local',
    p_position: 'Renamed fixture',
    p_notes: 'Edited by the integration test.',
  });
  const { data: afterMember } = await service
    .from('members')
    .select('full_name, phone, position')
    .eq('id', scratchMemberId)
    .single();
  const { data: afterSnapshot } = await service
    .from('interviews')
    .select('member_name, member_phone, member_position')
    .eq('id', scratchInterviewId)
    .single();
  check(
    'the members row and the snapshot are edited together',
    !editMember.error &&
      afterMember?.full_name === 'Integration Test — Renamed' &&
      afterMember?.position === 'Renamed fixture' &&
      afterSnapshot?.member_name === 'Integration Test — Renamed' &&
      afterSnapshot?.member_phone === '+20 111 111 1111',
    editMember.error?.message ?? JSON.stringify({ afterMember, afterSnapshot }),
  );

  const badName = await board.rpc('update_member_details', {
    p_member_id: scratchMemberId,
    p_full_name: 'x',
  });
  check(
    'a too-short name is refused',
    badName.error?.message?.includes('at least 2 characters') === true,
    badName.error?.message ?? 'it succeeded',
  );

  // 16 · Removing a member keeps earlier days: the interview survives, its
  //      snapshot intact, and stays editable from history (0010).
  section('16 · Member delete keeps earlier history');
  const yesterday = new Date(`${day}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const pastDay = yesterday.toISOString().slice(0, 10);

  const { data: pastMember } = await service
    .from('members')
    .insert({
      full_name: 'Integration Test — Past',
      email: 'itest-past@itest.local',
      position: 'Past fixture',
    })
    .select('id')
    .single();
  pastMemberId = pastMember?.id ?? null;

  const { data: pastInterview } = await service
    .from('interviews')
    .insert({
      member_id: pastMemberId,
      track_id: track.id,
      queue_day: pastDay,
      queue_number: 1,
      status: 'PASSED',
    })
    .select('id')
    .single();
  pastInterviewId = pastInterview?.id ?? null;

  const remove = await board.rpc('delete_members', { p_member_ids: [pastMemberId] });
  const { data: survivingInterview } = await service
    .from('interviews')
    .select('id, member_id, member_ref, member_name')
    .eq('id', pastInterviewId)
    .maybeSingle();
  const { data: goneMember } = await service
    .from('members')
    .select('id')
    .eq('id', pastMemberId)
    .maybeSingle();
  check(
    "deleting a member drops the row but keeps the earlier day's interview",
    !remove.error &&
      goneMember === null &&
      survivingInterview?.member_ref === pastMemberId &&
      survivingInterview?.member_name === 'Integration Test — Past' &&
      survivingInterview?.member_id === null,
    remove.error?.message ?? JSON.stringify({ goneMember, survivingInterview }),
  );

  const editPurged = await board.rpc('update_member_details', {
    p_member_id: pastMemberId,
    p_full_name: 'Integration Test — Past Renamed',
    p_position: 'Still editable',
  });
  const { data: purgedSnapshot } = await service
    .from('interviews')
    .select('member_name, member_position')
    .eq('id', pastInterviewId)
    .single();
  check(
    'a purged member’s snapshot stays editable from history',
    !editPurged.error &&
      purgedSnapshot?.member_name === 'Integration Test — Past Renamed' &&
      purgedSnapshot?.member_position === 'Still editable',
    editPurged.error?.message ?? JSON.stringify(purgedSnapshot),
  );

  // 17 · A track account reviews and corrects its own interviews — the whole
  //      point of the board history page — and is refused on another track's.
  //      Row-level security (0004) and can_manage_interview (0005) both enforce
  //      this; the page takes the track from the session, never the URL.
  section('17 · A track reviews only its own interviews');

  const { error: trackSignInError } = await trackClient.auth.signInWithPassword({
    email: `${track.slug}@${EMAIL_DOMAIN}`,
    password: SEED_PASSWORD,
  });
  check('the track login works', !trackSignInError, trackSignInError?.message);

  // A finished interview of this track to correct. The scratch interview above
  // was left mid-transfer, so this one is made fresh: registered, started,
  // completed — all as this track's own login.
  const { data: ownedMember } = await service
    .from('members')
    .insert({
      full_name: 'Integration Test — Track Own',
      email: 'itest-track-own@itest.local',
      position: 'Track fixture',
    })
    .select('id')
    .single();
  ownedMemberId = ownedMember?.id ?? null;

  const { data: ownedSlots } = await service
    .from('interviews')
    .select('queue_number')
    .eq('track_id', track.id)
    .eq('queue_day', day);
  const ownedNumber = Math.max(0, ...(ownedSlots ?? []).map((row) => row.queue_number)) + 1;

  const { data: ownedInterview } = await service
    .from('interviews')
    .insert({
      member_id: ownedMemberId,
      track_id: track.id,
      queue_day: day,
      queue_number: ownedNumber,
      status: 'WAITING',
    })
    .select('id')
    .single();
  ownedInterviewId = ownedInterview?.id ?? null;

  await trackClient.rpc('start_interview', { p_interview_id: ownedInterviewId });

  // The track also writes the evaluation — the same save the board's form makes.
  const ownedFields = completeFormFields({ note: 'Track review fixture' }).fields;
  const ownedParsed = parseLikeTheApp(ownedInterviewId, ownedFields);
  const trackSave = await saveOnServer(trackClient, ownedInterviewId, ownedParsed);
  check(
    'a track can save an evaluation on its own interview',
    !trackSave.error,
    trackSave.error?.message,
  );

  const trackFinish = await trackClient.rpc('complete_interview', {
    p_interview_id: ownedInterviewId,
    p_outcome: 'PASSED',
  });
  check(
    'a track can start and finish its own interview',
    !trackFinish.error,
    trackFinish.error?.message,
  );

  // What the board history page reads: this track's interviews, this one among
  // them, and never another track's.
  const ownRead = await trackClient
    .from('interviews')
    .select('id, track_id, member_name')
    .eq('id', ownedInterviewId)
    .maybeSingle();
  check(
    'a track reads its own interview (the history page’s query)',
    ownRead.data?.id === ownedInterviewId && ownRead.data?.track_id === track.id,
    JSON.stringify(ownRead.data),
  );

  // The hand-off made earlier belongs to the other track — a real foreign row.
  const { data: foreignInterview } = await service
    .from('interviews')
    .select('id, track_id')
    .eq('transferred_from_id', scratchInterviewId)
    .neq('track_id', track.id)
    .limit(1)
    .maybeSingle();

  const foreignRead = foreignInterview?.id
    ? await trackClient.from('interviews').select('id').eq('id', foreignInterview.id).maybeSingle()
    : { data: null, error: null };
  check(
    'a track cannot read another track’s interview',
    Boolean(foreignInterview?.id) && !foreignRead.data,
    JSON.stringify({ foreign: foreignInterview, read: foreignRead.data }),
  );

  // A track may correct one of its own finished interviews: change the decision,
  // the same call the board's review panel makes.
  const trackChange = await trackClient.rpc('change_interview_outcome', {
    p_interview_id: ownedInterviewId,
    p_outcome: 'REJECTED',
  });
  const afterTrackChange = await readInterview(ownedInterviewId);
  check(
    'a track can change the outcome of its own interview',
    !trackChange.error && afterTrackChange?.status === 'REJECTED',
    trackChange.error?.message ?? JSON.stringify(afterTrackChange),
  );

  // …but not one belonging to another track, even if it guessed the id.
  const foreignChange = foreignInterview?.id
    ? await trackClient.rpc('change_interview_outcome', {
        p_interview_id: foreignInterview.id,
        p_outcome: 'REJECTED',
      })
    : { error: { message: 'no other track interview to test with' } };
  check(
    'a track cannot change another track’s interview',
    Boolean(foreignChange.error && foreignChange.error.message.includes('not allowed to manage')),
    foreignChange.error?.message ?? 'the database allowed it',
  );

  // And it may not rewrite the member record — that stays admin-only, which is
  // why the board's review panel renders the member details read-only.
  const trackMemberEdit = await trackClient.rpc('update_member_details', {
    p_member_id: ownedMemberId,
    p_full_name: 'Track Overwrite Attempt',
  });
  check(
    'a track cannot edit the shared member record',
    Boolean(trackMemberEdit.error),
    trackMemberEdit.error?.message ?? 'the database allowed it',
  );
} catch (error) {
  failed += 1;
  console.error(`\nUnexpected failure: ${error.message ?? error}`);
} finally {
  // ── Cleanup: only ever our own scratch rows ─────────────────────────────
  if (scratchMemberId) {
    // The member delete path now keeps earlier days, so clear the scratch
    // interview explicitly before removing the member.
    await service.from('interviews').delete().eq('member_ref', scratchMemberId);
    await service
      .from('audit_log')
      .delete()
      .eq('interview_id', scratchInterviewId ?? '');
    await service.from('members').delete().eq('id', scratchMemberId);
  }
  if (pastInterviewId) {
    await service.from('interviews').delete().eq('id', pastInterviewId);
  }
  if (pastMemberId) {
    await service.from('members').delete().eq('id', pastMemberId);
  }
  if (ownedInterviewId) {
    await service.from('audit_log').delete().eq('interview_id', ownedInterviewId);
    await service.from('interviews').delete().eq('id', ownedInterviewId);
  }
  if (ownedMemberId) {
    await service.from('members').delete().eq('id', ownedMemberId);
  }

  const trackedIds = [scratchInterviewId, pastInterviewId, ownedInterviewId].filter(
    (id) => id !== null,
  );
  const { data: leftovers } = await service.from('interviews').select('id').in('id', trackedIds);
  const clean =
    (leftovers ?? []).length === 0 && scratchMemberId !== null && ownedMemberId !== null;
  check('scratch data cleaned up', clean);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
