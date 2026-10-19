import type { InterviewEvaluation } from '@/domain/interviews/evaluation';
import type { InterviewStatus } from '@/domain/interviews/interview.constants';
import type { QueueEntry } from '@/domain/interviews/interview.types';

/** The bits of a recorded interview the board's review UI actually reads. */
export interface ReviewableEntry {
  id: string;
  queueNumber: number;
  status: InterviewStatus;
  startedAt: string | null;
  finishedAt: string | null;
  transferredFromId: string | null;
  evaluation: InterviewEvaluation | null;
  member: QueueEntry['member'];
}

/**
 * Rebuilds the board's entry shape from a row that is not on the board — a
 * history entry, or one of a member's interviews on the admin members list — so
 * every surface offers the same review and correction controls.
 */
export function asReviewEntry(entry: ReviewableEntry): QueueEntry {
  return { ...entry, notes: null };
}
