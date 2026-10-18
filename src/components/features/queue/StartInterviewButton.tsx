'use client';

import { startInterviewAction } from '@/actions/interview.actions';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Form';
import type { ActionState } from '@/lib/action-state';
import { Play } from 'lucide-react';
import { useActionState } from 'react';

interface StartInterviewButtonProps {
  interviewId: string;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  /** The prominent call-to-action shows the play icon; queue rows stay quiet. */
  withIcon?: boolean;
}

/**
 * Calls the next member. The click is submitted to the server action, which
 * answers with either "started" or the reason it would not — a row that moved
 * on since this page was rendered, say. Either way the board stays on screen.
 */
export function StartInterviewButton({
  interviewId,
  label,
  size = 'md',
  withIcon = false,
}: StartInterviewButtonProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(startInterviewAction, {
    error: null,
  });

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="interviewId" value={interviewId} />
      <Button type="submit" variant="accent" size={size} disabled={pending}>
        {withIcon && <Play className="h-4 w-4" />}
        {pending ? 'Starting…' : label}
      </Button>
      <FormError message={state.error} />
    </form>
  );
}
