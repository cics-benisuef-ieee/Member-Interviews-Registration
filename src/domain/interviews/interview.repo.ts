import { createClient } from '@/lib/supabase/server';
import type { InterviewRow } from '@/types/database';
import type { InterviewOutcome } from './interview.constants';
import type { InterviewHistoryEntry, QueueEntry } from './interview.types';

/** The current queue day (YYYY-MM-DD) in the chapter's timezone. */
export async function getQueueDay(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_queue_day');
  if (error) throw new Error(`Could not load the queue day: ${error.message}`);
  return data as string;
}

const QUEUE_ENTRY_SELECT = `
  id, queue_number, status, started_at, finished_at, notes, transferred_from_id, member_id,
  members ( id, full_name, phone )
`;

interface QueueEntryRow {
  id: string;
  queue_number: number;
  status: QueueEntry['status'];
  started_at: string | null;
  finished_at: string | null;
  notes: string | null;
  transferred_from_id: string | null;
  member_id: string;
  members: { id: string; full_name: string; phone: string | null } | null;
}

function toQueueEntry(row: QueueEntryRow): QueueEntry {
  return {
    id: row.id,
    queueNumber: row.queue_number,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    notes: row.notes,
    transferredFromId: row.transferred_from_id,
    member: {
      id: row.member_id,
      fullName: row.members?.full_name ?? 'Unknown member',
      phone: row.members?.phone ?? null,
    },
  };
}

export async function listTrackQueue(trackId: string, day: string): Promise<QueueEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('interviews')
    .select(QUEUE_ENTRY_SELECT)
    .eq('track_id', trackId)
    .eq('queue_day', day)
    .order('queue_number');

  if (error) throw new Error(`Could not load the queue: ${error.message}`);
  return (data as unknown as QueueEntryRow[]).map(toQueueEntry);
}

/** Names of the source tracks for entries that were transferred in. */
export async function listSourceTrackNames(entryIds: string[]): Promise<Map<string, string>> {
  if (entryIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data } = await supabase
    .from('interviews')
    .select(
      'id, transferred_from:interviews!interviews_transferred_from_id_fkey ( tracks ( name ) )',
    )
    .in('id', entryIds)
    .not('transferred_from_id', 'is', null);

  const result = new Map<string, string>();
  for (const row of (data ?? []) as unknown as {
    id: string;
    transferred_from: { tracks: { name: string } | null } | null;
  }[]) {
    result.set(row.id, row.transferred_from?.tracks?.name ?? 'another track');
  }
  return result;
}

/** Names of the target tracks members were sent to from the given interviews. */
export async function listTransferTargets(
  sourceInterviewIds: string[],
): Promise<Map<string, string>> {
  if (sourceInterviewIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data } = await supabase
    .from('interviews')
    .select('transferred_from_id, tracks!inner ( name )')
    .in('transferred_from_id', sourceInterviewIds);

  const result = new Map<string, string>();
  for (const row of (data ?? []) as unknown as {
    transferred_from_id: string;
    tracks: { name: string } | null;
  }[]) {
    result.set(row.transferred_from_id, row.tracks?.name ?? 'another track');
  }
  return result;
}

export async function getInterview(id: string): Promise<InterviewRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('interviews').select('*').eq('id', id).single();
  return (data as InterviewRow) ?? null;
}

/** Today's activity for every track — powers the admin overview. */
export async function listAllTracksActivity(day: string): Promise<
  { trackId: string; trackName: string; status: string; memberName: string }[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('interviews')
    .select('track_id, status, member_id, members ( full_name ), tracks!inner ( id, name )')
    .eq('queue_day', day);

  if (error) throw new Error(`Could not load today's activity: ${error.message}`);

  return (data as unknown as {
    track_id: string;
    status: string;
    members: { full_name: string } | null;
    tracks: { id: string; name: string } | null;
  }[]).map((row) => ({
    trackId: row.track_id,
    trackName: row.tracks?.name ?? 'Unknown track',
    status: row.status,
    memberName: row.members?.full_name ?? 'Unknown member',
  }));
}

export async function listHistory(filters: {
  day?: string;
  trackId?: string;
  limit?: number;
}): Promise<InterviewHistoryEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from('interviews')
    .select(
      'id, queue_day, queue_number, status, started_at, finished_at, members ( full_name ), tracks!inner ( name )',
    )
    .order('queue_day', { ascending: false })
    .order('queue_number')
    .limit(filters.limit ?? 200);

  if (filters.day) query = query.eq('queue_day', filters.day);
  if (filters.trackId) query = query.eq('track_id', filters.trackId);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load history: ${error.message}`);

  const rows = (data ?? []) as unknown as {
    id: string;
    queue_day: string;
    queue_number: number;
    status: InterviewHistoryEntry['status'];
    started_at: string | null;
    finished_at: string | null;
    members: { full_name: string } | null;
    tracks: { name: string } | null;
  }[];

  const transferTargets = await listTransferTargets(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    queueDay: row.queue_day,
    queueNumber: row.queue_number,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    trackName: row.tracks?.name ?? 'Unknown track',
    memberName: row.members?.full_name ?? 'Unknown member',
    transferredToTrackName: transferTargets.get(row.id) ?? null,
  }));
}

// ── Mutations — all atomic, run inside the database ────────────────────────

export async function rpcRegisterMember(params: {
  trackId: string;
  fullName: string;
  phone?: string;
  email?: string;
  notes?: string;
}): Promise<{ interviewId: string; queueNumber: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('register_member', {
    p_track_id: params.trackId,
    p_full_name: params.fullName,
    p_phone: params.phone ?? null,
    p_email: params.email ?? null,
    p_notes: params.notes ?? null,
  });

  if (error) throw new Error(error.message);

  const row = (data as { interview_id: string; queue_number: number }[])[0];
  return { interviewId: row.interview_id, queueNumber: row.queue_number };
}

export async function rpcStartInterview(interviewId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('start_interview', { p_interview_id: interviewId });
  if (error) throw new Error(error.message);
}

export async function rpcCompleteInterview(params: {
  interviewId: string;
  outcome: InterviewOutcome;
  targetTrackId?: string;
  notes?: string;
}): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('complete_interview', {
    p_interview_id: params.interviewId,
    p_outcome: params.outcome,
    p_target_track_id: params.targetTrackId ?? null,
    p_notes: params.notes ?? null,
  });

  if (error) throw new Error(error.message);
}
