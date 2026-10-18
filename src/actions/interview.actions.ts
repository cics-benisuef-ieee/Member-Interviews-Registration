'use server';

import { revalidatePath } from 'next/cache';
import { requireBoardUser } from '@/domain/auth/guards';
import {
  finishInterview,
  startInterview,
  transferInterview,
} from '@/domain/interviews/interview.service';

/**
 * The same queue is rendered in two places: a track's own board, and the board
 * an admin opens from the overview. Both must refresh after any change, or the
 * admin view would keep showing a stale queue.
 */
function revalidateQueueViews(): void {
  revalidatePath('/board');
  revalidatePath('/admin/tracks/[trackId]', 'page');
}

/** WAITING → IN_INTERVIEW. Only a board that owns the track may call this. */
export async function startInterviewAction(interviewId: string): Promise<void> {
  await requireBoardUser();
  await startInterview(interviewId);
  revalidateQueueViews();
}

/** IN_INTERVIEW → PASSED. */
export async function passInterviewAction(interviewId: string): Promise<void> {
  await requireBoardUser();
  await finishInterview({ interviewId, outcome: 'PASSED' });
  revalidateQueueViews();
}

/** IN_INTERVIEW → REJECTED. */
export async function rejectInterviewAction(interviewId: string): Promise<void> {
  await requireBoardUser();
  await finishInterview({ interviewId, outcome: 'REJECTED' });
  revalidateQueueViews();
}

export interface TransferFormState {
  error: string | null;
}

/** IN_INTERVIEW → NEEDS_ANOTHER_TRACK + appended to the target track's queue. */
export async function transferInterviewAction(
  _prevState: TransferFormState,
  formData: FormData,
): Promise<TransferFormState> {
  await requireBoardUser();

  try {
    await transferInterview({
      interviewId: String(formData.get('interviewId') ?? ''),
      targetTrackId: String(formData.get('targetTrackId') ?? ''),
      notes: String(formData.get('notes') ?? '') || undefined,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Transfer failed. Try again.' };
  }

  revalidateQueueViews();
  return { error: null };
}
