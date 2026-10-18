-- ============================================================================
-- 0007 · Evaluations, TV visibility, member position
--
-- Committees score the member they are interviewing on a fixed form:
-- Attitude (5 criteria × 10 = 50), Technical Skills (4 × 10 = 40) and
-- IEEE Knowledge (2 × 5 = 10) — 100 points in total. Every criterion needs a
-- score *and* a note; the recommendation (Accepted / Needs training /
-- Rejected) is a separate judgement and never counted into the score. An
-- interview cannot be finished until its evaluation is complete — the gate
-- lives here, next to the data, so it cannot be bypassed from the app.
--
-- Tracks gain a flag for which committees appear on the public hall display
-- (/tv), and members gain an optional position (e.g. "Year 3 · CS").
--
-- This file is idempotent: re-running it in the SQL editor replaces the
-- evaluation functions and the recommendation constraint, so an earlier copy
-- can be upgraded in place without dropping any columns.
-- ============================================================================

alter table public.tracks
  add column if not exists tv_visible boolean not null default false;

alter table public.members
  add column if not exists position text;

alter table public.interviews
  add column if not exists evaluation jsonb,
  add column if not exists overall_total integer,
  add column if not exists recommendation text,
  add column if not exists final_notes text,
  add column if not exists evaluation_updated_at timestamptz;

alter table public.interviews
  drop constraint if exists overall_total_within_0_100;

alter table public.interviews
  add constraint overall_total_within_0_100
  check (overall_total is null or overall_total between 0 and 100);

-- The recommendation carries the final judgement. Older copies of this file
-- used STRONG_YES / YES / NO / STRONG_NO; those rows are mapped across below.
alter table public.interviews
  drop constraint if exists interviews_recommendation_check;

-- Safety sweep: an earlier copy created the check inline on the column, which
-- PostgreSQL auto-names. Drop any check that mentions the column by name.
do $$
declare
  v_constraint text;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.interviews'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%recommendation%'
  loop
    execute format('alter table public.interviews drop constraint %I', v_constraint);
  end loop;
end;
$$;

update public.interviews
set recommendation = case recommendation
  when 'STRONG_YES' then 'ACCEPTED'
  when 'YES'        then 'ACCEPTED'
  when 'STRONG_NO'  then 'REJECTED'
  when 'NO'         then 'REJECTED'
end
where recommendation in ('STRONG_YES', 'YES', 'NO', 'STRONG_NO');

alter table public.interviews
  add constraint interviews_recommendation_check
  check (recommendation in ('ACCEPTED', 'NEEDS_TRAINING', 'REJECTED'));

-- ── Save an evaluation (board or admin) ────────────────────────────────────
-- p_evaluation shape:
--   {
--     "data":   { "interviewerTechnical": "...", "interviewerAttitude": "..." },
--     "scores": {
--       "motivation":         { "score": 8, "notes": "…" },
--       "teamwork":           { "score": 9, "notes": "…" },
--       "commitment":         { "score": 7, "notes": "…" },
--       "communication":      { "score": 8, "notes": "…" },
--       "flexibility":        { "score": 7, "notes": "…" },
--       "technicalKnowledge": { "score": 8, "notes": "…" },
--       "analyticalThinking": { "score": 7, "notes": "…" },
--       "projectsExperience": { "score": 6, "notes": "…" },
--       "practicalApplication": { "score": 7, "notes": "…" },
--       "ieeeGoals":          { "score": 4, "notes": "…" },
--       "studentBranch":      { "score": 4, "notes": "…" }
--     }
--   }
-- Every criterion is validated here: type, range (per criterion), and a
-- non-empty note. The total is summed from the known criteria only, so stray
-- keys cannot inflate it. The recommendation is stored in its own column.

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
  v_data   jsonb := coalesce(p_evaluation -> 'data', 'null'::jsonb);
  v_scores jsonb := coalesce(p_evaluation -> 'scores', 'null'::jsonb);
  v_key    text;
  v_max    integer;
  v_total  integer;
begin
  -- NULL-safe: `not in` alone would let a null recommendation slip through.
  if p_recommendation is null
     or p_recommendation not in ('ACCEPTED', 'NEEDS_TRAINING', 'REJECTED') then
    raise exception 'Unknown recommendation: %', p_recommendation;
  end if;

  if coalesce(jsonb_typeof(p_evaluation), 'null') <> 'object' then
    raise exception 'The evaluation must be an object.';
  end if;

  -- Data section: both interviewer fields are required.
  if jsonb_typeof(v_data) <> 'object' then
    raise exception 'The evaluation is missing its data section.';
  end if;

  if coalesce(trim(v_data ->> 'interviewerTechnical'), '') = ''
     or coalesce(trim(v_data ->> 'interviewerAttitude'), '') = '' then
    raise exception 'Both interviewer fields are required.';
  end if;

  if jsonb_typeof(v_scores) <> 'object' then
    raise exception 'The evaluation is missing its scores.';
  end if;

  -- Every criterion of the form, with its own maximum.
  for v_key, v_max in
    select criteria.criterion_key, criteria.criterion_max
    from (values
      ('motivation', 10),
      ('teamwork', 10),
      ('commitment', 10),
      ('communication', 10),
      ('flexibility', 10),
      ('technicalKnowledge', 10),
      ('analyticalThinking', 10),
      ('projectsExperience', 10),
      ('practicalApplication', 10),
      ('ieeeGoals', 5),
      ('studentBranch', 5)
    ) as criteria(criterion_key, criterion_max)
  loop
    if coalesce(jsonb_typeof(v_scores -> v_key -> 'score'), 'null') <> 'number' then
      raise exception 'Missing a score for "%".', v_key;
    end if;

    if (v_scores -> v_key ->> 'score')::numeric < 0
       or (v_scores -> v_key ->> 'score')::numeric > v_max then
      raise exception 'The score for "%" must be between 0 and %.', v_key, v_max;
    end if;

    if coalesce(trim(v_scores -> v_key ->> 'notes'), '') = '' then
      raise exception 'A note is required for "%".', v_key;
    end if;
  end loop;

  -- Sum only the known criteria, so stray keys cannot inflate the total.
  select coalesce(sum((v_scores -> v_key ->> 'score')::numeric)::integer, 0)
  into v_total
  from unnest(array[
    'motivation', 'teamwork', 'commitment', 'communication', 'flexibility',
    'technicalKnowledge', 'analyticalThinking', 'projectsExperience',
    'practicalApplication', 'ieeeGoals', 'studentBranch'
  ]) as v_key;

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
-- once its evaluation is complete (every criterion scored with a note, both
-- interviewer fields filled, and a recommendation made). Kept here rather
-- than in the app so no client can skip the form.

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
    raise exception 'Complete the evaluation — every criterion with a note, plus a recommendation — before finishing this interview.';
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
