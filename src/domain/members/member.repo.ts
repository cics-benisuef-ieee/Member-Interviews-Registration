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

export async function searchMembers(
  query: string,
  options: { limit?: number; memberIds?: string[] } = {},
): Promise<Member[]> {
  // A caller that asks for "today's members" and gets an empty list must see an
  // empty list — not every member, which `.in('id', [])` would otherwise mean
  // if it were skipped.
  if (options.memberIds && options.memberIds.length === 0) return [];

  const supabase = await createClient();

  const term = sanitizeSearchTerm(query);

  let builder = supabase
    .from('members')
    .select(MEMBER_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 50);

  if (options.memberIds) {
    builder = builder.in('id', options.memberIds);
  }

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

/**
 * Updates a person's details through `update_member_details` (0010), which
 * edits the live `members` row *and* refreshes the snapshot on every interview
 * they are in. That is what makes a detail corrected in history visible
 * everywhere — and what keeps a purged member's record editable.
 */
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
  const { error } = await supabase.rpc('update_member_details', {
    p_member_id: id,
    p_full_name: changes.fullName,
    p_phone: changes.phone ?? null,
    p_email: changes.email ?? null,
    p_position: changes.position ?? null,
    p_notes: changes.notes ?? null,
  });

  if (error) throw new Error(error.message);
}

/**
 * Removes members and their *today* queue entries through `delete_members`
 * (0010). Earlier days are history, kept on the interview snapshot — which is
 * why a member can never be deleted "by accident" out of the records any more.
 */
export async function deleteMembers(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('delete_members', { p_member_ids: ids });

  if (error) throw new Error(`Could not delete those members: ${error.message}`);
  return (data as number) ?? 0;
}

/** Removes one member; a thin wrapper so callers need not build an array. */
export async function deleteMember(id: string): Promise<number> {
  return deleteMembers([id]);
}

/**
 * Clears members whose day is over (`purge_past_members`, 0010). Their
 * interviews stay, snapshot and all, so history is untouched — this only
 * empties the live members table.
 */
export async function purgePastMembers(before?: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('purge_past_members', {
    p_before: before ?? null,
  });

  if (error) throw new Error(`Could not purge past members: ${error.message}`);
  return (data as number) ?? 0;
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
