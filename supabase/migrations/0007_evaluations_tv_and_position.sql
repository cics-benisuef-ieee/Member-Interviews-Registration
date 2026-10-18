-- ============================================================================
-- 0007 · Evaluations, TV visibility, member position
--
-- Committees score the member they are interviewing on a fixed five-section
-- form (100 points in total); the recommendation is a separate judgement and
-- never counted into the score. An interview cannot be finished until its
-- evaluation is complete — the gate lives here, next to the data, so it
-- cannot be bypassed from the app.
--
-- Tracks gain a flag for which committees appear on the public hall display
-- (/tv), and members gain an optional position (e.g. "Year 3 · CS").
-- ============================================================================

alter table public.tracks
  add column tv_visible boolean not null default false;

alter table public.members
  add column position text;

alter table public.interviews
  add column evaluation jsonb,
  add column overall_total integer,
  add column recommendation text
    check (recommendation in ('STRONG_YES', 'YES', 'NO', 'STRONG_NO')),
  add column final_notes text,
  add column evaluation_updated_at timestamptz;

-- A total only ever comes from the five-section form, whose maximum is 100.
alter table public.interviews
  add constraint overall_total_within_0_100
  check (overall_total is null or overall_total between 0 and 100);

-- ── Save an evaluation (board or admin) ────────────────────────────────────
-- p_evaluation maps each of the five section keys to its score:
--   {"technical": 25, "english": 18, "teamwork": 15,
--    "commitment": 16, "experience": 8}
-- Per-section maximums are enforced by the app (one shared form definition);
-- the database enforces that every section is present and the total is sane.
-- The recommendation is stored in its own column, not in the JSON.

create or replace function public.save_interview_evaluation(
  p_interview_id uuid,
  p_evaluation jsonb,
  p_recommendation text,
  p_final_notes text default null
)
returns integer -- the overall total that was stored
language plpgsql security definer set search_path = public
as $$
declare
  v_before public.interviews%rowtype;
  v_total  integer;
  v_key    text;
begin
  -- NULL-safe: `not in` alone would let a null recommendation slip through.
  if p_recommendation is null or p_recommendation not in ('STRONG_YES', 'YES', 'NO', 'STRONG_NO') then
    raise exception 'Unknown recommendation: %', p_recommendation;
  end if;

  if coalesce(jsonb_typeof(p_evaluation), 'null') <> 'object' then
    raise exception 'The evaluation must be an object of section scores.';
  end if;

  for v_key in
    select unnest(array['technical', 'english', 'teamwork', 'commitment', 'experience'])
  loop
    -- coalesce: a missing key gives jsonb_typeof NULL, which must also fail.
    if coalesce(jsonb_typeof(p_evaluation -> v_key), 'null') <> 'number' then
      raise exception 'Every evaluation section needs a numeric score (missing: %).', v_key;
    end if;
  end loop;

  -- Sum only the five known sections, so stray keys cannot inflate the total.
  select coalesce(sum((p_evaluation -> v_key #>> '{}')::numeric)::integer, 0)
  into v_total
  from unnest(array['technical', 'english', 'teamwork', 'commitment', 'experience']) as v_key;

  if v_total < 0 or v_total > 100 then
    raise exception 'The evaluation total must be between 0 and 100 (got %).', v_total;
  end if;

  if not private.can_manage_interview(p_interview_id) then
    raise exception 'You are not allowed to manage this interview.';
  end if;

  select * into v_before from public.interviews where id = p_interview_id for update;

  if v_before.id is null then
    raise exception 'Interview not found.';
  end if;

  if v_before.status not in ('WAITING', 'IN_INTERVIEW') then
    raise exception 'The evaluation can only be edited while the interview is open (current: %).', v_before.status;
  end if;

  update public.interviews
  set evaluation = p_evaluation,
      overall_total = v_total,
      recommendation = p_recommendation,
      final_notes = nullif(trim(coalesce(p_final_notes, '')), ''),
      evaluation_updated_at = now()
  where id = p_interview_id;

  insert into public.audit_log (interview_id, actor_id, action, detail)
  values (p_interview_id, auth.uid(), 'EVALUATION_SAVED',
          jsonb_build_object('overall_total', v_total, 'recommendation', p_recommendation));

  return v_total;
end;
$$;

-- ── Unstart an interview (board or admin) ──────────────────────────────────
-- Puts a member back in the waiting queue. Everything else is preserved:
-- the queue number (their place in line), the evaluation saved so far, and
-- the notes — only the clock is cleared.

create or replace function public.unstart_interview(p_interview_id uuid)
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

  if v_before.status <> 'IN_INTERVIEW' then
    raise exception 'Only an interview in progress can be unstarted (current: %).', v_before.status;
  end if;

  update public.interviews
  set status = 'WAITING',
      started_at = null,
      finished_at = null
  where id = p_interview_id;

  insert into public.audit_log (interview_id, actor_id, action, from_status, to_status)
  values (p_interview_id, auth.uid(), 'UNSTARTED', v_before.status, 'WAITING');
end;
$$;

-- ── Finish an interview — redefined with the evaluation gate ───────────────
-- Same behaviour as 0005, plus one rule: an interview can only be finished
-- once its evaluation is complete (every section scored and a recommendation
-- made). Kept here rather than in the app so no client can skip the form.

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

  if v_before.overall_total is null or v_before.recommendation is null then
    raise exception 'Complete the evaluation — every section plus a recommendation — before finishing this interview.';
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

-- ── TV display: summaries of every track an admin marked visible ───────────
-- Read-only and callable by anyone (the /tv page has no login). Returns only
-- what a hall screen needs: who is being served, who is next (names and queue
-- numbers, capped), and how many have finished.

create or replace function public.get_tv_boards()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_day    date := public.queue_day();
  v_boards jsonb;
begin
  select coalesce(jsonb_agg(card order by track_name), '[]'::jsonb)
  into v_boards
  from (
    select
      t.name as track_name,
      jsonb_build_object(
        'trackId', t.id,
        'trackName', t.name,
        'nowServingName', max(m.full_name) filter (where i.status = 'IN_INTERVIEW'),
        'nowServingNumber', max(i.queue_number) filter (where i.status = 'IN_INTERVIEW'),
        'waiting', coalesce((
          select jsonb_agg(
            jsonb_build_object('fullName', wm.full_name, 'queueNumber', wq.queue_number)
            order by wq.queue_number
          )
          from (
            select wq2.member_id, wq2.queue_number
            from public.interviews wq2
            where wq2.track_id = t.id and wq2.queue_day = v_day and wq2.status = 'WAITING'
            order by wq2.queue_number
            limit 8
          ) wq
          join public.members wm on wm.id = wq.member_id
        ), '[]'::jsonb),
        'finishedCount', count(*) filter (
          where i.status in ('PASSED', 'REJECTED', 'NEEDS_ANOTHER_TRACK')
        )
      ) as card
    from public.tracks t
    left join public.interviews i on i.track_id = t.id and i.queue_day = v_day
    left join public.members m on m.id = i.member_id
    where t.tv_visible
    group by t.id, t.name
  ) rows;

  return jsonb_build_object('day', v_day, 'boards', v_boards);
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────
revoke execute on function public.save_interview_evaluation(uuid, jsonb, text, text) from public;
grant execute on function public.save_interview_evaluation(uuid, jsonb, text, text) to authenticated, service_role;

revoke execute on function public.unstart_interview(uuid) from public;
grant execute on function public.unstart_interview(uuid) to authenticated, service_role;

-- complete_interview keeps the grant from 0005 (same signature).

-- The TV page is public: anonymous visitors read only what this function
-- returns, which is limited to tracks an admin chose to show.
revoke execute on function public.get_tv_boards() from public;
grant execute on function public.get_tv_boards() to anon, authenticated, service_role;
