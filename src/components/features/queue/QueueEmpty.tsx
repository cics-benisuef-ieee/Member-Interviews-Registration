import { Users } from 'lucide-react';

/** Shown when nobody is queued for a track. */
export function QueueEmpty({ trackName }: { trackName: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-white px-6 py-16 text-center">
      <Users className="h-10 w-10 text-ieee-gray" />
      <p className="mt-3 font-semibold text-ieee-navy">No one is queued yet</p>
      <p className="mt-1 text-sm text-ieee-gray">
        Members registered for {trackName} will appear here automatically.
      </p>
    </div>
  );
}
