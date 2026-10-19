-- ============================================================================
-- 0010 · Member data lives with the interview
--
-- Member details used to live only in `members`, and every interview read them
-- back through a join. That made the members table permanent — nothing could be
-- cleared without taking the interview history with it, because
-- `interviews.member_id` cascaded on delete. Admins wanted the day's members to
-- stop lingering in the members list once the day was over, with all of their
-- data still in history and still editable there.
--
-- This migration moves ownership of the member's details onto the interview:
--
--   · every interview carries a *snapshot* of the member (name, phone, email,
--     position, notes) plus a durable `member_ref` that points at the person no
--     matter whether the `members` row still exists;
--   · `interviews.member_id` becomes a soft link (`on delete set null`), so
--     deleting or purging a member can never destroy their history;
--   · a trigger stamps the snapshot from the member row on insert, so the queue
--     functions, the seed/demo scripts and the integration test need no change;
--   · `update_member_details` edits the shared `members` row *and* re-syncs the
--     snapshot on all of that person's interviews (the single source of truth);
--   · `delete_members` removes today's queue entries and the member row, while
--     `purge_past_members` clears members whose last interview is before a day.
--
-- `members` stays the live registration table; history is self-contained.
--
-- Idempotent like 0007–0009: re-running it in the SQL editor is safe.
-- ============================================================================

-- ── Snapshot columns + durable identity ─────────────────────────────────────

alter table public.interviews
  add column if not exists member_name     text,
  add column if not exists member_phone    text,
  add column if not exists member_email    text,
  add column if not exists member_position text,
  add column if not exists member_notes    text,
  add column if not exists member_ref      uuid;

-- Backfill existing rows from the member they are still linked to.
update public.interviews
set member_ref = member_id
where member_ref is null;

update public.interviews i
set member_name     = m.full_name,
    member_phone    = m.phone,
    member_email    = m.email,
    member_position = m.position,
    member_notes    = m.notes
from public.members m
where i.member_ref = m.id
  and i.member_name is null;

alter table public.interviews
  alter column member_ref set not null;

-- A lookup for "every interview by this person" after the member row is gone.
create index if not exists interviews_member_ref
  on public.interviews (member_ref);

-- The link becomes soft: deleting a member must never take the interviews with
-- it. `member_id` is kept for the live join (the board, the TV display) and for
-- the members list; `member_ref` carries the identity afterwards.
alter table public.interviews
  drop constraint if exists interviews_member_id_fkey;

alter table public.interviews
  alter column member_id drop not null;

alter table public.interviews
  add constraint interviews_member_id_fkey
  foreign key (member_id) references public.members (id) on delete set null;

-- ── Stamp the snapshot whenever an interview is created or re-pointed ───────
-- Every writer — register_member, complete_interview's transfer, the demo seed
-- and the integration test — inserts straight into `interviews`. Doing the copy
-- here means none of them has to remember the five snapshot columns.

create or replace function private.stamp_interview_member()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_member public.members%rowtype;
begin
  if new.member_id is not null
     and (new.member_ref is null or new.member_ref <> new.member_id) then
    new.member_ref := new.member_id;
  end if;

  if new.member_id is not null then
    select * into v_member from public.members where id = new.member_id;

    if v_member.id is not null then
      -- An explicit value always wins; the member row only fills the gaps.
      new.member_name     := coalesce(new.member_name, v_member.full_name);
      new.member_phone    := coalesce(new.member_phone, v_member.phone);
      new.member_email    := coalesce(new.member_email, v_member.email);
      new.member_position := coalesce(new.member_position, v_member.position);
      new.member_notes    := coalesce(new.member_notes, v_member.notes);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists interviews_stamp_member on public.interviews;
create trigger interviews_stamp_member
  before insert or update of member_id on public.interviews
  for each row execute function private.stamp_interview_member();

-- ── Edit a member's details (admin, or the service role) ────────────────────
-- The members page and the history review both call this, so there is exactly
-- one way a person's details change. It updates the live row when it exists and
-- always refreshes the snapshot every interview holds — which is what keeps a
-- purged person's history editable.

create or replace function public.update_member_details(
  p_member_id uuid,
  p_full_name text,
  p_phone     text default null,
  p_email     text default null,
  p_position  text default null,
  p_notes     text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_name  text := trim(coalesce(p_full_name, ''));
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_email text := nullif(trim(coalesce(p_email, '')), '');
  v_pos   text := nullif(trim(coalesce(p_position, '')), '');
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  -- `auth.uid() is null` is the service role (the seed/scripts) — the function
  -- is never granted to anon, and a signed-in caller always has a uid.
  if not (public.is_admin() or auth.uid() is null) then
    raise exception 'Only an admin can edit member details.' using errcode = '42501';
  end if;

  if p_member_id is null then
    raise exception 'A member is required.';
  end if;

  if length(v_name) < 2 then
    raise exception 'A full name of at least 2 characters is required.';
  end if;

  update public.members
  set full_name = v_name,
      phone     = v_phone,
      email     = v_email,
      position  = v_pos,
      notes     = v_notes
  where id = p_member_id;

  update public.interviews
  set member_name     = v_name,
      member_phone    = v_phone,
      member_email    = v_email,
      member_position = v_pos,
      member_notes    = v_notes
  where member_ref = p_member_id;
end;
$$;

-- ── Delete members (admin, or the service role) ─────────────────────────────
-- Removes the members rows and their *today* queue entries — the "undo a
-- mistaken registration" path. Earlier days are history and are kept, now safe
-- from the delete because the snapshot lives on the interview.

create or replace function public.delete_members(p_member_ids uuid[])
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_day   date := public.queue_day();
  v_count integer;
begin
  if not (public.is_admin() or auth.uid() is null) then
    raise exception 'Only an admin can delete members.' using errcode = '42501';
  end if;

  if p_member_ids is null or array_length(p_member_ids, 1) is null then
    return 0;
  end if;

  delete from public.interviews
  where member_ref = any(p_member_ids)
    and queue_day = v_day;

  delete from public.members where id = any(p_member_ids);
  get diagnostics v_count = row_count;

  return v_count;
end;
$$;

-- ── Purge members whose day is over (admin, or the service role) ────────────
-- Removes every member with no interview on or after `p_before` (today by
-- default). The interviews they were in stay — with name, contact details and
-- `member_ref` — so history is untouched.

create or replace function public.purge_past_members(p_before date default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_before date := coalesce(p_before, public.queue_day());
  v_count  integer;
begin
  if not (public.is_admin() or auth.uid() is null) then
    raise exception 'Only an admin can purge members.' using errcode = '42501';
  end if;

  delete from public.members m
  where not exists (
    select 1
    from public.interviews i
    where i.member_ref = m.id
      and i.queue_day >= v_before
  );
  get diagnostics v_count = row_count;

  return v_count;
end;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke execute on function public.update_member_details(uuid, text, text, text, text, text)
  from public, anon;
grant execute on function public.update_member_details(uuid, text, text, text, text, text)
  to authenticated, service_role;

revoke execute on function public.delete_members(uuid[]) from public, anon;
grant execute on function public.delete_members(uuid[]) to authenticated, service_role;

revoke execute on function public.purge_past_members(date) from public, anon;
grant execute on function public.purge_past_members(date) to authenticated, service_role;
