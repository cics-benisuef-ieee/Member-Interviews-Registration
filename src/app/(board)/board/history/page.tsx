import { HistoryList } from '@/components/features/admin/HistoryList';
import { TrackHistoryFilters } from '@/components/features/queue/TrackHistoryFilters';
import { PageHeader } from '@/components/features/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { requireTrackUser } from '@/domain/auth/guards';
import { getTrackHistory } from '@/domain/interviews/interview.service';

export const dynamic = 'force-dynamic';

/**
 * A track's own history: every interview it has recorded, across days.
 *
 * The track is taken from the signed-in session, so this page can only ever
 * show the caller's own interviews — and row-level security (0004) enforces
 * exactly the same boundary at the database. Each day is reviewable and
 * correctable, the same as on the board itself.
 */
export default async function BoardHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const user = await requireTrackUser();
  const { day = '' } = await searchParams;

  const { entries, day: today } = await getTrackHistory(user.trackId!, {
    day: day || undefined,
  });

  return (
    <>
      <PageHeader
        title="History"
        subtitle={`Every interview your track has recorded. Today is ${today}.`}
      />

      <div className="space-y-6">
        <Card>
          <TrackHistoryFilters selectedDay={day} />
        </Card>

        <Card flush>
          {entries.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ieee-gray">
              No interviews match this day.
            </p>
          ) : (
            // Desktop: the full table. Mobile & tablet: one card per entry.
            <HistoryList entries={entries} />
          )}
        </Card>
      </div>
    </>
  );
}
