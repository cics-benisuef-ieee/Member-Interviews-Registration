import type { Recommendation } from '@/domain/interviews/evaluation';
import type { InterviewStatus } from '@/domain/interviews/interview.constants';
import { createClient } from '@/lib/supabase/server';
import type { MemberResult } from './result.types';

/** The jsonb shape `lookup_member_results` builds, one object per interview. */
interface ResultRow {
  memberName: string | null;
  trackName: string;
  queueDay: string;
  queueNumber: number;
  status: InterviewStatus;
  recommendation: Recommendation | null;
  overallTotal: number | null;
  finishedAt: string | null;
}

/**
 * Finds every interview that belongs to the person holding this email + phone
 * pair, newest first. Callable without a login (the RPC is granted to anon)
 * and returns only the outcome fields — nothing an interviewer wrote.
 */
export async function lookupResults(email: string, phone: string): Promise<MemberResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('lookup_member_results', {
    p_email: email,
    p_phone: phone,
  });
  if (error) throw new Error(`Could not look up results: ${error.message}`);
  return (data as ResultRow[] | null) ?? [];
}
