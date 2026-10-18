import { TrackBoardView } from '@/components/features/queue/TrackBoardView';
import { PageHeader } from '@/components/features/shared/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { requireAdmin } from '@/domain/auth/guards';
import { getTrackBoard } from '@/domain/interviews/interview.service';
import { listRegistrationTracks } from '@/domain/tracks/track.service';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * An admin opening any track's board from the overview.
 *
 * Same component, same data, same actions as the track's own board — so an
 * admin can step in and work a queue exactly the way its committee does. The
 * database still decides what this account may do (can_manage_interview).
 */
export default async function AdminTrackBoardPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  await requireAdmin();

  const { trackId } = await params;

  const board = await getTrackBoard(trackId);
  if (!board) notFound();

  const otherTracks = (await listRegistrationTracks()).filter(
    (track) => track.id !== board.trackId,
  );

  return (
    <>
      <PageHeader
        title={board.trackName}
        subtitle="This is the track's live board. Anything you start, finish, or transfer here updates the real queue."
        actions={
          <>
            <Badge tone="active">Admin view</Badge>
            <Link href="/admin/tracks" className={buttonClasses('secondary', 'sm')}>
              <ArrowLeft className="h-4 w-4" />
              All tracks
            </Link>
          </>
        }
      />

      <TrackBoardView board={board} otherTracks={otherTracks} />
    </>
  );
}
