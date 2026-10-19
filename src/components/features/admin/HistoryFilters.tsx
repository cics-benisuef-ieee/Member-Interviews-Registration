'use client';

import { Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input, Select } from '@/components/ui/Form';

interface HistoryFilterProps {
  tracks: { id: string; name: string }[];
  selectedTrackId: string;
  selectedDay: string;
  /** Where to send the filters; admin and board each have their own history. */
  action?: string;
}

/** History filters — write their state into the URL so views are shareable. */
export function HistoryFilters({
  tracks,
  selectedTrackId,
  selectedDay,
  action = '/admin/history',
}: HistoryFilterProps) {
  const router = useRouter();
  const [trackId, setTrackId] = useState(selectedTrackId);
  const [day, setDay] = useState(selectedDay);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (trackId) params.set('track', trackId);
    if (day) params.set('day', day);
    router.push(`${action}?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-sm font-semibold text-ieee-navy">Track</label>
        <Select
          value={trackId}
          onChange={(event) => setTrackId(event.target.value)}
          aria-label="Track"
        >
          <option value="">All tracks</option>
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-ieee-navy">Day</label>
        <Input
          type="date"
          value={day}
          onChange={(event) => setDay(event.target.value)}
          aria-label="Day"
        />
      </div>

      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg bg-ieee-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ieee-navy"
      >
        <Filter className="h-4 w-4" />
        Apply
      </button>
    </form>
  );
}
