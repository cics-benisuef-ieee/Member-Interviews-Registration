'use client';

import { Button } from '@/components/ui/Button';
import { RECOMMENDATION_LABELS } from '@/domain/interviews/evaluation';
import type { QueueEntry } from '@/domain/interviews/interview.types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { EvaluationReviewActions } from './EvaluationReviewActions';
import { EvaluationSummary } from './EvaluationSummary';
import { StatusBadge } from './StatusBadge';
import { formatQueueNumber } from './queue.format';

/**
 * One finished member on a track board: passed, rejected, or sent on. The row
 * stays compact; "Review" opens the saved evaluation read-only, with the
 * actions to correct it, change the decision, or reopen the interview.
 */
export function FinishedEntryRow({ entry }: { entry: QueueEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="border-b border-hairline last:border-b-0">
      <div className="flex items-center gap-4 px-5 py-3 text-sm">
        <span className="w-12 shrink-0 text-center font-bold text-ieee-gray">
          {formatQueueNumber(entry.queueNumber)}
        </span>
        <p className="min-w-0 flex-1 truncate font-semibold text-ieee-navy">
          {entry.member.fullName}
        </p>
        {entry.evaluation && (
          <span className="hidden text-xs text-ieee-gray md:inline">
            {entry.evaluation.total}/100
            {entry.evaluation.recommendation
              ? ` · ${RECOMMENDATION_LABELS[entry.evaluation.recommendation]}`
              : ''}
          </span>
        )}
        {entry.sourceTrackName && (
          <span className="hidden text-xs text-ieee-gray sm:inline">
            from {entry.sourceTrackName}
          </span>
        )}
        <StatusBadge status={entry.status} />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Review
        </Button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-hairline bg-surface/50 px-5 py-4">
          <EvaluationSummary evaluation={entry.evaluation} />
          <EvaluationReviewActions entry={entry} />
        </div>
      )}
    </li>
  );
}
