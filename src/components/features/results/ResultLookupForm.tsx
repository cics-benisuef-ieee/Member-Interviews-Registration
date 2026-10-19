'use client';

import { lookupResultsAction, type ResultLookupState } from '@/actions/results.actions';
import { Button } from '@/components/ui/Button';
import { Field, FormError, Input } from '@/components/ui/Form';
import { useActionState } from 'react';
import { ResultCard } from './ResultCard';

/**
 * The public result lookup: a member enters the email and phone they
 * registered with and, if both match, their own interviews appear below.
 * The form stays on screen so a typo can be corrected and retried.
 */
export function ResultLookupForm() {
  const [state, formAction, pending] = useActionState<ResultLookupState, FormData>(
    lookupResultsAction,
    { error: null, results: null },
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <Field label="Email address" hint="The one you registered with.">
          <Input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Phone number" hint="The same number you gave at registration.">
          <Input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+20 100 000 0000"
          />
        </Field>

        <FormError message={state.error} />

        <Button type="submit" disabled={pending} size="lg" className="w-full">
          {pending ? 'Looking up…' : 'Show my result'}
        </Button>
      </form>

      {!pending && state.results && (
        <section aria-live="polite" className="space-y-3">
          <h2 className="text-xs font-bold tracking-widest text-ieee-blue uppercase">
            {state.results.length === 1 ? 'Your interview result' : 'Your interview results'}
          </h2>
          {state.results.map((result) => (
            <ResultCard
              key={`${result.queueDay}-${result.trackName}-${result.queueNumber}`}
              result={result}
            />
          ))}
        </section>
      )}
    </div>
  );
}
