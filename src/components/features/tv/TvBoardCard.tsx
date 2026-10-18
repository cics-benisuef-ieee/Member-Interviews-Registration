import { Card } from '@/components/ui/Card';
import type { TvBoard } from '@/domain/interviews/interview.types';

/**
 * One committee on the hall display: who is being served now, who is next,
 * and how many have finished. Everything here is read-only.
 */
export function TvBoardCard({ board }: { board: TvBoard }) {
  return (
    <Card className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
        <h2 className="text-xl font-bold text-ieee-navy">{board.trackName}</h2>
        <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-ieee-gray">
          {board.finishedCount} finished
        </span>
      </div>

      <div className="mt-4 rounded-xl border-2 border-ieee-orange-dark bg-white px-4 py-5 text-center">
        <p className="text-xs font-bold tracking-widest text-ieee-orange-dark uppercase">
          Now serving
        </p>
        {board.nowServingName ? (
          <>
            <p className="mt-2 text-3xl font-bold text-ieee-navy">{board.nowServingName}</p>
            {board.nowServingNumber !== null && (
              <p className="mt-1 text-lg font-bold text-ieee-blue">#{board.nowServingNumber}</p>
            )}
          </>
        ) : (
          <p className="mt-3 text-xl font-semibold text-ieee-gray">—</p>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold tracking-widest text-ieee-gray uppercase">Next up</p>
        {board.waiting.length === 0 ? (
          <p className="mt-2 text-sm text-ieee-gray">Queue is clear.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {board.waiting.map((entry) => (
              <li
                key={entry.queueNumber}
                className="flex items-center justify-between gap-3 text-ieee-navy"
              >
                <span className="truncate font-semibold">{entry.fullName}</span>
                <span className="shrink-0 font-bold text-ieee-blue">#{entry.queueNumber}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
