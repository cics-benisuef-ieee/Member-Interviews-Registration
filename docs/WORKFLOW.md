# Interview workflow

## A member's day

```
Registers (public form or admin)
        │  receives queue number, e.g. #7 for Machine Learning
        ▼
   WAITING in that track's queue
        │  board presses "Start" on that row (any waiting row may be
        │  called — skipping ahead is allowed, queue order stays as printed)
        ▼
   IN_INTERVIEW
        │  committee fills the five-section evaluation (100 points)
        │  + a recommendation — saving is a draft, as often as needed
        │  "Unstart" sends the member back to WAITING, keeping their
        │  place in the queue and the evaluation saved so far
        │
        │  board records an outcome — only once the evaluation is complete
        ├──▶ PASSED                 — done
        ├──▶ REJECTED               — done
        └──▶ NEEDS_ANOTHER_TRACK    — a new WAITING entry appears
                                       in the chosen track's queue,
                                       same day, with a fresh queue number,
                                       tagged "sent from <track>"

   The day's story is also on the public /tv hall display, for the
   tracks an admin marked "On TV".
```

## Rules

1. **One queue per track per day**, numbered from 1. The day rolls over at local midnight (chapter timezone in `app_settings`).
2. **A member can only be queued once per track per day** — enforced by a database constraint.
3. **Transfers append, never replace.** The source interview keeps its record (`NEEDS_ANOTHER_TRACK`) and the new track sees a normal waiting entry marked with its origin.
4. **Any waiting member can be started** — the board picks the row; starting sets only that row `IN_INTERVIEW` and never reorders the queue.
5. **Unstart keeps the work.** Returning a member to `WAITING` clears only the clock — the queue number, notes, and evaluation survive.
6. **Finishing requires a complete evaluation** — every section scored (100 points max in total) plus a recommendation. Enforced in the database, so no client can skip it. The recommendation is stored separately from the score.
7. **Every change is audited** — `audit_log` records who moved which interview between which states (including evaluation saves and unstarts).
8. **/tv shows only what an admin opts in** — the `tv_visible` flag per track; visibility does not affect boards, logins, or registration.

## Who does what

| Step                      | Who                                             |
| ------------------------- | ----------------------------------------------- |
| Register a member         | The member themselves (public form) or an admin |
| Start / unstart           | The track's board (or an admin)                 |
| Score + recommend         | The track's board (or an admin)                 |
| Pass / reject             | The track's board, once the evaluation is done  |
| Send to another track     | The track's board, via "Send to another track"  |
| Fix a mistake             | Admin (`/admin/members`, `/admin/tracks`)       |
| Choose who appears on /tv | Admin (`/admin/tracks`, "Show on TV")           |
| Review what happened      | Admin (`/admin/history`)                        |
