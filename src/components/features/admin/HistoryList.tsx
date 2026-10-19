import type { InterviewHistoryEntry } from '@/domain/interviews/interview.types';
import { HistoryEntryCard } from './HistoryEntryCard';
import { HistoryEntryRow } from './HistoryEntryRow';

/**
 * The history list in its two responsive shapes: a full table from `lg` up,
 * and one card per interview below it. Both read the same entries, so the views
 * can never disagree. Each entry expands on its own into the review panel.
 *
 * The table is wrapped in a horizontal scroller as a last-resort guard, but the
 * cards are the intended small-screen experience.
 */
export function HistoryList({ entries }: { entries: InterviewHistoryEntry[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-hairline text-xs tracking-wider text-ieee-gray uppercase">
              <th className="px-5 py-3">Day</th>
              <th className="px-5 py-3">#</th>
              <th className="px-5 py-3">Member</th>
              <th className="px-5 py-3">Track</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Sent to</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <HistoryEntryRow key={entry.id} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-hairline lg:hidden">
        {entries.map((entry) => (
          <HistoryEntryCard key={entry.id} entry={entry} />
        ))}
      </ul>
    </>
  );
}
