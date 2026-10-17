import { createClient } from '@/lib/supabase/server';
import type { MemberRow } from '@/types/database';
import * as memberRepo from './member.repo';
import { memberInputSchema } from './member.schema';
import type { Member, MemberWithInterviews } from './member.types';

/** Reads a member together with their interview history. */
export async function getMemberWithInterviews(id: string): Promise<MemberWithInterviews | null> {
  const supabase = await createClient();

  const { data: memberRow } = await supabase
    .from('members')
    .select('id, full_name, phone, email, notes')
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
  });
}

export async function applyMemberUpdate(id: string, formData: FormData): Promise<Member> {
  const input = parseMemberInput(formData);
  await memberRepo.updateMember(id, input);

  const member = await memberRepo.findMember(id);
  if (!member) throw new Error('Member not found.');
  return member;
}
