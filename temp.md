# Verify evaluation section keys (run in Supabase SQL editor)

```sql
-- Re-align evaluation section keys with the app (safe to run even if already correct)
ALTER TABLE public.interviews
  DROP CONSTRAINT IF EXISTS interviews_evaluation_sections_check;

ALTER TABLE public.interviews
  ADD CONSTRAINT interviews_evaluation_sections_check
  CHECK (
    (jsonb_typeof(evaluation_sections) = 'object')
    AND (evaluation_sections ? 'technical')
    AND (evaluation_sections ? 'english')
    AND (evaluation_sections ? 'teamwork')
    AND (evaluation_sections ? 'commitment')
    AND (evaluation_sections ? 'experience')
    AND (evaluation_sections ? 'status')
    AND ((SELECT COALESCE(SUM((evaluation_sections ->> k)::numeric), 0)
          FROM unnest(ARRAY['technical','english','teamwork','commitment','experience']) AS k)
         BETWEEN 0 AND 100)
  );

SELECT pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'public.interviews'::regclass
  AND conname = 'interviews_evaluation_sections_check';
```

Expected result of the `SELECT`: a CHECK constraint listing the keys
`technical`, `english`, `teamwork`, `commitment`, `experience` (plus `status`).
