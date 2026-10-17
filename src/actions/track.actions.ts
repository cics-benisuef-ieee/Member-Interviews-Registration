'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/domain/auth/guards';
import { createTrack, resetTrackCredentials, setTrackActive } from '@/domain/tracks/track.service';

export interface TrackFormState {
  error: string | null;
  /** Shown once after a password reset. */
  newCredential: { email: string; password: string } | null;
}

export async function createTrackAction(
  _prevState: TrackFormState,
  formData: FormData,
): Promise<TrackFormState> {
  await requireAdmin();

  try {
    await createTrack(String(formData.get('name') ?? ''));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not create the track.',
      newCredential: null,
    };
  }

  revalidatePath('/admin/tracks');
  return { error: null, newCredential: null };
}

export async function setTrackActiveAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const trackId = String(formData.get('trackId') ?? '');
  const isActive = formData.get('isActive') === 'true';

  await setTrackActive(trackId, isActive);
  revalidatePath('/admin/tracks');
}

/** Resets the shared login password and shows the new one exactly once. */
export async function resetTrackCredentialsAction(
  _prevState: TrackFormState,
  formData: FormData,
): Promise<TrackFormState> {
  await requireAdmin();

  try {
    const credential = await resetTrackCredentials(String(formData.get('trackId') ?? ''));
    return { error: null, newCredential: credential };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not reset the password.',
      newCredential: null,
    };
  }
}
