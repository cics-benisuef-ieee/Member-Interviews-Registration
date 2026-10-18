import * as trackRepo from '@/domain/tracks/track.repo';
import * as trackService from '@/domain/tracks/track.service';
import { FINISHED_STATUSES, isFinishedStatus, type InterviewOutcome } from './interview.constants';
import { evaluationInputSchema } from './evaluation.schema';
import * as interviewRepo from './interview.repo';
import { memberRegistrationSchema, transferInputSchema } from './interview.schema';
import type {
  InterviewHistoryEntry,
  QueueEntry,
  RegistrationReceipt,
  TrackBoard,
  TrackDaySummary,
  TvBoard,
} from './interview.types';

// ── Reads ──────────────────────────────────────────────────────────────────

/** Everything one track's board displays for today, or null if no such track. */
export async function getTrackBoard(trackId: string): Promise<TrackBoard | null> {
  const [track, day] = await Promise.all([
    trackRepo.findTrack(trackId),
    interviewRepo.getQueueDay(),
  ]);
  if (!track) return null;

  const queue = await interviewRepo.listTrackQueue(trackId, day);
  const sourceTracks = await interviewRepo.listSourceTrackNames(
    queue.filter((entry) => entry.transferredFromId).map((entry) => entry.id),
  );

  const withSource = queue.map((entry) => decorateWithSourceTrack(entry, sourceTracks));

  return {
    trackId: track.id,
    trackName: track.name,
    day,
    nowServing: withSource.find((entry) => entry.status === 'IN_INTERVIEW') ?? null,
    waiting: withSource.filter((entry) => entry.status === 'WAITING'),
    finished: withSource.filter((entry) => FINISHED_STATUSES.includes(entry.status)),
  };
}

/** One summary card per track for the admin overview. */
export async function getTodaySummaries(): Promise<{ day: string; summaries: TrackDaySummary[] }> {
  const day = await interviewRepo.getQueueDay();
  const [tracks, activity] = await Promise.all([
    trackService.listAllTracks(),
    interviewRepo.listAllTracksActivity(day),
  ]);

  const summaries = tracks.map((track) => {
    const rows = activity.filter((row) => row.trackId === track.id);
    const nowServing = rows.find((row) => row.status === 'IN_INTERVIEW');

    return {
      trackId: track.id,
      trackName: track.name,
      waitingCount: rows.filter((row) => row.status === 'WAITING').length,
      finishedCount: rows.filter((row) => isFinishedStatus(row.status)).length,
      nowServingName: nowServing?.memberName ?? null,
    };
  });

  return { day, summaries };
}

export async function getHistory(filters: {
  day?: string;
  trackId?: string;
}): Promise<{ entries: InterviewHistoryEntry[]; day: string }> {
  const [day, entries] = await Promise.all([
    interviewRepo.getQueueDay(),
    interviewRepo.listHistory(filters),
  ]);
  return { entries, day };
}

/** Summaries for the public hall display — only tracks opted into /tv. */
export async function getTvBoards(): Promise<{ day: string; boards: TvBoard[] }> {
  return interviewRepo.getTvBoards();
}

// ── Writes ─────────────────────────────────────────────────────────────────

/** Public registration: puts a member into the chosen track's queue today. */
export async function registerMember(input: {
  trackId: string;
  fullName: string;
  phone?: string;
  email?: string;
  notes?: string;
}): Promise<RegistrationReceipt> {
  const parsed = memberRegistrationSchema.parse(input);

  const track = await trackRepo.findTrack(parsed.trackId);
  if (!track || !track.isActive) throw new Error('That track is not accepting registrations.');

  const { interviewId, queueNumber } = await interviewRepo.rpcRegisterMember({
    trackId: parsed.trackId,
    fullName: parsed.fullName,
    phone: parsed.phone,
    email: parsed.email || undefined,
    notes: parsed.notes,
  });

  return { interviewId, queueNumber, trackName: track.name };
}

/** Moves a member from WAITING to IN_INTERVIEW. */
export async function startInterview(interviewId: string): Promise<void> {
  await interviewRepo.rpcStartInterview(interviewId);
}

/**
 * IN_INTERVIEW → WAITING ("wrong member / not ready"). The queue number, the
 * evaluation saved so far, and the notes all survive; only the clock resets.
 */
export async function unstartInterview(interviewId: string): Promise<void> {
  await interviewRepo.rpcUnstartInterview(interviewId);
}

/**
 * Saves the evaluation (data section + eleven scored criteria) on an open
 * interview. Saving is allowed as often as the committee likes while the
 * member is in the queue — the recommendation is stored separately and can be
 * revised until the interview is finished.
 */
export async function saveInterviewEvaluation(input: {
  interviewId: string;
  data: Record<string, unknown>;
  scores: Record<string, unknown>;
  recommendation: string;
  finalNotes?: string;
}): Promise<{ interviewId: string; total: number }> {
  const parsed = evaluationInputSchema.parse(input);

  const total = await interviewRepo.rpcSaveInterviewEvaluation({
    interviewId: parsed.interviewId,
    evaluation: { data: parsed.data, scores: parsed.scores },
    recommendation: parsed.recommendation,
    finalNotes: parsed.finalNotes,
  });

  return { interviewId: parsed.interviewId, total };
}

/**
 * The database refuses to finish an interview without a complete evaluation;
 * checking here turns that refusal into a clear message before any state
 * changes, matching the same rule enforced in `complete_interview`.
 */
async function assertEvaluationComplete(interviewId: string): Promise<void> {
  const row = await interviewRepo.getInterview(interviewId);
  if (!row) throw new Error('Interview not found.');
  if (row.overall_total === null || row.recommendation === null) {
    throw new Error(
      'Complete the evaluation — every criterion with a note, plus a recommendation — before finishing this interview.',
    );
  }
}

/** Records the outcome of an interview in progress. */
export async function finishInterview(params: {
  interviewId: string;
  outcome: InterviewOutcome;
  targetTrackId?: string;
  notes?: string;
}): Promise<void> {
  if (params.outcome === 'TRANSFER' && !params.targetTrackId) {
    throw new Error('Choose the track to send this member to.');
  }

  await assertEvaluationComplete(params.interviewId);
  await interviewRepo.rpcCompleteInterview(params);
}

/** Same-day transfer: finish this interview and re-queue the member elsewhere. */
export async function transferInterview(input: {
  interviewId: string;
  targetTrackId: string;
  notes?: string;
}): Promise<void> {
  const parsed = transferInputSchema.parse(input);

  const [source, target] = await Promise.all([
    interviewRepo.getInterview(parsed.interviewId),
    trackRepo.findTrack(parsed.targetTrackId),
  ]);

  if (!source) throw new Error('Interview not found.');
  if (source.track_id === parsed.targetTrackId) {
    throw new Error('This member is already in that track’s queue.');
  }
  if (!target || !target.isActive) throw new Error('That track is not available.');

  await assertEvaluationComplete(parsed.interviewId);
  await interviewRepo.rpcCompleteInterview({
    interviewId: parsed.interviewId,
    outcome: 'TRANSFER',
    targetTrackId: parsed.targetTrackId,
    notes: parsed.notes,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function decorateWithSourceTrack(entry: QueueEntry, sourceTracks: Map<string, string>): QueueEntry {
  if (!entry.transferredFromId) return entry;

  const sourceTrackName = sourceTracks.get(entry.id);
  return sourceTrackName ? { ...entry, sourceTrackName } : entry;
}
