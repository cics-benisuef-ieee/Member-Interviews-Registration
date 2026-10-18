'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/domain/auth/guards';
import {
  createTrack,
  resetTrackCredentials,
  setTrackActive,
  setTrackTvVisible,
} from '@/domain/tracks/track.service';

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
  revalidatePath('/tv');
}

/**
 * Shows or hides the track on the public /tv hall display. Visibility is not
 * the same as access: a hidden track's board, login, and registration all
 * keep working.
 */
export async function setTrackTvVisibleAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const trackId = String(formData.get('trackId') ?? '');
  const tvVisible = formData.get('tvVisible') === 'true';

  await setTrackTvVisible(trackId, tvVisible);
  revalidatePath('/admin/tracks');
  revalidatePath('/tv');
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
