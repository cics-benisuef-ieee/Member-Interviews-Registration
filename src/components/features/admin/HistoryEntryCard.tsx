'use client';

import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/features/queue/StatusBadge';
import type { InterviewHistoryEntry } from '@/domain/interviews/interview.types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { HistoryEntryReview } from './HistoryEntryReview';

/** One history entry as a card, expanding into its review panel. */
export function HistoryEntryCard({
  entry,
  canEditMember = false,
}: {
  entry: InterviewHistoryEntry;
  canEditMember?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-ieee-blue">#{entry.queueNumber}</span>
        <span className="font-semibold text-ieee-navy">{entry.memberName}</span>
        <StatusBadge status={entry.status} />
        <Button
          className="ml-auto"
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

      <p className="mt-1 text-sm text-ieee-gray">
        {entry.trackName}
        {entry.transferredToTrackName && (
          <>
            {' → '}
            <span className="font-semibold text-ieee-navy">{entry.transferredToTrackName}</span>
          </>
        )}
      </p>

      <p className="mt-0.5 text-xs text-ieee-gray">{entry.queueDay}</p>

      {open && (
        <div className="mt-3 border-t border-hairline pt-3">
          <HistoryEntryReview entry={entry} canEditMember={canEditMember} />
        </div>
      )}
    </li>
  );
}
