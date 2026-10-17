'use client';

import { loginAction, type LoginFormState } from '@/actions/auth.actions';
import { Button } from '@/components/ui/Button';
import { Field, FormError, Input } from '@/components/ui/Form';
import Link from 'next/link';
import { useActionState } from 'react';

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(loginAction, {
    error: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      <Field label="Email">
        <Input
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="track@ieee.local"
        />
      </Field>

      <Field label="Password">
        <Input name="password" type="password" required autoComplete="current-password" />
      </Field>

      <FormError message={state.error} />

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-ieee-gray">
        New member?{' '}
        <Link href="/register" className="font-semibold text-ieee-blue hover:underline">
          Register for an interview
        </Link>
      </p>
    </form>
  );
}
