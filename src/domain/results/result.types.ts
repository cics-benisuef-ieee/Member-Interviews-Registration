import type { Recommendation } from '@/domain/interviews/evaluation';
import type { InterviewStatus } from '@/domain/interviews/interview.constants';

/**
 * One interview as the matched member sees it on the public results page.
 * Deliberately narrow: interviewer notes and per-criterion scores are never
 * handed to the public lookup (0011) — only the outcome a member is owed.
 */
export interface MemberResult {
  /** Null only on interviews whose member row and snapshot were both purged. */
  memberName: string | null;
  trackName: string;
  /** The queue day as YYYY-MM-DD. */
  queueDay: string;
  queueNumber: number;
  status: InterviewStatus;
  /** Null until the interviewers commit to a verdict. */
  recommendation: Recommendation | null;
  /** Score out of `EVALUATION_MAX_TOTAL`; null while the evaluation is a draft. */
  overallTotal: number | null;
  finishedAt: string | null;
}
