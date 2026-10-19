'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/domain/auth/guards';
import {
  applyMemberUpdate,
  parseMemberInput,
  purgePastMembers,
  removeMembers,
} from '@/domain/members/member.service';
import { registerMember } from '@/domain/interviews/interview.service';
import { actionFailed, type ActionState } from '@/lib/action-state';

export interface MemberFormState {
  error: string | null;
  successMessage: string | null;
}

/** Admin registers a member on their behalf (same queue rules as the public form). */
export async function registerMemberAdminAction(
  _prevState: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await requireAdmin();

  try {
    const input = parseMemberInput(formData);
    const receipt = await registerMember({
      ...input,
      trackId: String(formData.get('trackId') ?? ''),
    });

    revalidatePath('/admin/members');
    return {
      error: null,
      successMessage: `${input.fullName} added to ${receipt.trackName} — queue number ${receipt.queueNumber}.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not register the member.',
      successMessage: null,
    };
  }
}

/**
 * Edits a person's details. Used from the members list *and* from a history
 * review — both submit the same `memberId`, and the database keeps the shared
 * `members` row and every interview snapshot in step. So both views refresh.
 */
export async function updateMemberAction(
  _prevState: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await requireAdmin();

  const memberId = String(formData.get('memberId') ?? '');

  try {
    const member = await applyMemberUpdate(memberId, formData);
    revalidatePath('/admin/members');
    revalidatePath('/admin/history');
    return { error: null, successMessage: `${member.fullName} updated.` };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not update the member.',
      successMessage: null,
    };
  }
}

const singleIdSchema = z.string().uuid();
const idListSchema = z.array(z.string().uuid()).min(1).max(1000);

/**
 * Delete removes the member and their *today* queue entries — the way to undo a
 * mistaken or duplicate registration. Earlier days are history: they are kept
 * on the interview snapshot and are never touched by this.
 */
export async function deleteMemberAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  try {
    await removeMembers([singleIdSchema.parse(String(formData.get('memberId') ?? ''))]);
  } catch (error) {
    return actionFailed(error, 'Could not delete that member.');
  }

  revalidateQueueTotals();
  return { error: null };
}

/** Removes every listed member at once — for clearing demo or test data. */
export async function deleteMembersAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  try {
    await removeMembers(idListSchema.parse(formData.getAll('memberIds').map(String)));
  } catch (error) {
    return actionFailed(error, 'Could not delete the listed members.');
  }

  revalidateQueueTotals();
  return { error: null };
}

export interface PurgeMembersState {
  error: string | null;
  /** How many members were removed by the last successful purge. */
  purged: number | null;
}

/**
 * Empties the live members table of everyone whose day is over. The interviews
 * they were in stay, snapshot and all, so history is untouched — this is the
 * "members do not outlive their day" cleanup.
 */
export async function purgePastMembersAction(
  _prevState: PurgeMembersState,
  formData: FormData,
): Promise<PurgeMembersState> {
  await requireAdmin();

  try {
    const purged = await purgePastMembers(
      formData.get('before') ? String(formData.get('before')) : undefined,
    );
    revalidateQueueTotals();
    return { error: null, purged };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not purge past members.',
      purged: null,
    };
  }
}

/** Screens that quote queue totals after members are removed. */
function revalidateQueueTotals(): void {
  revalidatePath('/admin/members');
  revalidatePath('/admin/history');
  revalidatePath('/admin');
  revalidatePath('/board');
}
