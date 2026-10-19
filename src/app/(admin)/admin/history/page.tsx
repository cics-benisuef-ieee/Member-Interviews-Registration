import { HistoryFilters } from '@/components/features/admin/HistoryFilters';
import { HistoryList } from '@/components/features/admin/HistoryList';
import { PurgePastMembersButton } from '@/components/features/admin/PurgePastMembersButton';
import { PageHeader } from '@/components/features/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { getHistory } from '@/domain/interviews/interview.service';
import { listAllTracks } from '@/domain/tracks/track.service';

export const dynamic = 'force-dynamic';

export default async function AdminHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; day?: string }>;
}) {
  const { track = '', day = '' } = await searchParams;

  const [tracks, { entries, day: today }] = await Promise.all([
    listAllTracks(),
    getHistory({ trackId: track || undefined, day: day || undefined }),
  ]);

  return (
    <>
      <PageHeader
        title="History"
        subtitle={`Every interview recorded. Today is ${today}.`}
        actions={<PurgePastMembersButton />}
      />

      <div className="space-y-6">
        <Card>
          <HistoryFilters tracks={tracks} selectedTrackId={track} selectedDay={day} />
        </Card>

        <Card flush>
          {entries.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ieee-gray">
              No interviews match these filters.
            </p>
          ) : (
            // Desktop: the full table. Mobile & tablet: one card per entry.
            <HistoryList entries={entries} canEditMember />
          )}
        </Card>
      </div>
    </>
  );
}
