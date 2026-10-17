import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { TrackRow } from '@/types/database';
import type { Track } from './track.types';

/** Maps a database row to the domain object. */
export function toTrack(row: TrackRow): Track {
  return { id: row.id, name: row.name, slug: row.slug, isActive: row.is_active };
}

export async function listTracks(options: { activeOnly?: boolean } = {}): Promise<Track[]> {
  const supabase = await createClient();

  let query = supabase.from('tracks').select('id, name, slug, is_active').order('name');
  if (options.activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load tracks: ${error.message}`);

  return (data as TrackRow[]).map(toTrack);
}

export async function findTrack(id: string): Promise<Track | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tracks')
    .select('id, name, slug, is_active')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return toTrack(data as TrackRow);
}

export async function insertTrack(name: string, slug: string): Promise<Track> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tracks')
    .insert({ name, slug, is_active: true })
    .select('id, name, slug, is_active')
    .single();

  if (error) throw new Error(error.message);
  return toTrack(data as TrackRow);
}

export async function updateTrackActive(id: string, isActive: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('tracks').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function findTrackLogin(profileId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(profileId);
  if (error || !data.user) return null;
  return data.user.email ?? null;
}
