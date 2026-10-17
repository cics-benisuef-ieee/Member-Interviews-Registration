'use client';

import { resetTrackCredentialsAction, setTrackActiveAction, type TrackFormState } from '@/actions/track.actions';
import { Badge } from '@/components/ui/Badge';
import type { TrackWithLogin } from '@/domain/tracks/track.types';
import { KeyRound } from 'lucide-react';
import { useActionState } from 'react';

/** One track in the admin table: toggle active + reset its login password. */
export function TrackRow({ track }: { track: TrackWithLogin }) {
  const [state, resetAction, pending] = useActionState<TrackFormState, FormData>(
    resetTrackCredentialsAction,
    { error: null, newCredential: null },
  );

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <form action={setTrackActiveAction}>
            <input type="hidden" name="trackId" value={track.id} />
            <input type="hidden" name="isActive" value={String(!track.isActive)} />
            <button
              type="submit"
              className="rounded-lg border border-hairline px-3 py-1.5 text-sm font-semibold text-ieee-gray transition-colors hover:border-ieee-blue hover:text-ieee-blue"
            >
              {track.isActive ? 'Disable' : 'Enable'}
            </button>
          </form>

          <form action={resetAction}>
            <input type="hidden" name="trackId" value={track.id} />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-lg border border-hairline px-3 py-1.5 text-sm font-semibold text-ieee-gray transition-colors hover:border-ieee-blue hover:text-ieee-blue disabled:opacity-50"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {pending ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        </div>

        {state.error && (
          <p className="mt-2 text-right text-sm font-semibold text-ieee-red-dark">{state.error}</p>
        )}
        {state.newCredential && (
          <p className="mt-2 rounded-lg bg-ieee-gold/30 px-3 py-2 text-right text-sm font-semibold text-ieee-navy">
            New password for {state.newCredential.email}: <code>{state.newCredential.password}</code> —
            copy it now, it won’t be shown again.
          </p>
        )}
      </td>
    </tr>
  );
}
