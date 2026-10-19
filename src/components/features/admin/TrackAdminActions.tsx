'use client';

import {
  resetTrackCredentialsAction,
  setTrackActiveAction,
  setTrackTvVisibleAction,
  type TrackFormState,
} from '@/actions/track.actions';
import { buttonClasses } from '@/components/ui/Button';
import type { TrackWithLogin } from '@/domain/tracks/track.types';
import type { ActionState } from '@/lib/action-state';
import { KeyRound, LayoutDashboard, Monitor } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';

/**
 * Every control for one track — open its board, enable/disable it, toggle its
 * TV visibility, and reset its login password.
 *
 * Shared by the desktop table row and the mobile card, so the two views can
 * never drift apart. Alignment follows the view: left in the card, right in the
 * table (the table only exists from `lg` up).
 */
export function TrackAdminActions({ track }: { track: TrackWithLogin }) {
  const [state, resetAction, pending] = useActionState<TrackFormState, FormData>(
    resetTrackCredentialsAction,
    { error: null, newCredential: null },
  );
  const [activeState, activeAction, activePending] = useActionState<ActionState, FormData>(
    setTrackActiveAction,
    { error: null },
  );
  const [tvState, tvAction, tvPending] = useActionState<ActionState, FormData>(
    setTrackTvVisibleAction,
    { error: null },
  );

  const error = state.error ?? activeState.error ?? tvState.error;

  return (
    <>
      <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
        <Link href={`/admin/tracks/${track.id}`} className={buttonClasses('secondary', 'sm')}>
          <LayoutDashboard className="h-3.5 w-3.5" />
          Board
        </Link>

        <form action={activeAction}>
          <input type="hidden" name="trackId" value={track.id} />
          <input type="hidden" name="isActive" value={String(!track.isActive)} />
          <button
            type="submit"
            disabled={activePending}
            className="rounded-xl border border-hairline px-3 py-1.5 text-sm font-semibold text-ieee-gray transition-colors hover:border-ieee-blue hover:text-ieee-blue disabled:opacity-50"
          >
            {track.isActive ? 'Disable' : 'Enable'}
          </button>
        </form>

        <form action={tvAction}>
          <input type="hidden" name="trackId" value={track.id} />
          <input type="hidden" name="tvVisible" value={String(!track.tvVisible)} />
          <button
            type="submit"
            disabled={tvPending}
            title="Controls only whether this track appears on the public /tv hall display"
            className="inline-flex items-center gap-1 rounded-xl border border-hairline px-3 py-1.5 text-sm font-semibold text-ieee-gray transition-colors hover:border-ieee-blue hover:text-ieee-blue disabled:opacity-50"
          >
            <Monitor className="h-3.5 w-3.5" />
            {track.tvVisible ? 'Hide from TV' : 'Show on TV'}
          </button>
        </form>

        <form action={resetAction}>
          <input type="hidden" name="trackId" value={track.id} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-xl border border-hairline px-3 py-1.5 text-sm font-semibold text-ieee-gray transition-colors hover:border-ieee-blue hover:text-ieee-blue disabled:opacity-50"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {pending ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
      </div>

      {error && (
        <p className="mt-2 text-left text-sm font-semibold text-ieee-red-dark lg:text-right">
          {error}
        </p>
      )}
      {state.newCredential && (
        <p className="mt-2 rounded-lg bg-ieee-gold/30 px-3 py-2 text-left text-sm font-semibold text-ieee-navy lg:text-right">
          New password for {state.newCredential.email}:{' '}
          <code className="break-all">{state.newCredential.password}</code> — copy it now, it won’t
          be shown again.
        </p>
      )}
    </>
  );
}
