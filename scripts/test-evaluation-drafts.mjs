// ============================================================================
// Integration test for evaluation drafts (migration 0008 + the app layers).
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

try {
  // 0 · The deployed function must be the 0008 one — an empty evaluation on an
  //     id that cannot exist passes validation (0008) or is refused (0007).
  section('0 · Migration state');
  const probe = await service.rpc('save_interview_evaluation', {
    p_interview_id: '00000000-0000-0000-0000-000000000000',
    p_evaluation: { data: {}, scores: {} },
    p_recommendation: null,
  });
  const probeMessage = probe.error?.message ?? '';
  check(
    'migration 0008 is applied (empty evaluation is not refused)',
    probeMessage.includes('not allowed to manage'),
    probeMessage
      ? `the database said "${probeMessage}" — run supabase/migrations/0008_evaluation_drafts.sql in the SQL editor`
      : 'unexpected success for a non-existent interview',
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
    .select('id, name')
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
    'a finished interview can no longer be edited',
    afterFinish.error?.message?.includes('only be edited while the interview is open') === true,
    afterFinish.error?.message ?? 'it succeeded',
  );

  // 10 · The audit trail says which saves were drafts.
  section('10 · Audit trail');
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
} catch (error) {
  failed += 1;
  console.error(`\nUnexpected failure: ${error.message ?? error}`);
} finally {
  // ── Cleanup: only ever our own scratch rows ─────────────────────────────
  if (scratchInterviewId) {
    await service.from('audit_log').delete().eq('interview_id', scratchInterviewId);
    await service.from('interviews').delete().eq('id', scratchInterviewId);
  }
  if (scratchMemberId) {
    await service.from('members').delete().eq('id', scratchMemberId);
  }

  const { data: leftovers } = await service
    .from('interviews')
    .select('id')
    .eq('id', scratchInterviewId ?? '00000000-0000-0000-0000-000000000000');
  const clean = (leftovers ?? []).length === 0 && scratchMemberId !== null;
  check('scratch data cleaned up', clean);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
