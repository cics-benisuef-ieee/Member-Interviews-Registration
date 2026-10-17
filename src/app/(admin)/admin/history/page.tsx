import { HistoryFilters } from '@/components/features/admin/HistoryFilters';
import { StatusBadge } from '@/components/features/queue/StatusBadge';
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
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-hairline text-xs tracking-wider text-ieee-gray uppercase">
                  <th className="px-5 py-3">Day</th>
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Member</th>
                  <th className="px-5 py-3">Track</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Sent to</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-hairline text-sm last:border-b-0">
                    <td className="px-5 py-3 text-ieee-gray">{entry.queueDay}</td>
                    <td className="px-5 py-3 font-bold text-ieee-blue">{entry.queueNumber}</td>
                    <td className="px-5 py-3 font-semibold text-ieee-navy">{entry.memberName}</td>
                    <td className="px-5 py-3 text-ieee-gray">{entry.trackName}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-5 py-3 text-ieee-gray">
                      {entry.transferredToTrackName ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
