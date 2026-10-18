# Update + verify 0008 (run in Supabase SQL editor)

Re-running `supabase/migrations/0008_evaluation_drafts.sql` is the update: it
is idempotent and replaces `save_interview_evaluation` in place (same
signature, so 0007's grants still apply). Run the whole file, then these
read-only checks.

```sql
-- 1) The save function knows about drafts (expect true)
SELECT (SELECT prosrc
        FROM pg_proc
        WHERE proname = 'save_interview_evaluation'
          AND pronargs = 4) LIKE '%v_complete%' AS accepts_drafts;

-- 2) Finishing is still gated on a complete evaluation (expect true)
SELECT prosrc LIKE '%overall_total is null%'
       AND prosrc LIKE '%recommendation is null%' AS finish_gate_intact
FROM pg_proc
WHERE proname = 'complete_interview';

-- 3) The audit trail records whether a save was complete (expect true)
SELECT (SELECT prosrc
        FROM pg_proc
        WHERE proname = 'save_interview_evaluation'
          AND pronargs = 4) LIKE '%''complete'', v_complete%' AS audits_completeness;
```

What changed: `save_interview_evaluation` now accepts a **partial** evaluation
— any criterion may be missing or carry only a score or only a note, the two
interviewer fields may be empty, and the recommendation may be null. Whatever
is provided is still range-checked per criterion.

Completeness keeps its meaning: `overall_total` is written only when every
criterion has a score and a note, both interviewers are named, and a
recommendation exists. While the form is a draft the column stays **null**,
which is exactly what `complete_interview` reads before refusing to finish an
interview — so Pass / Reject / Transfer stay locked until the whole form is
saved, unchanged.

The board matches it: the form has a "Save draft" button plus an automatic
copy in the browser (`localStorage`, keyed by interview id), the section
headers show `n of m complete`, and the checklist above the buttons names
whatever is still missing.
