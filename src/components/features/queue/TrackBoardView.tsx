import { startInterviewAction } from '@/actions/interview.actions';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import type { TrackBoard } from '@/domain/interviews/interview.types';
import type { Track } from '@/domain/tracks/track.types';
import { Play } from 'lucide-react';
import { AutoRefresh } from '../shared/AutoRefresh';
import { NowServing } from './NowServing';
import { QueueEmpty } from './QueueEmpty';
import { QueueHeader } from './QueueHeader';
import { FinishedRow, QueueRow } from './QueueRow';

interface TrackBoardViewProps {
  board: TrackBoard;
  /** Active tracks a member may be transferred to. */
  otherTracks: Track[];
}

/**
 * The whole of a track's live queue: header, the member being interviewed now,
 * who is next, and what has been decided.
 *
 * Rendered both on a committee's own board and on the board an admin opens
 * from the overview, so the two can never drift apart in behaviour.
 */
export function TrackBoardView({ board, otherTracks }: TrackBoardViewProps) {
  const isEmpty = !board.nowServing && board.waiting.length === 0 && board.finished.length === 0;
  const nextUp = board.waiting[0];

  return (
    <>
      <AutoRefresh />
      <QueueHeader
        board={board}
        waitingCount={board.waiting.length}
        finishedCount={board.finished.length}
      />

      {isEmpty ? (
        <QueueEmpty trackName={board.trackName} />
      ) : (
        <div className="space-y-6">
          {board.nowServing ? (
            <NowServing entry={board.nowServing} availableTracks={otherTracks} />
          ) : (
            nextUp && (
              <Card className="flex flex-wrap items-center justify-between gap-4 border-ieee-blue">
                <div>
                  <p className="text-xs font-bold tracking-widest text-ieee-blue uppercase">
                    Next up · #{nextUp.queueNumber}
                  </p>
                  <p className="mt-1 text-xl font-bold text-ieee-navy">{nextUp.member.fullName}</p>
                </div>
                <form action={startInterviewAction.bind(null, nextUp.id)}>
                  <Button variant="accent" size="lg">
                    <Play className="h-4 w-4" />
                    Start interview
                  </Button>
                </form>
              </Card>
            )
          )}

          {board.waiting.length > 0 && (
            <Card flush>
              <div className="border-b border-hairline px-5 py-4">
                <CardTitle>Waiting ({board.waiting.length})</CardTitle>
              </div>
              <ul>
                {board.waiting.map((entry) => (
                  <QueueRow
                    key={entry.id}
                    // Any waiting member may be called — skipping ahead is
                    // allowed and the queue order stays as printed. Starting
                    // sets only that row IN_INTERVIEW; everything else in the
                    // queue is untouched.
                    entry={entry}
                    action={
                      <form action={startInterviewAction.bind(null, entry.id)}>
                        <Button size="sm">Start</Button>
                      </form>
                    }
                  />
                ))}
              </ul>
            </Card>
          )}

          {board.finished.length > 0 && (
            <Card flush>
              <div className="border-b border-hairline px-5 py-4">
                <CardTitle>Finished today ({board.finished.length})</CardTitle>
              </div>
              <ul>
                {board.finished.map((entry) => (
                  <FinishedRow key={entry.id} entry={entry} />
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
