'use client';

import { deleteMemberAction } from '@/actions/member.actions';
import { Badge } from '@/components/ui/Badge';
import type { Member, MemberDayStatus } from '@/domain/members/member.types';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MemberEditForm } from './MemberEditForm';
import { dayStatusLabel, dayStatusTone } from './members.format';

interface MemberListItemProps {
  member: Member;
  /** Where the member stands in today's queue; null if they have no entry today. */
  status: MemberDayStatus | null;
}

/**
 * One member in the admin list: where they stand today, their details, with
 * inline editing and deletion.
 *
 * Deletion is destructive and cannot be undone — it also removes every queue
 * entry that member was part of — so it always takes two deliberate clicks.
 */
export function MemberListItem({ member, status }: MemberListItemProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <li className="border-b border-hairline px-5 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ieee-navy">{member.fullName}</p>
            <Badge tone={status ? dayStatusTone(status) : 'neutral'}>
              {status ? dayStatusLabel(status) : 'Not queued today'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-ieee-gray">
            {member.phone ?? 'No phone'}
            {member.email && ` · ${member.email}`}
          </p>
          {member.notes && <p className="mt-1 text-sm text-ieee-gray italic">{member.notes}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {confirmingDelete ? (
            <>
              <form action={deleteMemberAction.bind(null, member.id)}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-xl bg-ieee-red-dark px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-ieee-red"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete forever
                </button>
              </form>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-xl px-3 py-1.5 text-sm font-semibold text-ieee-gray transition-colors hover:bg-hairline/60 hover:text-ieee-navy"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className="inline-flex items-center gap-1 rounded-xl border border-hairline px-3 py-1.5 text-sm font-semibold text-ieee-gray transition-colors hover:border-ieee-blue hover:text-ieee-blue"
              >
                <Pencil className="h-3.5 w-3.5" />
                {editing ? 'Close' : 'Edit'}
              </button>
              <button
                type="button"
                title="Removes this member and every queue entry they were in"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-ieee-red-dark/30 px-3 py-1.5 text-sm font-semibold text-ieee-red-dark transition-colors hover:bg-ieee-red-dark hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-3">
          <MemberEditForm member={member} onDone={() => setEditing(false)} />
        </div>
      )}
    </li>
  );
}
