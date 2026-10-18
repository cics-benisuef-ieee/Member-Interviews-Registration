'use client';

import {
  passInterviewAction,
  rejectInterviewAction,
  unstartInterviewAction,
} from '@/actions/interview.actions';
import { TransferDialog } from '@/components/features/transfer/TransferDialog';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Form';
import type { ActionState } from '@/lib/action-state';
import { Undo2 } from 'lucide-react';
import { useActionState } from 'react';

interface ServingActionsProps {
  interviewId: string;
  /** Active tracks a member may be transferred to. */
  availableTracks: { id: string; name: string }[];
  /** The evaluation is complete — pass, reject, and transfer may run. */
  complete: boolean;
  /** Why they are still disabled, shown on hover. */
  unfinishedHint: string;
}

/**
 * The decisions a board can make about the member in front of it: pass,
 * reject, send on, or hand back to the queue.
 *
 * These are the busiest buttons in the app and the ones most likely to race
 * the database (a stale tab, a double click). Each action answers with either
 * "done" or the reason it could not, and the reason is shown under the row —
 * never by replacing the board with the error page.
 */
export function ServingActions({
  interviewId,
  availableTracks,
  complete,
  unfinishedHint,
}: ServingActionsProps) {
  const [passState, passAction, passPending] = useActionState<ActionState, FormData>(
    passInterviewAction,
    { error: null },
  );
  const [rejectState, rejectAction, rejectPending] = useActionState<ActionState, FormData>(
    rejectInterviewAction,
    { error: null },
  );
  const [unstartState, unstartAction, unstartPending] = useActionState<ActionState, FormData>(
    unstartInterviewAction,
    { error: null },
  );

  const error = passState.error ?? rejectState.error ?? unstartState.error;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <form action={passAction}>
          <input type="hidden" name="interviewId" value={interviewId} />
          <Button
            variant="success"
            type="submit"
            disabled={!complete || passPending}
            title={complete ? undefined : unfinishedHint}
          >
            {passPending ? 'Passing…' : 'Pass'}
          </Button>
        </form>

        <form action={rejectAction}>
          <input type="hidden" name="interviewId" value={interviewId} />
          <Button
            variant="danger"
            type="submit"
            disabled={!complete || rejectPending}
            title={complete ? undefined : unfinishedHint}
          >
            {rejectPending ? 'Rejecting…' : 'Reject'}
          </Button>
        </form>

        <TransferDialog
          interviewId={interviewId}
          targetTracks={availableTracks}
          disabled={!complete}
          disabledHint={unfinishedHint}
        />

        <form
          action={unstartAction}
          title="Returns the member to the waiting queue, keeping their place and the evaluation so far"
        >
          <input type="hidden" name="interviewId" value={interviewId} />
          <Button variant="secondary" type="submit" disabled={unstartPending}>
            <Undo2 className="h-4 w-4" />
            {unstartPending ? 'Returning…' : 'Unstart'}
          </Button>
        </form>
      </div>

      <FormError message={error} />
    </div>
  );
}
