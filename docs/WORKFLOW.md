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
        │  committee fills the evaluation — Attitude 50, Technical
        │  Skills 40, IEEE Knowledge 10 (every criterion scored with
        │  a note) plus a recommendation; saving is a draft and may
        │  be done as often as needed, even half-finished
        │  "Unstart" sends the member back to WAITING, keeping their
        │  place in the queue and the evaluation saved so far
        │
        │  board records an outcome — only once the evaluation is complete
        ├──▶ PASSED ──────────────┐
        ├──▶ REJECTED ────────────┤  the record stays open to correction:
        └──▶ NEEDS_ANOTHER_TRACK ─┘  review the evaluation, fix a score,
                                     swap Pass ⇄ Reject, or reopen the
                                     interview (back to WAITING)

   A transfer appends a new WAITING entry to the chosen track's queue —
   same day, fresh queue number, tagged "sent from <track>". Reopening
   the source cancels that entry while the receiving track has not
   started the member yet.

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
7. **A finished interview stays editable.** Its evaluation can be corrected, its decision swapped (`PASSED ⇄ REJECTED`), or the interview reopened into the queue. Reopening a transfer cancels the receiving entry only while that track has not started the member yet; an incomplete edit re-locks the finish gate.
8. **Every change is audited** — `audit_log` records who moved which interview between which states (including evaluation saves, unstarts, decision changes, and reopens).
9. **/tv shows only what an admin opts in** — the `tv_visible` flag per track; visibility does not affect boards, logins, or registration.
10. **A member's data lives with their interviews.** Every interview carries a snapshot of the person (name, phone, email, position, notes), so the `members` table is only the live working list for today. The admin members list shows today's queue; a finished day's people live in History, where their details can still be read and edited. "Clear past members" (History page, or `npm run db:purge-past`) empties the live table without touching history.

## Who does what

| Step                      | Who                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Register a member         | The member themselves (public form) or an admin                                                                                                                                |
| Start / unstart           | The track's board (or an admin)                                                                                                                                                |
| Score + recommend         | The track's board (or an admin)                                                                                                                                                |
| Pass / reject             | The track's board, once the evaluation is done                                                                                                                                 |
| Send to another track     | The track's board, via "Send to another track"                                                                                                                                 |
| Fix a finished interview  | Any board on its own track (the row's "Review", or `/board/history`), the admin members list (one review per track entry, transfers included), or an admin in `/admin/history` |
| Edit a member's details   | Admin (`/admin/members`, or from a History review)                                                                                                                             |
| Clear past members        | Admin (History page, "Clear past members")                                                                                                                                     |
| Choose who appears on /tv | Admin (`/admin/tracks`, "Show on TV")                                                                                                                                          |
| Review what happened      | A track in `/board/history` (its own track only), or an admin in `/admin/history` (everything)                                                                                 |
