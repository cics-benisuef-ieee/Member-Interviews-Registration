import { startInterviewAction } from '@/actions/interview.actions';
import { AutoRefresh } from '@/components/features/shared/AutoRefresh';
import { NowServing } from '@/components/features/queue/NowServing';
import { QueueEmpty } from '@/components/features/queue/QueueEmpty';
import { QueueHeader } from '@/components/features/queue/QueueHeader';
import { FinishedRow, QueueRow } from '@/components/features/queue/QueueRow';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { requireTrackUser } from '@/domain/auth/guards';
import { getTrackBoard } from '@/domain/interviews/interview.service';
import { listRegistrationTracks } from '@/domain/tracks/track.service';
import { Play } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BoardPage() {
  const user = await requireTrackUser();
  const board = await getTrackBoard(user.trackId!);
  const otherTracks = (await listRegistrationTracks()).filter((track) => track.id !== board.trackId);

  const isEmpty = !board.nowServing && board.waiting.length === 0 && board.finished.length === 0;
  const nextUp = board.waiting[0];

  return (
    <>
      <AutoRefresh />
      <QueueHeader board={board} waitingCount={board.waiting.length} finishedCount={board.finished.length} />

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
                    entry={entry}
                    action={
                      !board.nowServing && entry.id === nextUp?.id ? (
                        <form action={startInterviewAction.bind(null, entry.id)}>
                          <Button size="sm">Start</Button>
                        </form>
                      ) : null
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
