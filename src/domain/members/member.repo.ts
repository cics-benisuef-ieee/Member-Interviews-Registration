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
    position: row.position,
  };
}

const MEMBER_COLUMNS = 'id, full_name, phone, email, notes, position';

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
    // Every column needs the same trailing wildcard: the original version had
    // one only on `phone`, so searching "Ah" could never match "Ahmed". Email
    // is searched as well so a test batch (anything under `@demo.local`, say)
    // can be found and cleared without hunting through the list.
    builder = builder.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const { data, error } = await builder;
  if (error) throw new Error(`Could not search members: ${error.message}`);

  return (data as MemberRow[]).map(toMember);
}

export async function updateMember(
  id: string,
  changes: {
    fullName: string;
    phone?: string;
    email?: string;
    notes?: string;
    position?: string;
  },
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('members')
    .update({
      full_name: changes.fullName,
      phone: changes.phone ?? null,
      email: changes.email ?? null,
      notes: changes.notes ?? null,
      position: changes.position ?? null,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/**
 * Removes a member and — through ON DELETE CASCADE — every interview they were
 * queued for. Only admins may delete members (see the RLS policy), so this is
 * safe to expose through a server action.
 */
export async function deleteMember(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('members').delete().eq('id', id);

  if (error) throw new Error(`Could not delete the member: ${error.message}`);
}

/** Removes several members in a single statement. */
export async function deleteMembers(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.from('members').delete().in('id', ids);

  if (error) throw new Error(`Could not delete those members: ${error.message}`);
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
