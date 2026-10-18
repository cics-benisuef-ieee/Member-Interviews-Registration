import type { InterviewStatus } from '@/domain/interviews/interview.constants';
import * as interviewRepo from '@/domain/interviews/interview.repo';
import { createClient } from '@/lib/supabase/server';
import type { MemberRow } from '@/types/database';
import * as memberRepo from './member.repo';
import { memberInputSchema } from './member.schema';
import type {
  Member,
  MemberDayStatus,
  MemberTodayInterview,
  MemberWithInterviews,
  MemberWithStatus,
} from './member.types';

/** Reads a member together with their interview history. */
export async function getMemberWithInterviews(id: string): Promise<MemberWithInterviews | null> {
  const supabase = await createClient();

  const { data: memberRow } = await supabase
    .from('members')
    .select('id, full_name, phone, email, notes, position')
    .eq('id', id)
    .single();

  if (!memberRow) return null;

  const { data: interviewRows } = await supabase
    .from('interviews')
    .select('id, queue_day, queue_number, status, tracks ( name )')
    .eq('member_id', id)
    .order('queue_day', { ascending: false });

  const member = memberRepo.toMember(memberRow as MemberRow);

  return {
    ...member,
    interviews: (interviewRows ?? []).map((row) => {
      const interview = row as unknown as InterviewWithTrack;
      return {
        id: interview.id,
        queueDay: interview.queue_day,
        queueNumber: interview.queue_number,
        status: interview.status,
        trackName: interview.tracks?.name ?? '—',
      };
    }),
  };
}

interface InterviewWithTrack {
  id: string;
  queue_day: string;
  queue_number: number;
  status: string;
  tracks: { name: string } | null;
}

/** Validates and normalizes member details coming from any form. */
export function parseMemberInput(formData: FormData) {
  return memberInputSchema.parse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone') ?? undefined,
    email: formData.get('email') ?? undefined,
    notes: formData.get('notes') ?? undefined,
    position: formData.get('position') ?? undefined,
  });
}

export async function applyMemberUpdate(id: string, formData: FormData): Promise<Member> {
  const input = parseMemberInput(formData);
  await memberRepo.updateMember(id, input);

  const member = await memberRepo.findMember(id);
  if (!member) throw new Error('Member not found.');
  return member;
}

/**
 * The admin members list: members enriched with where they stand today.
 *
 * Two queries rather than one join, because the members side owns the search
 * (name, phone, email, RLS) and the interview side owns the queue day — each
 * stays behind its own repo.
 */
export async function searchMembersWithStatus(query: string): Promise<MemberWithStatus[]> {
  const members = await memberRepo.searchMembers(query);
  if (members.length === 0) return [];

  const day = await interviewRepo.getQueueDay();
  const detailsByMember = await interviewRepo.listTodayInterviewDetails(
    day,
    members.map((member) => member.id),
  );

  return members.map((member) => {
    const todayInterviews = (detailsByMember.get(member.id) ?? []).map((detail) => ({
      id: detail.id,
      queueNumber: detail.queueNumber,
      status: detail.status,
      trackName: detail.trackName,
      startedAt: detail.startedAt,
      finishedAt: detail.finishedAt,
      transferredFromId: detail.transferredFromId,
      overallTotal: detail.overallTotal,
      recommendation: detail.recommendation,
      interviewers: detail.interviewers,
    }));

    return {
      ...member,
      dayStatus: summarizeMemberDay(todayInterviews.map((entry) => entry.status)),
      todayInterviews,
      ...todayTrackContext(todayInterviews),
    };
  });
}

/**
 * Where in the committee circuit the member is: the track they registered
 * into (their origin) and the track holding them now. The two differ only
 * when a transfer moved them on — an entry no other entry was transferred
 * out of is the current end of the chain. A member who registered directly
 * into several tracks has several ends; the first (by queue number) speaks
 * for the row.
 */
function todayTrackContext(interviews: MemberTodayInterview[]): {
  registeredTrackName: string | null;
  currentTrackName: string | null;
} {
  if (interviews.length === 0) return { registeredTrackName: null, currentTrackName: null };

  const handedOn = new Set(
    interviews.map((entry) => entry.transferredFromId).filter((id): id is string => id !== null),
  );
  const origin = interviews.find((entry) => entry.transferredFromId === null);
  const current = interviews.find((entry) => !handedOn.has(entry.id));

  return {
    registeredTrackName: origin?.trackName ?? interviews[0].trackName,
    currentTrackName: current?.trackName ?? interviews[interviews.length - 1].trackName,
  };
}

/**
 * Folds a member's queue entries for the day into one word, in the order an
 * admin cares about: what is happening now, then what is still outstanding,
 * then the best result achieved — one pass beats a rejection, since a member
 * accepted by any track has been accepted.
 */
function summarizeMemberDay(statuses: InterviewStatus[]): MemberDayStatus | null {
  if (statuses.includes('IN_INTERVIEW')) return 'interviewing';
  if (statuses.includes('WAITING')) return 'pending';
  if (statuses.includes('PASSED')) return 'accepted';
  if (statuses.includes('REJECTED')) return 'rejected';
  // A transfer marks the original row NEEDS_ANOTHER_TRACK; if that is all that
  // is left, the member has been handed on and is still somewhere in play.
  if (statuses.includes('NEEDS_ANOTHER_TRACK')) return 'pending';
  return null;
}
