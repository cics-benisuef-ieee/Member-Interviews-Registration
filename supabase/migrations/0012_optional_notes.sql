-- ============================================================================
-- 0012 · Notes are optional
--
-- The evaluation form used to require a note under every criterion: a score
-- without its note kept the evaluation a draft, and the finish gate
-- (`complete_interview`, `change_interview_outcome`) stayed shut. Committees
-- asked to score first and annotate only when there is something to say, so
-- the note requirement is gone from the gate:
--
--   · `save_interview_evaluation` treats a criterion with a score and no note
--     as finished, so such a save stores `overall_total` and the interview can
--     be finished straight away;
--   · `change_interview_outcome` keeps its own copy of the gate's message in
--     step — the rule itself (overall_total + recommendation) is unchanged;
--   · an empty note is still stored as an empty string (never dropped), so
--     what the committee typed round-trips exactly;
--   · nothing else moves — the note *column* stays, a draft may still hold
--     only a score or only a note, and scores, interviewer names and the
--     recommendation are still required to finish.
--
-- Idempotent: re-running it in the SQL editor replaces the same functions in
-- place (same signatures, so the existing grants still apply).
--
-- Apply this **and** re-run 0009 in the SQL editor: both files define
-- `save_interview_evaluation`, and 0009 must be the last definition applied or
-- its post-finish editing behaviour is overwritten.
-- ============================================================================

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

    -- The note is context, never a requirement: whatever was typed is kept
    -- (an empty note stays an empty string) and its absence cannot keep the
    -- evaluation a draft. Scores, both interviewer names and the
    -- recommendation decide that.
    v_notes := coalesce(trim(v_scores -> v_key ->> 'notes'), '');

    v_clean := v_clean || jsonb_build_object('scores',
      coalesce(v_clean -> 'scores', '{}'::jsonb) ||
      jsonb_build_object(v_key, jsonb_strip_nulls(jsonb_build_object(
        'score', case when v_scores -> v_key ? 'score'
                      then (v_scores -> v_key ->> 'score')::numeric end,
        'notes', v_notes
      )))
    );

    if coalesce(jsonb_typeof(v_scores -> v_key -> 'score'), 'null') <> 'number' then
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
-- PASSED ⇄ REJECTED, unchanged except for its message: since 0012 the gate is
-- "a score for every criterion plus a recommendation", so the refusal no
-- longer claims notes are required.

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
    raise exception 'Complete the evaluation — every criterion scored, plus a recommendation — before changing the outcome.';
  end if;

  update public.interviews
  set status = p_outcome
  where id = p_interview_id;

  insert into public.audit_log (interview_id, actor_id, action, from_status, to_status)
  values (p_interview_id, auth.uid(), 'OUTCOME_CHANGED', v_before.status, p_outcome);
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────
-- Same signatures as 0007/0009, so these only restate the existing grants.

revoke execute on function public.save_interview_evaluation(uuid, jsonb, text, text) from public;
grant execute on function public.save_interview_evaluation(uuid, jsonb, text, text) to authenticated, service_role;

revoke execute on function public.change_interview_outcome(uuid, text) from public;
grant execute on function public.change_interview_outcome(uuid, text) to authenticated, service_role;
