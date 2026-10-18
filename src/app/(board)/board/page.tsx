import { TrackBoardView } from '@/components/features/queue/TrackBoardView';
import { requireTrackUser } from '@/domain/auth/guards';
import { getTrackBoard } from '@/domain/interviews/interview.service';
import { listRegistrationTracks } from '@/domain/tracks/track.service';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** A track's own board — the view its shared login sees all day. */
export default async function BoardPage() {
  const user = await requireTrackUser();

  const board = await getTrackBoard(user.trackId!);
  if (!board) notFound();

  const otherTracks = (await listRegistrationTracks()).filter(
    (track) => track.id !== board.trackId,
  );

  return <TrackBoardView board={board} otherTracks={otherTracks} />;
}
