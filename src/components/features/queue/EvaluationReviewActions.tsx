'use client';

import { changeInterviewOutcomeAction, reopenInterviewAction } from '@/actions/interview.actions';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Form';
import { isEvaluationComplete } from '@/domain/interviews/evaluation';
import type { QueueEntry } from '@/domain/interviews/interview.types';
import type { ActionState } from '@/lib/action-state';
import { Pencil, RotateCcw } from 'lucide-react';
import { useActionState, useState } from 'react';
import { EvaluationForm } from './EvaluationForm';

/**
 * What a board or admin can do to a *finished* interview: correct the
 * evaluation, swap the decision (PASSED ⇄ REJECTED), or reopen it into the
 * queue. Read-only until one of these is chosen.
 */
export function EvaluationReviewActions({ entry }: { entry: QueueEntry }) {
  const [editing, setEditing] = useState(false);
  const [changeState, changeOutcome, changing] = useActionState<ActionState, FormData>(
    changeInterviewOutcomeAction,
    { error: null },
  );
  const [reopenState, reopen, reopening] = useActionState<ActionState, FormData>(
    reopenInterviewAction,
    { error: null },
  );

  const decided = entry.status === 'PASSED' || entry.status === 'REJECTED';
  const flipped = entry.status === 'PASSED' ? 'REJECTED' : 'PASSED';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-expanded={editing}
          onClick={() => setEditing((open) => !open)}
        >
          <Pencil className="h-3.5 w-3.5" />
          {editing ? 'Close editor' : 'Edit evaluation'}
        </Button>

        {decided && (
          <form action={changeOutcome}>
            <input type="hidden" name="interviewId" value={entry.id} />
            <input type="hidden" name="outcome" value={flipped} />
            <Button
              type="submit"
              size="sm"
              variant={flipped === 'PASSED' ? 'success' : 'danger'}
              disabled={changing}
            >
              {changing ? 'Saving…' : `Change to ${flipped === 'PASSED' ? 'Passed' : 'Rejected'}`}
            </Button>
          </form>
        )}

        <form action={reopen}>
          <input type="hidden" name="interviewId" value={entry.id} />
          <Button type="submit" size="sm" variant="secondary" disabled={reopening}>
            <RotateCcw className="h-3.5 w-3.5" />
            {reopening ? 'Reopening…' : 'Re-open in queue'}
          </Button>
        </form>
      </div>

      <FormError message={changeState.error ?? reopenState.error} />

      {entry.status === 'NEEDS_ANOTHER_TRACK' && (
        <p className="text-xs text-ieee-gray">
          Reopening cancels the receiving track’s entry, unless that track has already started the
          member — then reopen that interview instead.
        </p>
      )}

      {!isEvaluationComplete(entry.evaluation) && (
        <p className="text-xs font-semibold text-ieee-orange-dark">
          The record is missing something — the decision can only be changed once the evaluation is
          complete again.
        </p>
      )}

      {editing && (
        <div className="rounded-xl border border-hairline bg-white p-4">
          <EvaluationForm entry={entry} finished />
        </div>
      )}
    </div>
  );
}
