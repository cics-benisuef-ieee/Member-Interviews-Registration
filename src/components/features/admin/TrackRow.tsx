import { Badge } from '@/components/ui/Badge';
import type { TrackWithLogin } from '@/domain/tracks/track.types';
import { TrackAdminActions } from './TrackAdminActions';

/** One track in the admin table — the `lg`-and-up view. */
export function TrackRow({ track }: { track: TrackWithLogin }) {
  return (
    <tr className="border-b border-hairline last:border-b-0">
      <td className="px-5 py-3 font-semibold text-ieee-navy">{track.name}</td>
      <td className="px-5 py-3 text-sm text-ieee-gray">{track.loginEmail}</td>
      <td className="px-5 py-3">
        {track.isActive ? (
          <Badge tone="passed">Active</Badge>
        ) : (
          <Badge tone="neutral">Disabled</Badge>
        )}
      </td>
      <td className="px-5 py-3">
        {track.tvVisible ? (
          <Badge tone="active">On TV</Badge>
        ) : (
          <Badge tone="neutral">Hidden</Badge>
        )}
      </td>
      <td className="px-5 py-3">
        <TrackAdminActions track={track} />
      </td>
    </tr>
  );
}

/** One track as a card — the below-`lg` view, where the table does not fit. */
export function TrackCard({ track }: { track: TrackWithLogin }) {
  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-ieee-navy">{track.name}</p>
        <div className="flex flex-wrap items-center gap-2">
          {track.isActive ? (
            <Badge tone="passed">Active</Badge>
          ) : (
            <Badge tone="neutral">Disabled</Badge>
          )}
          {track.tvVisible ? (
            <Badge tone="active">On TV</Badge>
          ) : (
            <Badge tone="neutral">Hidden</Badge>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm break-all text-ieee-gray">{track.loginEmail}</p>
      <div className="mt-3">
        <TrackAdminActions track={track} />
      </div>
    </li>
  );
}
