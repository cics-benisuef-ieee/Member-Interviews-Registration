'use client';

import { createTrackAction, type TrackFormState } from '@/actions/track.actions';
import { Button } from '@/components/ui/Button';
import { Field, FormError, Input } from '@/components/ui/Form';
import { useActionState } from 'react';

export function TrackCreateForm() {
  const [state, formAction, pending] = useActionState<TrackFormState, FormData>(createTrackAction, {
    error: null,
    newCredential: null,
  });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="w-full flex-1 sm:min-w-64">
        <Field label="New track name">
          <Input name="name" required placeholder="e.g. Quantum Computing" />
        </Field>
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Adding…' : 'Add track'}
      </Button>

      <div className="w-full">
        <FormError message={state.error} />
      </div>
    </form>
  );
}
