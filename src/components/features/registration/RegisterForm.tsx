'use client';

import { registerMemberAction, type RegisterFormState } from '@/actions/registration.actions';
import { Button } from '@/components/ui/Button';
import { Field, FormError, Input, TextArea } from '@/components/ui/Form';
import type { Track } from '@/domain/tracks/track.types';
import { useActionState } from 'react';
import { TrackSelect } from './TrackSelect';

export function RegisterForm({ tracks }: { tracks: Track[] }) {
  const [state, formAction, pending] = useActionState<RegisterFormState, FormData>(
    registerMemberAction,
    { error: null },
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Which track are you interviewing with?"
        hint="Choose the track that matches your application."
      >
        <TrackSelect tracks={tracks} />
      </Field>

      <Field label="Full name">
        <Input name="fullName" required placeholder="Your full name" />
      </Field>

      <Field label="Phone number" hint="So the track can reach you if needed.">
        <Input name="phone" type="tel" placeholder="+20 100 000 0000" />
      </Field>

      <Field label="Email (optional)">
        <Input name="email" type="email" placeholder="you@example.com" />
      </Field>

      <Field label="Notes (optional)">
        <TextArea name="notes" placeholder="Anything the interviewers should know" />
      </Field>

      <FormError message={state.error} />

      <Button type="submit" disabled={pending} size="lg" className="w-full">
        {pending ? 'Registering…' : 'Register for interview'}
      </Button>
    </form>
  );
}
