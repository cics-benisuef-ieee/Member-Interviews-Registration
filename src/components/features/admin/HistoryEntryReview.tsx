'use client';

import { asReviewEntry } from '@/components/features/queue/review-entry';
import { EvaluationReviewActions } from '@/components/features/queue/EvaluationReviewActions';
import { EvaluationSummary } from '@/components/features/queue/EvaluationSummary';
import { isFinishedStatus } from '@/domain/interviews/interview.constants';
import type { InterviewHistoryEntry } from '@/domain/interviews/interview.types';
import { HistoryMemberDetails } from './HistoryMemberDetails';

/** The board's entry shape, rebuilt from a history row, for the shared review UI. */
function asQueueEntry(entry: InterviewHistoryEntry) {
  return asReviewEntry({
    id: entry.id,
    queueNumber: entry.queueNumber,
    status: entry.status,
    startedAt: entry.startedAt,
    finishedAt: entry.finishedAt,
    transferredFromId: null,
    evaluation: entry.evaluation,
    member: {
      id: entry.memberRef,
      fullName: entry.memberName,
      phone: entry.memberPhone,
      position: entry.memberPosition,
    },
  });
}

/**
 * The read-only review of one history entry, carrying the same edit / change /
 * reopen actions the board offers. An entry that is still open points back to
 * its track's board — that is where it can be edited.
 *
 * A track board reviewing its own history gets the same actions (the database
 * lets a board manage the interviews in its own track), but reads the member's
 * details without the edit control — changing a member record stays admin-only.
 */
export function HistoryEntryReview({
  entry,
  canEditMember = false,
}: {
  entry: InterviewHistoryEntry;
  canEditMember?: boolean;
}) {
  return (
    <div className="space-y-4">
      <HistoryMemberDetails entry={entry} canEdit={canEditMember} />
      <EvaluationSummary evaluation={entry.evaluation} />
      {isFinishedStatus(entry.status) ? (
        <EvaluationReviewActions entry={asQueueEntry(entry)} />
      ) : (
        <p className="text-xs text-ieee-gray">
          Still open on {entry.trackName}’s board — edit it from there.
        </p>
      )}
    </div>
  );
}
