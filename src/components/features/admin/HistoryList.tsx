import { StatusBadge } from '@/components/features/queue/StatusBadge';
import type { InterviewHistoryEntry } from '@/domain/interviews/interview.types';

/**
 * The history list in its two responsive shapes: a full table from `lg` up,
 * and one card per interview below it. Both read the same entries, so the views
 * can never disagree.
 *
 * The table is wrapped in a horizontal scroller as a last-resort guard, but the
 * cards are the intended small-screen experience.
 */
export function HistoryTable({ entries }: { entries: InterviewHistoryEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-hairline text-xs tracking-wider text-ieee-gray uppercase">
            <th className="px-5 py-3">Day</th>
            <th className="px-5 py-3">#</th>
            <th className="px-5 py-3">Member</th>
            <th className="px-5 py-3">Track</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Sent to</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-hairline text-sm last:border-b-0">
              <td className="px-5 py-3 text-ieee-gray">{entry.queueDay}</td>
              <td className="px-5 py-3 font-bold text-ieee-blue">{entry.queueNumber}</td>
              <td className="px-5 py-3 font-semibold text-ieee-navy">{entry.memberName}</td>
              <td className="px-5 py-3 text-ieee-gray">{entry.trackName}</td>
              <td className="px-5 py-3">
                <StatusBadge status={entry.status} />
              </td>
              <td className="px-5 py-3 text-ieee-gray">{entry.transferredToTrackName ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HistoryCards({ entries }: { entries: InterviewHistoryEntry[] }) {
  return (
    <ul className="divide-y divide-hairline">
      {entries.map((entry) => (
        <li key={entry.id} className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ieee-blue">#{entry.queueNumber}</span>
            <span className="font-semibold text-ieee-navy">{entry.memberName}</span>
            <StatusBadge status={entry.status} />
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
        </li>
      ))}
    </ul>
  );
}
