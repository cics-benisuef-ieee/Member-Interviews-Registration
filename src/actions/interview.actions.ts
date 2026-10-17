'use server';

import { revalidatePath } from 'next/cache';
import { requireTrackUser } from '@/domain/auth/guards';
import { finishInterview, startInterview, transferInterview } from '@/domain/interviews/interview.service';

/** WAITING → IN_INTERVIEW. Only the board that owns the track may call this. */
export async function startInterviewAction(interviewId: string): Promise<void> {
  await requireTrackUser();
  await startInterview(interviewId);
  revalidatePath('/board');
}

/** IN_INTERVIEW → PASSED. */
export async function passInterviewAction(interviewId: string): Promise<void> {
  await requireTrackUser();
  await finishInterview({ interviewId, outcome: 'PASSED' });
  revalidatePath('/board');
}

/** IN_INTERVIEW → REJECTED. */
export async function rejectInterviewAction(interviewId: string): Promise<void> {
  await requireTrackUser();
  await finishInterview({ interviewId, outcome: 'REJECTED' });
  revalidatePath('/board');
}

export interface TransferFormState {
  error: string | null;
}

/** IN_INTERVIEW → NEEDS_ANOTHER_TRACK + appended to the target track's queue. */
export async function transferInterviewAction(
  _prevState: TransferFormState,
  formData: FormData,
): Promise<TransferFormState> {
  await requireTrackUser();

  try {
    await transferInterview({
      interviewId: String(formData.get('interviewId') ?? ''),
      targetTrackId: String(formData.get('targetTrackId') ?? ''),
      notes: String(formData.get('notes') ?? '') || undefined,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Transfer failed. Try again.' };
  }

  revalidatePath('/board');
  return { error: null };
}
