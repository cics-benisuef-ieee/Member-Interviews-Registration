'use client';

import { Input } from '@/components/ui/Form';
import { Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * A track's history filter: by day only.
 *
 * The admin version also offers a track dropdown; a board only ever sees its
 * own track, so that control would be a lie. Narrowing by day writes into the
 * URL, the same as everywhere else, so a day's view is shareable.
 */
export function TrackHistoryFilters({ selectedDay }: { selectedDay: string }) {
  const router = useRouter();
  const [day, setDay] = useState(selectedDay);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (day) params.set('day', day);
    router.push(`/board/history${params.size > 0 ? `?${params.toString()}` : ''}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
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
