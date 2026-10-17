'use server';

import { redirect } from 'next/navigation';
import { homePathFor } from '@/domain/auth/auth.types';
import { getSessionUser } from '@/domain/auth/session';
import { createClient } from '@/lib/supabase/server';

export interface LoginFormState {
  error: string | null;
}

/** Signs a track board or admin in, then sends them to their own home. */
export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '').trim();

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'Wrong email or password.' };
  }

  const user = await getSessionUser();
  if (!user) {
    return { error: 'Your account could not be loaded. Ask an admin to check your profile.' };
  }

  const safeNext = next.startsWith('/board') || next.startsWith('/admin');
  redirect(safeNext ? next : homePathFor(user));
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
