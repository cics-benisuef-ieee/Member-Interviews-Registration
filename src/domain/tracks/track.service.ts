import { randomBytes } from 'crypto';
import { env } from '@/lib/env';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { trackNameSchema } from './track.schema';
import * as trackRepo from './track.repo';
import type { Track, TrackWithLogin } from './track.types';

/** Tracks offered on the public registration form, sorted A→Z. */
export async function listRegistrationTracks(): Promise<Track[]> {
  return trackRepo.listTracks({ activeOnly: true });
}

/** Every track for the admin panel, sorted A→Z. */
export async function listAllTracks(): Promise<Track[]> {
  return trackRepo.listTracks();
}

export async function listTracksWithLogins(): Promise<TrackWithLogin[]> {
  const tracks = await listAllTracks();
  return tracks.map((track) => ({
    ...track,
    loginEmail: `${track.slug}@${env.TRACK_EMAIL_DOMAIN}`,
  }));
}

export async function createTrack(rawName: string): Promise<Track> {
  const name = trackNameSchema.parse(rawName);
  const slug = slugify(name);

  const track = await trackRepo.insertTrack(name, slug);
  await createTrackLogin(track);
  return track;
}

export async function setTrackActive(id: string, isActive: boolean): Promise<void> {
  await trackRepo.updateTrackActive(id, isActive);
}

/** Generates a fresh password for the track's shared login. */
export async function resetTrackCredentials(trackId: string): Promise<{ email: string; password: string }> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('track_id', trackId)
    .eq('role', 'COMMITTEE')
    .single();

  if (!profile) throw new Error('This track has no login account yet.');

  const password = generatePassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(profile.id, { password });
  if (error) throw new Error(`Could not reset the password: ${error.message}`);

  return { email: `${(await getTrackSlug(trackId))}@${env.TRACK_EMAIL_DOMAIN}`, password };
}

async function createTrackLogin(track: Track): Promise<void> {
  const admin = createAdminClient();
  const email = `${track.slug}@${env.TRACK_EMAIL_DOMAIN}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: env.TRACK_DEFAULT_PASSWORD,
    email_confirm: true,
  });

  if (error) throw new Error(`Could not create the track login: ${error.message}`);

  const { error: profileError } = await admin.from('profiles').insert({
    id: data.user.id,
    display_name: track.name,
    role: 'COMMITTEE',
    track_id: track.id,
  });

  if (profileError) throw new Error(`Could not create the track profile: ${profileError.message}`);
}

async function getTrackSlug(trackId: string): Promise<string> {
  const track = await trackRepo.findTrack(trackId);
  if (!track) throw new Error('Track not found.');
  return track.slug;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generatePassword(): string {
  return `Trk-${randomBytes(6).toString('hex')}`;
}
