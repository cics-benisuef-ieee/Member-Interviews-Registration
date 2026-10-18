'use server';

import { revalidatePath } from 'next/cache';
import { requireBoardUser } from '@/domain/auth/guards';
import {
  finishInterview,
  saveInterviewEvaluation,
  startInterview,
  transferInterview,
  unstartInterview,
} from '@/domain/interviews/interview.service';
import { evaluationFromFormData } from '@/domain/interviews/evaluation.schema';

/**
 * The same queue is rendered in three places: a track's own board, the board an
 * admin opens from the overview, and the members list (whose chips show where
 * each member stands). The public /tv display quotes it too. All must refresh
 * after any change, or one of them would keep showing a stale queue.
 */
function revalidateQueueViews(): void {
  revalidatePath('/board');
  revalidatePath('/admin/tracks/[trackId]', 'page');
  revalidatePath('/admin/members');
  revalidatePath('/tv');
}

/** WAITING → IN_INTERVIEW. Only a board that owns the track may call this. */
export async function startInterviewAction(interviewId: string): Promise<void> {
  await requireBoardUser();
  await startInterview(interviewId);
  revalidateQueueViews();
}

/**
 * IN_INTERVIEW → WAITING. Keeps the queue number and any evaluation saved
 * so far — only the clock resets.
 */
export async function unstartInterviewAction(interviewId: string): Promise<void> {
  await requireBoardUser();
  await unstartInterview(interviewId);
  revalidateQueueViews();
}

export interface EvaluationFormState {
  error: string | null;
  /** Shown after a successful save ("Saved at 14:35"). */
  savedAt: string | null;
}

/** Saves the evaluation (data section + criteria with notes) for the member being interviewed. */
export async function saveInterviewEvaluationAction(
  _prevState: EvaluationFormState,
  formData: FormData,
): Promise<EvaluationFormState> {
  await requireBoardUser();

  try {
    const { data, scores } = evaluationFromFormData(formData);

    const { total } = await saveInterviewEvaluation({
      interviewId: String(formData.get('interviewId') ?? ''),
      data,
      scores,
      recommendation: String(formData.get('recommendation') ?? ''),
      finalNotes: String(formData.get('finalNotes') ?? '') || undefined,
    });

    revalidateQueueViews();
    return {
      error: null,
      savedAt: `Saved — ${total} points at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not save the evaluation.',
      savedAt: null,
    };
  }
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
