'use client';

import { transferInterviewAction } from '@/actions/interview.actions';
import { Button } from '@/components/ui/Button';
import { FormError, Select } from '@/components/ui/Form';
import { ArrowRightLeft } from 'lucide-react';
import { useEffect, useRef, useState, useActionState } from 'react';

interface TransferDialogProps {
  interviewId: string;
  targetTracks: { id: string; name: string }[];
  /** Transfers are gated on a complete evaluation, like pass and reject. */
  disabled?: boolean;
  disabledHint?: string;
}

/**
 * Lets the board send the member to another track for a second interview
 * today. The member is appended to the target track's queue.
 */
export function TransferDialog({
  interviewId,
  targetTracks,
  disabled = false,
  disabledHint,
}: TransferDialogProps) {
  const [open, setOpen] = useState(false);
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const [state, formAction, pending] = useActionState(transferInterviewAction, { error: null });
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Close only after a successful transfer (the action returns no error).
  useEffect(() => {
    if (wasSubmitted && state.error === null) {
      setOpen(false);
      setWasSubmitted(false);
    }
  }, [state, wasSubmitted]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <Button
        variant="accent"
        type="button"
        disabled={disabled}
        title={disabled ? disabledHint : undefined}
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto"
      >
        <ArrowRightLeft className="h-4 w-4" />
        Send to another track
      </Button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-hairline bg-white p-0 backdrop:bg-ieee-navy/50"
      >
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-ieee-navy">Send to another track</h2>
          <p className="mt-1 text-sm text-ieee-gray">
            The member joins the chosen track’s queue for the rest of today.
          </p>

          <form
            action={formAction}
            onSubmit={() => setWasSubmitted(true)}
            className="mt-4 space-y-4"
          >
            <input type="hidden" name="interviewId" value={interviewId} />

            <div>
              <label
                htmlFor="targetTrackId"
                className="mb-1 block text-sm font-semibold text-ieee-navy"
              >
                Track
              </label>
              <Select id="targetTrackId" name="targetTrackId" required defaultValue="">
                <option value="" disabled>
                  Choose a track…
                </option>
                {targetTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.name}
                  </option>
                ))}
              </Select>
            </div>

            <FormError message={state.error} />

            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="accent" type="submit" disabled={pending}>
                {pending ? 'Sending…' : 'Send member'}
              </Button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
