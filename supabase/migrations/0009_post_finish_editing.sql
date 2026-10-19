-- ============================================================================
-- 0009 · Post-finish editing
--
-- An interview used to lock the moment it was finished: `save_interview_evaluation`
-- refused any row whose status was no longer WAITING / IN_INTERVIEW, so a
-- mistyped score or a changed mind could only be "fixed" by editing the
-- database by hand. Committees asked to review a finished interview and
-- correct it, so this migration keeps the whole record editable:
--
--   · the evaluation (scores, notes, interviewers, recommendation, final
--     notes) can be saved on *any* interview, finished or not;
--   · the decision itself (PASSED ⇄ REJECTED) can be changed;
--   · a finished interview can be reopened, which puts the member back in
--     their track's queue and — when the interview was a transfer — cancels
--     the receiving entry if it has not been touched yet.
--
-- Nothing about the finish *gate* changes: a draft still cannot be finished,
-- and changing the decision still requires a complete evaluation. Only the
-- "once finished, forever frozen" rule is gone.
--
-- Idempotent like 0007/0008: re-running it in the SQL editor replaces the
-- functions in place (same signatures, so the existing grants still apply).
-- ============================================================================

-- ── Save an evaluation — allowed on a finished interview too ───────────────
-- Same validation and draft semantics as 0008. The only change is that the
-- old "only while the interview is open" guard is gone; the audit entry now
-- records the status the row had *before* the save, so a revision made after
-- finishing is visible in the trail.

create or replace function public.save_interview_evaluation(
  p_interview_id uuid,
  p_evaluation jsonb,
  p_recommendation text,
  p_final_notes text default null
)
returns integer -- the sum of the scores stored (partial while drafting)
language plpgsql security definer set search_path = public
as $$
declare
  v_before   public.interviews%rowtype;
  v_data     jsonb := coalesce(p_evaluation -> 'data', '{}'::jsonb);
  v_scores   jsonb;
  v_clean    jsonb := '{}'::jsonb;
  v_key      text;
  v_max      integer;
  v_score    numeric;
  v_notes    text;
  v_total    integer := 0;
  v_complete boolean := true;
begin
  -- NULL means "no recommendation chosen yet" (a draft); anything else must
  -- be one of the three verdicts.
  if p_recommendation is not null
     and p_recommendation not in ('ACCEPTED', 'NEEDS_TRAINING', 'REJECTED') then
    raise exception 'Unknown recommendation: %', p_recommendation;
  end if;

  if coalesce(jsonb_typeof(p_evaluation), 'null') <> 'object' then
    raise exception 'The evaluation must be an object.';
  end if;

  if jsonb_typeof(v_data) <> 'object' then
    raise exception 'The evaluation is missing its data section.';
  end if;

  v_scores := coalesce(p_evaluation -> 'scores', '{}'::jsonb);

  if jsonb_typeof(v_scores) <> 'object' then
    raise exception 'The evaluation is missing its scores.';
  end if;

  -- Data section: kept as stored; an empty name simply means "not filled in
  -- yet", which is what makes the row a draft.
  v_clean := v_clean || jsonb_build_object('data', jsonb_build_object(
    'interviewerTechnical', coalesce(trim(v_data ->> 'interviewerTechnical'), ''),
    'interviewerAttitude',  coalesce(trim(v_data ->> 'interviewerAttitude'), '')
  ));

  if coalesce(trim(v_data ->> 'interviewerTechnical'), '') = ''
     or coalesce(trim(v_data ->> 'interviewerAttitude'), '') = '' then
    v_complete := false;
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
    -- A score, when present, must be a whole number inside the criterion's
    -- range; a criterion with no score yet is simply part of the draft.
    if v_scores -> v_key ? 'score' then
      if jsonb_typeof(v_scores -> v_key -> 'score') <> 'number' then
        raise exception 'The score for "%" must be a number between 0 and %.', v_key, v_max;
      end if;

      v_score := (v_scores -> v_key ->> 'score')::numeric;

      if v_score <> trunc(v_score) then
        raise exception 'The score for "%" must be a whole number.', v_key;
      end if;

      if v_score < 0 or v_score > v_max then
        raise exception 'The score for "%" must be between 0 and %.', v_key, v_max;
      end if;

      -- Only the criteria walked here count, so stray keys cannot inflate
      -- the total (and the loop variable never collides with a SQL alias).
      v_total := v_total + v_score::integer;
    end if;

    v_notes := coalesce(trim(v_scores -> v_key ->> 'notes'), '');

    -- Whatever was typed is kept. A score without its note is a draft, not
    -- an error: the note is required to *finish* the interview, not to save.
    v_clean := v_clean || jsonb_build_object('scores',
      coalesce(v_clean -> 'scores', '{}'::jsonb) ||
      jsonb_build_object(v_key, jsonb_strip_nulls(jsonb_build_object(
        'score', case when v_scores -> v_key ? 'score'
                      then (v_scores -> v_key ->> 'score')::numeric end,
        'notes', v_notes
      )))
    );

    if coalesce(jsonb_typeof(v_scores -> v_key -> 'score'), 'null') <> 'number'
       or v_notes = '' then
      v_complete := false;
    end if;
  end loop;

  if p_recommendation is null then
    v_complete := false;
  end if;

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

  -- No status check: a finished interview is still the committee's record to
  -- correct. `v_before.status` below tells the audit trail whether this save
  -- happened after the interview had already been decided.
  update public.interviews
  set evaluation = v_clean,
      -- A draft leaves the total null, which is exactly the signal
      -- `complete_interview` reads before refusing to finish the interview.
      -- Editing a finished interview back into a draft therefore re-locks
      -- that gate, matching the same rule applied before finishing.
      overall_total = case when v_complete then v_total else null end,
      recommendation = p_recommendation,
      final_notes = nullif(trim(coalesce(p_final_notes, '')), ''),
      evaluation_updated_at = now()
  where id = p_interview_id;

  insert into public.audit_log (interview_id, actor_id, action, detail)
  values (p_interview_id, auth.uid(), 'EVALUATION_SAVED',
          jsonb_build_object('partial_total', v_total, 'complete', v_complete,
                             'recommendation', p_recommendation,
                             'status', v_before.status));

  return v_total;
end;
$$;

-- ── Change a decided interview (board or admin) ────────────────────────────
-- PASSED ⇄ REJECTED. Kept separate from `complete_interview` so "finish" and
-- "revise" stay distinct actions in the audit trail. Requires the same
-- complete evaluation that finishing does, so the record never ends up
-- decided-but-incomplete.

create or replace function public.change_interview_outcome(
  p_interview_id uuid,
  p_outcome text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_before public.interviews%rowtype;
begin
  if p_outcome not in ('PASSED', 'REJECTED') then
    raise exception 'Unknown outcome: %', p_outcome;
  end if;

  if not private.can_manage_interview(p_interview_id) then
    raise exception 'You are not allowed to manage this interview.';
  end if;

  select * into v_before from public.interviews where id = p_interview_id for update;

  if v_before.id is null then
    raise exception 'Interview not found.';
  end if;

  if v_before.status not in ('PASSED', 'REJECTED') then
    raise exception 'Only a finished pass or reject can be changed (current: %).', v_before.status;
  end if;

  if v_before.status = p_outcome then
    return; -- already the requested decision; nothing to record
  end if;

  if v_before.overall_total is null or v_before.recommendation is null then
    raise exception 'Complete the evaluation — every criterion with a note, plus a recommendation — before changing the outcome.';
  end if;

  update public.interviews
  set status = p_outcome
  where id = p_interview_id;

  insert into public.audit_log (interview_id, actor_id, action, from_status, to_status)
  values (p_interview_id, auth.uid(), 'OUTCOME_CHANGED', v_before.status, p_outcome);
end;
$$;

-- ── Reopen a finished interview (board or admin) ───────────────────────────
-- Puts the member back in their track's queue as WAITING, clearing the clock
-- but keeping the queue number, notes, and evaluation. For a transfer, the
-- receiving entry is cancelled as well — but only while it is untouched
-- (still WAITING, never started, never handed on). Once the receiving track
-- has begun working on the member, the hand-off is history and the refusal
-- points at the interview that is now in charge.

create or replace function public.reopen_interview(p_interview_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_before        public.interviews%rowtype;
  v_child_id      uuid;
  v_child_track   uuid;
  v_child_status  text;
  v_child_started timestamptz;
  v_child_handed  boolean;
begin
  if not private.can_manage_interview(p_interview_id) then
    raise exception 'You are not allowed to manage this interview.';
  end if;

  select * into v_before from public.interviews where id = p_interview_id for update;

  if v_before.id is null then
    raise exception 'Interview not found.';
  end if;

  if v_before.status not in ('PASSED', 'REJECTED', 'NEEDS_ANOTHER_TRACK') then
    raise exception 'Only a finished interview can be reopened (current: %).', v_before.status;
  end if;

  if v_before.status = 'NEEDS_ANOTHER_TRACK' then
    select child.id, child.track_id, child.status, child.started_at,
           exists (select 1 from public.interviews gc where gc.transferred_from_id = child.id)
    into v_child_id, v_child_track, v_child_status, v_child_started, v_child_handed
    from public.interviews child
    where child.transferred_from_id = p_interview_id
    limit 1;

    if v_child_id is not null
       and (v_child_status <> 'WAITING' or v_child_started is not null or v_child_handed) then
      raise exception 'The receiving track has already started this member — reopen that interview instead.';
    end if;

    if v_child_id is not null then
      -- Cancel the untouched hand-off; its audit rows cascade with it.
      delete from public.interviews where id = v_child_id;

      insert into public.audit_log (interview_id, actor_id, action, detail)
      values (p_interview_id, auth.uid(), 'TRANSFER_CANCELLED',
              jsonb_build_object('cancelled_interview_id', v_child_id, 'to_track_id', v_child_track));
    end if;
  end if;

  update public.interviews
  set status = 'WAITING',
      started_at = null,
      finished_at = null
  where id = p_interview_id;

  insert into public.audit_log (interview_id, actor_id, action, from_status, to_status)
  values (p_interview_id, auth.uid(), 'REOPENED', v_before.status, 'WAITING');
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────
-- `save_interview_evaluation` keeps its 0007 grant (same signature); the two
-- new functions follow the same pattern: nobody but a signed-in account.

revoke execute on function public.save_interview_evaluation(uuid, jsonb, text, text) from public;
grant execute on function public.save_interview_evaluation(uuid, jsonb, text, text) to authenticated, service_role;

revoke execute on function public.change_interview_outcome(uuid, text) from public;
grant execute on function public.change_interview_outcome(uuid, text) to authenticated, service_role;

revoke execute on function public.reopen_interview(uuid) from public;
grant execute on function public.reopen_interview(uuid) to authenticated, service_role;
