'use client';

import { asReviewEntry } from '@/components/features/queue/review-entry';
import { EvaluationReviewActions } from '@/components/features/queue/EvaluationReviewActions';
import { EvaluationSummary } from '@/components/features/queue/EvaluationSummary';
import { Button } from '@/components/ui/Button';
import { isFinishedStatus } from '@/domain/interviews/interview.constants';
import type { Member, MemberTodayInterview } from '@/domain/members/member.types';
import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';

/**
 * Review and correct one of a member's interviews straight from the admin
 * members list — the same controls the board and history offer, so a decision
 * can be fixed without hunting down the track. Every entry gets its own review,
 * transfers included.
 */
export function MemberInterviewReview({
  entry,
  member,
}: {
  entry: MemberTodayInterview;
  member: Member;
}) {
  const [open, setOpen] = useState(false);

  if (!isFinishedStatus(entry.status)) {
    return (
      <p className="mt-2 text-xs text-ieee-gray">
        Still open — edit it from {entry.trackName}’s board.
      </p>
    );
  }

  return (
    <div className="mt-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ClipboardCheck className="h-3.5 w-3.5" />
        {open ? 'Close review' : 'Review & edit'}
      </Button>

      {open && (
        <div className="mt-3 space-y-4">
          <EvaluationSummary evaluation={entry.evaluation} />
          <EvaluationReviewActions
            entry={asReviewEntry({
              id: entry.id,
              queueNumber: entry.queueNumber,
              status: entry.status,
              startedAt: entry.startedAt,
              finishedAt: entry.finishedAt,
              transferredFromId: entry.transferredFromId,
              evaluation: entry.evaluation,
              member: {
                id: member.id,
                fullName: member.fullName,
                phone: member.phone,
                position: member.position,
              },
            })}
          />
        </div>
      )}
    </div>
  );
}
