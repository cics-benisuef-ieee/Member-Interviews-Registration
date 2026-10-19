'use client';

import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/features/queue/StatusBadge';
import type { InterviewHistoryEntry } from '@/domain/interviews/interview.types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { HistoryEntryReview } from './HistoryEntryReview';

/** One history entry as a table row, expanding into its review panel. */
export function HistoryEntryRow({ entry }: { entry: InterviewHistoryEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="border-b border-hairline text-sm">
        <td className="px-5 py-3 text-ieee-gray">{entry.queueDay}</td>
        <td className="px-5 py-3 font-bold text-ieee-blue">{entry.queueNumber}</td>
        <td className="px-5 py-3 font-semibold text-ieee-navy">{entry.memberName}</td>
        <td className="px-5 py-3 text-ieee-gray">{entry.trackName}</td>
        <td className="px-5 py-3">
          <StatusBadge status={entry.status} />
        </td>
        <td className="px-5 py-3 text-ieee-gray">{entry.transferredToTrackName ?? '—'}</td>
        <td className="px-5 py-3 text-right">
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
        </td>
      </tr>

      {open && (
        <tr className="border-b border-hairline bg-surface/50">
          <td colSpan={7} className="px-5 py-4">
            <HistoryEntryReview entry={entry} />
          </td>
        </tr>
      )}
    </>
  );
}
