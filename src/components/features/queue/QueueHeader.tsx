import type { TrackBoard } from '@/domain/interviews/interview.types';

interface QueueHeaderProps {
  board: TrackBoard;
  waitingCount: number;
  finishedCount: number;
}

/** Track name, queue day, and today's counts. */
export function QueueHeader({ board, waitingCount, finishedCount }: QueueHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-stretch gap-3">
        <span aria-hidden className="w-1 shrink-0 rounded-full bg-gradient-orange" />
        <div>
          <p className="text-xs font-semibold tracking-widest text-ieee-blue uppercase">
            Today’s queue · {formatDay(board.day)}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ieee-navy">{board.trackName}</h1>
        </div>
      </div>

      <div className="flex gap-2 text-sm">
        <Stat label="waiting" value={waitingCount} />
        <Stat label="finished" value={finishedCount} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-center">
      <p className="text-lg font-bold text-ieee-navy">{value}</p>
      <p className="text-xs text-ieee-gray">{label}</p>
    </div>
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
