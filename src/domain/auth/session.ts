import { createClient } from '@/lib/supabase/server';
import type { SessionUser } from './auth.types';

/** Reads the signed-in account with its profile, or null when signed out. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role, track_id')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    displayName: profile.display_name,
    role: profile.role,
    trackId: profile.track_id,
  };
}
