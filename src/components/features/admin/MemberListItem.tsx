'use client';

import type { Member } from '@/domain/members/member.types';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { MemberEditForm } from './MemberEditForm';

/** One member in the admin list: details, with inline editing on demand. */
export function MemberListItem({ member }: { member: Member }) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="border-b border-hairline px-5 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-ieee-navy">{member.fullName}</p>
          <p className="text-sm text-ieee-gray">
            {member.phone ?? 'No phone'}
            {member.email && ` · ${member.email}`}
          </p>
          {member.notes && <p className="mt-1 text-sm text-ieee-gray italic">{member.notes}</p>}
        </div>

        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="inline-flex items-center gap-1 rounded-lg border border-hairline px-3 py-1.5 text-sm font-semibold text-ieee-gray transition-colors hover:border-ieee-blue hover:text-ieee-blue"
        >
          <Pencil className="h-3.5 w-3.5" />
          {editing ? 'Close' : 'Edit'}
        </button>
      </div>

      {editing && (
        <div className="mt-3">
          <MemberEditForm member={member} onDone={() => setEditing(false)} />
        </div>
      )}
    </li>
  );
}
