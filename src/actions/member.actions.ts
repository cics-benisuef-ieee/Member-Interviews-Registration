'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/domain/auth/guards';
import { applyMemberUpdate, parseMemberInput } from '@/domain/members/member.service';
import { registerMember } from '@/domain/interviews/interview.service';

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
