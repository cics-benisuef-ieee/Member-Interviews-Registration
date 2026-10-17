import { StatusBadge } from './StatusBadge';
import type { QueueEntry } from '@/domain/interviews/interview.types';
import { formatQueueNumber } from './queue.format';

interface QueueRowProps {
  entry: QueueEntry;
  /** Row action, e.g. a Start button. */
  action?: React.ReactNode;
}

/** One waiting member in the queue. */
export function QueueRow({ entry, action }: QueueRowProps) {
  return (
    <li className="flex items-center gap-4 border-b border-hairline px-5 py-3 last:border-b-0">
      <span className="w-12 shrink-0 text-center text-lg font-bold text-ieee-blue">
        {formatQueueNumber(entry.queueNumber)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ieee-navy">{entry.member.fullName}</p>
        <p className="truncate text-xs text-ieee-gray">
          {entry.member.phone ?? 'No phone'}
          {entry.sourceTrackName && ` · sent from ${entry.sourceTrackName}`}
        </p>
      </div>

      {action}
    </li>
  );
}

/** One finished member (passed, rejected, or transferred). */
export function FinishedRow({ entry }: { entry: QueueEntry }) {
  return (
    <li className="flex items-center gap-4 border-b border-hairline px-5 py-3 text-sm last:border-b-0">
      <span className="w-12 shrink-0 text-center font-bold text-ieee-gray">
        {formatQueueNumber(entry.queueNumber)}
      </span>
      <p className="min-w-0 flex-1 truncate font-semibold text-ieee-navy">{entry.member.fullName}</p>
      {entry.sourceTrackName && (
        <span className="hidden text-xs text-ieee-gray sm:inline">
          from {entry.sourceTrackName}
        </span>
      )}
      <StatusBadge status={entry.status} />
    </li>
  );
}
