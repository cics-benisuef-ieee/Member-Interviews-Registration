'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/domain/auth/guards';
import { applyMemberUpdate, parseMemberInput } from '@/domain/members/member.service';
import { registerMember } from '@/domain/interviews/interview.service';
import { deleteMember, deleteMembers } from '@/domain/members/member.repo';

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

export async function updateMemberAction(
  _prevState: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await requireAdmin();

  const memberId = String(formData.get('memberId') ?? '');

  try {
    const member = await applyMemberUpdate(memberId, formData);
    revalidatePath('/admin/members');
    return { error: null, successMessage: `${member.fullName} updated.` };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not update the member.',
      successMessage: null,
    };
  }
}

/**
 * Deletion also removes every interview the member was queued for, because
 * `interviews.member_id` references members with ON DELETE CASCADE. That is
 * what makes it the right tool for a mistaken or duplicate registration: one
 * action undoes the whole entry.
 */

const singleIdSchema = z.string().uuid();
const idListSchema = z.array(z.string().uuid()).min(1).max(1000);

/** Removes one member. */
export async function deleteMemberAction(memberId: string): Promise<void> {
  await requireAdmin();
  await deleteMember(singleIdSchema.parse(memberId));

  // These screens all quote queue totals.
  revalidatePath('/admin/members');
  revalidatePath('/admin');
  revalidatePath('/board');
}

/** Removes every listed member at once — for clearing demo or test data. */
export async function deleteMembersAction(memberIds: string[]): Promise<void> {
  await requireAdmin();
  await deleteMembers(idListSchema.parse(memberIds));

  revalidatePath('/admin/members');
  revalidatePath('/admin');
  revalidatePath('/board');
}
