'use server';

import { redirect } from 'next/navigation';
import { registerMember } from '@/domain/interviews/interview.service';
import { z } from 'zod';

export interface RegisterFormState {
  error: string | null;
}

const formSchema = z.object({
  trackId: z.string().uuid(),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(120),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().optional(),
  notes: z.string().trim().max(1000).optional(),
});

/** Public self-registration: adds the member to the chosen track's queue. */
export async function registerMemberAction(
  _prevState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const parsed = formSchema.safeParse({
    trackId: formData.get('trackId'),
    fullName: formData.get('fullName'),
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    notes: formData.get('notes') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form fields.' };
  }

  try {
    const receipt = await registerMember(parsed.data);
    redirect(
      `/register/thanks?n=${receipt.queueNumber}&track=${encodeURIComponent(receipt.trackName)}`,
    );
  } catch (error) {
    // redirect() throws internally — re-throw it untouched.
    if (isRedirectError(error)) throw error;
    return { error: errorMessage(error, 'Registration failed. Please try again.') };
  }
}

function isRedirectError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('NEXT_REDIRECT');
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
