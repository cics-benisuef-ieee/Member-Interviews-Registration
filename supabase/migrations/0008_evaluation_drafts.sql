-- ============================================================================
-- 0008 · Evaluation drafts
--
-- The evaluation form is long — eleven criteria, each with a score and a
-- note, two interviewer names and a recommendation — and the interview runs
-- while the queue keeps moving. Committees asked to be able to save it half
-- finished without losing anything, so `save_interview_evaluation` now
-- accepts a *partial* evaluation:
--
--   · any criterion may be missing, or carry only a score or only a note
--   · the two interviewer fields may be empty
--   · the recommendation may be null
--
-- Whatever *is* provided is still validated exactly as before: a whole number
-- inside the criterion's own maximum, and the stored document is rebuilt from
-- the known criteria only, so stray keys cannot ride along.
--
-- Completeness keeps its full meaning. `overall_total` is written only once
-- every criterion has a score and a note, both interviewers are named, and a
-- recommendation exists; while the evaluation is a draft the column stays
-- null. `complete_interview` (0007) already refuses to finish an interview
-- whose `overall_total` or `recommendation` is null, so the gate that keeps
-- Pass / Reject / Transfer locked is unchanged — a draft can be saved as
-- often as the committee likes, and finishing still requires the whole form.
--
-- Idempotent like 0007: re-running it in the SQL editor replaces the function
-- in place. The signature is unchanged, so the grants from 0007 still apply.
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

  if v_before.status not in ('WAITING', 'IN_INTERVIEW') then
    raise exception 'The evaluation can only be edited while the interview is open (current: %).', v_before.status;
  end if;

  update public.interviews
  set evaluation = v_clean,
      -- A draft leaves the total null, which is exactly the signal
      -- `complete_interview` reads before refusing to finish the interview.
      overall_total = case when v_complete then v_total else null end,
      recommendation = p_recommendation,
      final_notes = nullif(trim(coalesce(p_final_notes, '')), ''),
      evaluation_updated_at = now()
  where id = p_interview_id;

  insert into public.audit_log (interview_id, actor_id, action, detail)
  values (p_interview_id, auth.uid(), 'EVALUATION_SAVED',
          jsonb_build_object('partial_total', v_total, 'complete', v_complete,
                             'recommendation', p_recommendation));

  return v_total;
end;
$$;

-- Same signature as 0007, so its grants (authenticated, service_role) hold.
