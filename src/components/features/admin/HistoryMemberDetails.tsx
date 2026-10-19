'use client';

import { Button } from '@/components/ui/Button';
import type { InterviewHistoryEntry } from '@/domain/interviews/interview.types';
import type { Member } from '@/domain/members/member.types';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { MemberEditForm } from './MemberEditForm';

/**
 * The member behind a history entry: their saved details, read-only until an
 * admin opens the editor.
 *
 * Editing writes to the shared member record — the same one the members list
 * edits — so a correction here shows up everywhere, and it still works after
 * the member row itself has been purged. A track board reads the same details
 * to call the member in, but only an admin may change them, so `canEdit` is
 * false there and the edit button is not rendered.
 */
export function HistoryMemberDetails({
  entry,
  canEdit = false,
}: {
  entry: InterviewHistoryEntry;
  canEdit?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  const member: Member = {
    id: entry.memberRef,
    fullName: entry.memberName,
    phone: entry.memberPhone,
    email: entry.memberEmail,
    position: entry.memberPosition,
    notes: entry.memberNotes,
  };

  return (
    <div className="rounded-xl border border-hairline bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-widest text-ieee-blue uppercase">Member</p>
          <p className="mt-1 font-semibold text-ieee-navy">{member.fullName}</p>
          <p className="mt-0.5 text-sm text-ieee-gray">
            {member.phone ?? 'No phone'}
            {member.email && ` · ${member.email}`}
          </p>
          {member.position && <p className="text-sm text-ieee-gray">{member.position}</p>}
          {member.notes && <p className="mt-1 text-sm text-ieee-gray italic">{member.notes}</p>}
        </div>

        {canEdit && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-expanded={editing}
            onClick={() => setEditing((open) => !open)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {editing ? 'Close' : 'Edit member'}
          </Button>
        )}
      </div>

      {canEdit && editing && (
        <div className="mt-3">
          <MemberEditForm member={member} onDone={() => setEditing(false)} />
        </div>
      )}
    </div>
  );
}
