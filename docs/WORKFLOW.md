# Interview workflow

## A member's day

```
Registers (public form or admin)
        │  receives queue number, e.g. #7 for Machine Learning
        ▼
   WAITING in that track's queue
        │  board presses "Start"
        ▼
   IN_INTERVIEW
        │  board records an outcome
        ├──▶ PASSED                 — done
        ├──▶ REJECTED               — done
        └──▶ NEEDS_ANOTHER_TRACK    — a new WAITING entry appears
                                       in the chosen track's queue,
                                       same day, with a fresh queue number,
                                       tagged "sent from <track>"
```

## Rules

1. **One queue per track per day**, numbered from 1. The day rolls over at local midnight (chapter timezone in `app_settings`).
2. **A member can only be queued once per track per day** — enforced by a database constraint.
3. **Transfers append, never replace.** The source interview keeps its record (`NEEDS_ANOTHER_TRACK`) and the new track sees a normal waiting entry marked with its origin.
4. **Only one interview can run at a time per track** — "Start" is only offered when nobody is being interviewed.
5. **Every change is audited** — `audit_log` records who moved which interview between which states.

## Who does what

| Step | Who |
|---|---|
| Register a member | The member themselves (public form) or an admin |
| Start / pass / reject | The track's board (or an admin) |
| Send to another track | The track's board, via "Send to another track" |
| Fix a mistake | Admin (`/admin/members`, `/admin/tracks`) |
| Review what happened | Admin (`/admin/history`) |
