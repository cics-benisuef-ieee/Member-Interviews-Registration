-- ============================================================================
-- 0005 · Queue functions
-- Atomic operations for registration, starting, and finishing interviews —
-- including the same-day transfer to another track. Running these in the
-- database means two people registering at the same second can never receive
-- the same queue number, and transfers can never lose a member.
-- ============================================================================

-- Hidden schema for internal helpers (PostgREST only exposes `public`).
create schema if not exists private;

-- Internal helper: next queue number for a track on a given day.
create or replace function private.next_queue_number(p_track_id uuid, p_day date)
returns integer
language sql stable security definer set search_path = public
as $$
  select coalesce(max(queue_number), 0) + 1
  from public.interviews
  where track_id = p_track_id and queue_day = p_day;
$$;

-- Internal helper: authorization check for board/admin operations.
create or replace function private.can_manage_interview(p_interview_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.interviews i on i.id = p_interview_id
    where p.id = auth.uid()
      and (p.role = 'ADMIN' or (p.role = 'COMMITTEE' and p.track_id = i.track_id))
  );
$$;

-- ── Registration (public — callable by anonymous visitors) ─────────────────

create or replace function public.register_member(
  p_track_id uuid,
  p_full_name text,
  p_phone text default null,
  p_email text default null,
  p_notes text default null
)
returns table (interview_id uuid, queue_number integer, member_id uuid)
language plpgsql security definer set search_path = public
as $$
declare
  v_day       date := public.queue_day();
  v_member    uuid;
  v_interview uuid;
  v_number    integer;
begin
  if p_full_name is null or length(trim(p_full_name)) < 2 then
    raise exception 'A full name of at least 2 characters is required.';
  end if;

  if not exists (select 1 from public.tracks where id = p_track_id and is_active) then
    raise exception 'That track is not accepting registrations.';
  end if;

  insert into public.members (full_name, phone, email, notes, created_by)
  values (trim(p_full_name), nullif(trim(coalesce(p_phone, '')), ''), nullif(trim(coalesce(p_email, '')), ''), nullif(trim(coalesce(p_notes, '')), ''), null)
  returning id into v_member;

  v_number := private.next_queue_number(p_track_id, v_day);

  insert into public.interviews (member_id, track_id, queue_day, queue_number, status)
  values (v_member, p_track_id, v_day, v_number, 'WAITING')
  returning id into v_interview;

  insert into public.audit_log (interview_id, action, to_status, detail)
  values (v_interview, 'REGISTERED', 'WAITING', jsonb_build_object('track_id', p_track_id, 'queue_day', v_day));

  return query select v_interview, v_number, v_member;
end;
$$;

-- ── Start an interview (board or admin) ────────────────────────────────────

create or replace function public.start_interview(p_interview_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_before public.interviews%rowtype;
begin
  if not private.can_manage_interview(p_interview_id) then
    raise exception 'You are not allowed to manage this interview.';
  end if;

  select * into v_before from public.interviews where id = p_interview_id for update;

  if v_before.id is null then
    raise exception 'Interview not found.';
  end if;

  if v_before.status <> 'WAITING' then
    raise exception 'Only a waiting member can be started (current: %).', v_before.status;
  end if;

  update public.interviews
  set status = 'IN_INTERVIEW', started_at = now()
  where id = p_interview_id;

  insert into public.audit_log (interview_id, actor_id, action, from_status, to_status)
  values (p_interview_id, auth.uid(), 'STARTED', v_before.status, 'IN_INTERVIEW');
end;
$$;

-- ── Finish an interview (pass / reject / transfer to another track) ────────
-- p_outcome: 'PASSED' | 'REJECTED' | 'TRANSFER'
-- For 'TRANSFER', p_target_track_id must be a different, active track; the
-- member is appended to that track's queue for the same queue day.

create or replace function public.complete_interview(
  p_interview_id uuid,
  p_outcome text,
  p_target_track_id uuid default null,
  p_notes text default null
)
returns table (transferred_interview_id uuid, transferred_queue_number integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_before   public.interviews%rowtype;
  v_new_id   uuid;
  v_new_num  integer;
begin
  if p_outcome not in ('PASSED', 'REJECTED', 'TRANSFER') then
    raise exception 'Unknown outcome: %', p_outcome;
  end if;

  if not private.can_manage_interview(p_interview_id) then
    raise exception 'You are not allowed to manage this interview.';
  end if;

  select * into v_before from public.interviews where id = p_interview_id for update;

  if v_before.id is null then
    raise exception 'Interview not found.';
  end if;

  if v_before.status <> 'IN_INTERVIEW' then
    raise exception 'Only an interview in progress can be finished (current: %).', v_before.status;
  end if;

  if p_outcome = 'TRANSFER' then
    if p_target_track_id is null or p_target_track_id = v_before.track_id then
      raise exception 'Choose a different track to transfer to.';
    end if;

    if not exists (select 1 from public.tracks where id = p_target_track_id and is_active) then
      raise exception 'That track is not available.';
    end if;

    if exists (
      select 1 from public.interviews
      where member_id = v_before.member_id
        and track_id = p_target_track_id
        and queue_day = v_before.queue_day
    ) then
      raise exception 'This member is already queued for that track today.';
    end if;

    v_new_num := private.next_queue_number(p_target_track_id, v_before.queue_day);

    insert into public.interviews (member_id, track_id, queue_day, queue_number, status, transferred_from_id)
    values (v_before.member_id, p_target_track_id, v_before.queue_day, v_new_num, 'WAITING', v_before.id)
    returning id into v_new_id;

    update public.interviews
    set status = 'NEEDS_ANOTHER_TRACK',
        finished_at = now(),
        notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes)
    where id = p_interview_id;

    insert into public.audit_log (interview_id, actor_id, action, from_status, to_status, detail)
    values (p_interview_id, auth.uid(), 'TRANSFERRED', v_before.status, 'NEEDS_ANOTHER_TRACK',
            jsonb_build_object('to_track_id', p_target_track_id, 'new_interview_id', v_new_id));

    insert into public.audit_log (interview_id, action, to_status, detail)
    values (v_new_id, 'TRANSFER_RECEIVED', 'WAITING',
            jsonb_build_object('from_interview_id', v_before.id, 'from_track_id', v_before.track_id));

    return query select v_new_id, v_new_num;
  else
    update public.interviews
    set status = p_outcome,
        finished_at = now(),
        notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes)
    where id = p_interview_id;

    insert into public.audit_log (interview_id, actor_id, action, from_status, to_status)
    values (p_interview_id, auth.uid(), 'COMPLETED', v_before.status, p_outcome);

    return query select null::uuid, null::integer;
  end if;
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────
revoke execute on function public.register_member(uuid, text, text, text, text) from public;
grant execute on function public.register_member(uuid, text, text, text, text) to anon, authenticated, service_role;

revoke execute on function public.start_interview(uuid) from public;
grant execute on function public.start_interview(uuid) to authenticated, service_role;

revoke execute on function public.complete_interview(uuid, text, uuid, text) from public;
grant execute on function public.complete_interview(uuid, text, uuid, text) to authenticated, service_role;
