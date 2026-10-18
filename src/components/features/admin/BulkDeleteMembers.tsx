'use client';

import { deleteMembersAction } from '@/actions/member.actions';
import type { ActionState } from '@/lib/action-state';
import { Trash2 } from 'lucide-react';
import { useActionState, useState } from 'react';

interface BulkDeleteMembersProps {
  /** The ids of every member currently listed — the action deletes exactly these. */
  memberIds: string[];
}

/**
 * Removes every member currently listed in one go, so a demo or test batch can
 * be cleared without clicking through it.
 *
 * The action is handed the exact id list rendered here rather than "everything
 * that matches", so what the admin confirms is what gets deleted even if the
 * search is re-run in the meantime.
 */
export function BulkDeleteMembers({ memberIds }: BulkDeleteMembersProps) {
  const [confirming, setConfirming] = useState(false);
  const [state, deleteAction, pending] = useActionState<ActionState, FormData>(
    deleteMembersAction,
    { error: null },
  );

  if (memberIds.length === 0) return null;

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ieee-red-dark/25 bg-ieee-red-dark/5 px-4 py-3">
        <p className="text-sm font-semibold text-ieee-red-dark">
          Delete {memberIds.length} {memberIds.length === 1 ? 'member' : 'members'} and every queue
          entry they are in? This cannot be undone.
        </p>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-xl px-3 py-1.5 text-sm font-semibold text-ieee-gray transition-colors hover:bg-hairline/60 hover:text-ieee-navy"
          >
            Cancel
          </button>
          <form action={deleteAction}>
            {memberIds.map((id) => (
              <input key={id} type="hidden" name="memberIds" value={id} />
            ))}
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-xl bg-ieee-red-dark px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-ieee-red disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {pending ? 'Deleting…' : `Delete ${memberIds.length}`}
            </button>
          </form>
        </div>

        {state.error && (
          <p className="w-full text-sm font-semibold text-ieee-red-dark">{state.error}</p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1 rounded-xl border border-ieee-red-dark/30 px-3 py-1.5 text-sm font-semibold text-ieee-red-dark transition-colors hover:bg-ieee-red-dark hover:text-white"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Delete all {memberIds.length} listed
    </button>
  );
}
