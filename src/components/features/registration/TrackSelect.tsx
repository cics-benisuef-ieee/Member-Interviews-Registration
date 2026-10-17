import { Select } from '@/components/ui/Form';
import type { Track } from '@/domain/tracks/track.types';

interface TrackSelectProps {
  tracks: Track[];
  id?: string;
  name?: string;
  defaultValue?: string;
}

/** The track dropdown — used by the public form and the admin panel. */
export function TrackSelect({ tracks, id = 'trackId', name = 'trackId', defaultValue }: TrackSelectProps) {
  return (
    <Select id={id} name={name} required defaultValue={defaultValue}>
      <option value="" disabled>
        Choose a track…
      </option>
      {tracks.map((track) => (
        <option key={track.id} value={track.id}>
          {track.name}
        </option>
      ))}
    </Select>
  );
}
