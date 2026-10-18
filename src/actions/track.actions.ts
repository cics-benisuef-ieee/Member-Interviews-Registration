'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/domain/auth/guards';
import {
  createTrack,
  resetTrackCredentials,
  setTrackActive,
  setTrackTvVisible,
} from '@/domain/tracks/track.service';
import { actionFailed, type ActionState } from '@/lib/action-state';

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

export async function setTrackActiveAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const trackId = String(formData.get('trackId') ?? '');
  const isActive = formData.get('isActive') === 'true';

  try {
    await setTrackActive(trackId, isActive);
  } catch (error) {
    return actionFailed(error, 'Could not change that track.');
  }

  revalidatePath('/admin/tracks');
  revalidatePath('/tv');
  return { error: null };
}

/**
 * Shows or hides the track on the public /tv hall display. Visibility is not
 * the same as access: a hidden track's board, login, and registration all
 * keep working.
 */
export async function setTrackTvVisibleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const trackId = String(formData.get('trackId') ?? '');
  const tvVisible = formData.get('tvVisible') === 'true';

  try {
    await setTrackTvVisible(trackId, tvVisible);
  } catch (error) {
    return actionFailed(error, 'Could not change what the hall display shows.');
  }

  revalidatePath('/admin/tracks');
  revalidatePath('/tv');
  return { error: null };
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
