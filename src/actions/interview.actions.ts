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
import { actionFailed, type ActionState } from '@/lib/action-state';

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

/**
 * WAITING → IN_INTERVIEW. Only a board that owns the track may call this.
 *
 * The board can be a few seconds out of date (another tab, a second device,
 * a double click), so a refusal from the database — "only a waiting member
 * can be started" — is reported back to the caller rather than thrown:
 * throwing would swap the whole board for the error page mid-interview.
 */
export async function startInterviewAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireBoardUser();

  try {
    await startInterview(String(formData.get('interviewId') ?? ''));
  } catch (error) {
    return actionFailed(error, 'Could not start that interview.');
  }

  revalidateQueueViews();
  return { error: null };
}

/**
 * IN_INTERVIEW → WAITING. Keeps the queue number and any evaluation saved
 * so far — only the clock resets.
 */
export async function unstartInterviewAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireBoardUser();

  try {
    await unstartInterview(String(formData.get('interviewId') ?? ''));
  } catch (error) {
    return actionFailed(error, 'Could not return that member to the queue.');
  }

  revalidateQueueViews();
  return { error: null };
}

export interface EvaluationFormState {
  error: string | null;
  /** Shown after a successful save ("Draft saved — 43 points at 14:35"). */
  savedAt: string | null;
  /** What the last successful save stored: a draft, or a complete evaluation. */
  kind: 'draft' | 'complete' | null;
  /** The points stored by the last successful save. */
  total: number | null;
}

/**
 * Saves whatever the form holds — a complete evaluation, or a draft of one.
 * Drafts are the normal way to work: nothing is lost when the board refreshes
 * or the interview carries over, and finishing the interview stays locked in
 * the database until the evaluation is complete.
 */
export async function saveInterviewEvaluationAction(
  _prevState: EvaluationFormState,
  formData: FormData,
): Promise<EvaluationFormState> {
  await requireBoardUser();

  try {
    const { data, scores } = evaluationFromFormData(formData);

    const { total, complete } = await saveInterviewEvaluation({
      interviewId: String(formData.get('interviewId') ?? ''),
      data,
      scores,
      recommendation: String(formData.get('recommendation') ?? '') || undefined,
      finalNotes: String(formData.get('finalNotes') ?? '') || undefined,
    });

    revalidateQueueViews();
    return {
      error: null,
      savedAt: `${complete ? 'Saved' : 'Draft saved'} — ${total} points at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
      kind: complete ? 'complete' : 'draft',
      total,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not save the evaluation.',
      savedAt: null,
      kind: null,
      total: null,
    };
  }
}

/** IN_INTERVIEW → PASSED. */
export async function passInterviewAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireBoardUser();

  try {
    await finishInterview({
      interviewId: String(formData.get('interviewId') ?? ''),
      outcome: 'PASSED',
    });
  } catch (error) {
    return actionFailed(error, 'Could not pass this interview.');
  }

  revalidateQueueViews();
  return { error: null };
}

/** IN_INTERVIEW → REJECTED. */
export async function rejectInterviewAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireBoardUser();

  try {
    await finishInterview({
      interviewId: String(formData.get('interviewId') ?? ''),
      outcome: 'REJECTED',
    });
  } catch (error) {
    return actionFailed(error, 'Could not reject this interview.');
  }

  revalidateQueueViews();
  return { error: null };
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
    return actionFailed(error, 'Transfer failed. Try again.');
  }

  revalidateQueueViews();
  return { error: null };
}
