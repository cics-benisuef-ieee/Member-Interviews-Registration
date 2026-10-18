import { createClient } from '@/lib/supabase/server';
import type { MemberRow } from '@/types/database';
import type { Member } from './member.types';

export function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
  };
}

const MEMBER_COLUMNS = 'id, full_name, phone, email, notes';

export async function findMember(id: string): Promise<Member | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('members').select(MEMBER_COLUMNS).eq('id', id).single();
  if (!data) return null;
  return toMember(data as MemberRow);
}

export async function searchMembers(query: string, limit = 50): Promise<Member[]> {
  const supabase = await createClient();

  const term = sanitizeSearchTerm(query);

  let builder = supabase
    .from('members')
    .select(MEMBER_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (term) {
    // Both columns need the same trailing wildcard: the previous version only
    // had one on `phone`, so searching "Ah" could never match "Ahmed".
    builder = builder.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data, error } = await builder;
  if (error) throw new Error(`Could not search members: ${error.message}`);

  return (data as MemberRow[]).map(toMember);
}

export async function updateMember(
  id: string,
  changes: { fullName: string; phone?: string; email?: string; notes?: string },
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('members')
    .update({
      full_name: changes.fullName,
      phone: changes.phone ?? null,
      email: changes.email ?? null,
      notes: changes.notes ?? null,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/**
 * Removes characters that are meaningful to the PostgREST filter grammar
 * (`,`, `(`, `)`) or to LIKE patterns (`%`, `_`), and collapses the whitespace
 * they leave behind. A search for "O'Brien" should not be able to change the
 * shape of the query.
 */
function sanitizeSearchTerm(value: string): string {
  return value
    .replace(/[,()%_\\"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
