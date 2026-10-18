# Update + verify 0007 (run in Supabase SQL editor)

Re-running `supabase/migrations/0007_evaluations_tv_and_position.sql` is the
update: it is idempotent and replaces the evaluation functions and the
recommendation constraint in place. Run the whole file, then these read-only
checks.

```sql
-- 1) Recommendation values (expect ACCEPTED / NEEDS_TRAINING / REJECTED)
SELECT pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'public.interviews'::regclass
  AND conname = 'interviews_recommendation_check';

-- 2) Columns added by 0007 (expect 5 rows)
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'interviews'
  AND column_name IN
    ('evaluation', 'overall_total', 'recommendation', 'final_notes', 'evaluation_updated_at')
ORDER BY column_name;

-- 3) The save function knows the new criteria (expect true)
SELECT (SELECT prosrc
        FROM pg_proc
        WHERE proname = 'save_interview_evaluation'
          AND pronargs = 4) LIKE '%studentBranch%' AS uses_new_criteria;

-- 4) Functions from 0007 exist (expect 3 rows)
SELECT proname
FROM pg_proc
WHERE proname IN ('save_interview_evaluation', 'unstart_interview', 'get_tv_boards')
ORDER BY proname;
```

Criteria the checks are looking for: Attitude (5 criteria × 10 = 50),
Technical Skills (4 × 10 = 40), IEEE Knowledge (2 × 5 = 10) — every criterion
scored with a note; recommendation is `ACCEPTED` | `NEEDS_TRAINING` | `REJECTED`.
