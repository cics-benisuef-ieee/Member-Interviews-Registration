import { TrackCard, TrackRow } from '@/components/features/admin/TrackRow';
import { TrackCreateForm } from '@/components/features/admin/TrackCreateForm';
import { PageHeader } from '@/components/features/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { listTracksWithLogins } from '@/domain/tracks/track.service';

export const dynamic = 'force-dynamic';

export default async function AdminTracksPage() {
  const tracks = await listTracksWithLogins();

  return (
    <>
      <PageHeader
        title="Tracks"
        subtitle="Each track has one shared login for its interview board. Tracks marked for the TV appear on the public hall display."
      />

      <div className="space-y-6">
        <Card>
          <TrackCreateForm />
        </Card>

        {/* Desktop: the full table, kept scrollable so it never overflows. */}
        <Card flush className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-hairline text-xs tracking-wider text-ieee-gray uppercase">
                  <th className="px-5 py-3">Track</th>
                  <th className="px-5 py-3">Login email</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">On TV</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((track) => (
                  <TrackRow key={track.id} track={track} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Mobile & tablet: one card per track, so nothing is crushed. */}
        <Card flush className="lg:hidden">
          <ul className="divide-y divide-hairline">
            {tracks.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
