'use client';

import { purgePastMembersAction, type PurgeMembersState } from '@/actions/member.actions';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Form';
import { Archive } from 'lucide-react';
import { useActionState, useState } from 'react';

/**
 * Empties the live members table of everyone whose day is over — members should
 * not outlive their day. Their interviews stay, snapshot and all, so history is
 * untouched; this only clears the working list. Two deliberate clicks, since it
 * is a bulk operation.
 */
export function PurgePastMembersButton() {
  const [confirming, setConfirming] = useState(false);
  const [state, purge, pending] = useActionState<PurgeMembersState, FormData>(
    purgePastMembersAction,
    { error: null, purged: null },
  );

  if (!confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button type="button" size="sm" variant="secondary" onClick={() => setConfirming(true)}>
          <Archive className="h-3.5 w-3.5" />
          Clear past members
        </Button>
        {state.purged !== null && (
          <p className="text-xs text-ieee-gray">
            Removed {state.purged} {state.purged === 1 ? 'member' : 'members'} — history kept.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={purge} className="flex flex-col items-end gap-2">
      <p className="max-w-xs text-right text-xs text-ieee-gray">
        Remove every member whose interviews are all before today? Their interview history is kept.
      </p>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="danger" disabled={pending}>
          <Archive className="h-3.5 w-3.5" />
          {pending ? 'Clearing…' : 'Clear past members'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
      <FormError message={state.error} />
    </form>
  );
}
