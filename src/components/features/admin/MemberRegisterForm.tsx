'use client';

import { registerMemberAdminAction, type MemberFormState } from '@/actions/member.actions';
import { Button } from '@/components/ui/Button';
import { Field, FormError, FormSuccess, Input, TextArea } from '@/components/ui/Form';
import { TrackSelect } from '@/components/features/registration/TrackSelect';
import type { Track } from '@/domain/tracks/track.types';
import { useActionState } from 'react';

/** Admin registers a member straight into a track's queue. */
export function MemberRegisterForm({ tracks }: { tracks: Track[] }) {
  const [state, formAction, pending] = useActionState<MemberFormState, FormData>(
    registerMemberAdminAction,
    { error: null, successMessage: null },
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Track">
        <TrackSelect tracks={tracks} />
      </Field>

      <Field label="Full name">
        <Input name="fullName" required />
      </Field>

      <Field label="Phone">
        <Input name="phone" type="tel" />
      </Field>

      <Field label="Email (optional)">
        <Input name="email" type="email" />
      </Field>

      <Field label="Notes (optional)">
        <TextArea name="notes" />
      </Field>

      <FormError message={state.error} />
      <FormSuccess message={state.successMessage} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Adding…' : 'Add to queue'}
      </Button>
    </form>
  );
}
