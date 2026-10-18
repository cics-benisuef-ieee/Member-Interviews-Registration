import { AutoRefresh } from '@/components/features/shared/AutoRefresh';
import { TvBoardCard } from '@/components/features/tv/TvBoardCard';
import { getTvBoards } from '@/domain/interviews/interview.service';

export const dynamic = 'force-dynamic';

/**
 * The public hall display (/tv). No login, read-only: it shows only the
 * tracks an admin marked visible, and only names, queue numbers, and counts.
 * Refreshes itself like a board (see AutoRefresh).
 */
export default async function TvPage() {
  const { day, boards } = await getTvBoards();

  return (
    <>
      <AutoRefresh intervalMs={15_000} />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-ieee-orange uppercase">
            CS/CIS Beni-Suef Chapter
          </p>
          <h1 className="mt-1 text-3xl font-bold">Interviews · live queue</h1>
        </div>
        <p className="text-sm font-semibold text-ieee-cyan">{formatDay(day)}</p>
      </header>

      {boards.length === 0 ? (
        <p className="mt-16 text-center text-xl font-semibold text-ieee-cyan">
          No committees are on display right now.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {boards.map((board) => (
            <TvBoardCard key={board.trackId} board={board} />
          ))}
        </div>
      )}
    </>
  );
}

function formatDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
