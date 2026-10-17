'use client';

import { updateMemberAction, type MemberFormState } from '@/actions/member.actions';
import { Button } from '@/components/ui/Button';
import { Field, FormError, FormSuccess, Input, TextArea } from '@/components/ui/Form';
import type { Member } from '@/domain/members/member.types';
import { useActionState } from 'react';

interface MemberEditFormProps {
  member: Member;
  onDone: () => void;
}

/** Inline edit of a member's details. */
export function MemberEditForm({ member, onDone }: MemberEditFormProps) {
  const [state, formAction, pending] = useActionState<MemberFormState, FormData>(updateMemberAction, {
    error: null,
    successMessage: null,
  });

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-hairline bg-surface p-4">
      <input type="hidden" name="memberId" value={member.id} />

      <Field label="Full name">
        <Input name="fullName" defaultValue={member.fullName} required />
      </Field>

      <Field label="Phone">
        <Input name="phone" defaultValue={member.phone ?? ''} />
      </Field>

      <Field label="Email">
        <Input name="email" type="email" defaultValue={member.email ?? ''} />
      </Field>

      <Field label="Notes">
        <TextArea name="notes" defaultValue={member.notes ?? ''} />
      </Field>

      <FormError message={state.error} />
      <FormSuccess message={state.successMessage} />

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} size="sm">
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
