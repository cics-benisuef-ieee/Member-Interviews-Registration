import { formatQueueNumber } from './queue.format';
import type { QueueEntry } from '@/domain/interviews/interview.types';

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
