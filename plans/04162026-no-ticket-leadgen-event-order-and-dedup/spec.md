# Leadgen Event Order Enforcement + Deduplication

## Why
Three compounding wrongs in the current tracking pipeline, all visible
in today's admin timeline for a single live-test session:

1. **`results_viewed` / "More Results Viewed" fires while the user is
   still behind the email paywall.** DashboardStage's mount effect
   fires both `stage_viewed_5` AND `results_viewed` unconditionally —
   but the dashboard UI blurs/gates its content behind the email
   overlay, so the user hasn't actually seen the unblurred content yet.
   The funnel lies.

2. **Duplicate stage events.** Screenshots show "Report Viewed",
   "Competitor Map Viewed", "More Results Viewed", and even
   "Email Submitted" each landing **twice** in the same session. The
   duplicates come from multiple writers of the same event:
     - Client `trackEvent` fires on component mount
     - If the parent re-mounts the stage (stage transitions, HMR,
       StrictMode double-invocation), trackEvent fires again
     - Server-authoritative endpoints (`/email-paywall`, `/email-notify`)
       AND the audit-worker's `recordAuditMilestone` ALSO write the same
       event names. idempotency lives only in the server-authoritative
       paths; regular `/leadgen/event` writes unconditionally.

3. **Regression is permitted.** There's no check that prevents a
   session at `stage_viewed_5` from re-recording `competitor_map_viewed`.
   `isLaterStage` gates the `final_stage` column update but doesn't
   gate whether an event row is *inserted*.

## What
1. **Server-side strict ordering in `ingestEvent`**: stage events
   (anything in `STAGE_ORDER` except `abandoned` + CTA events) are
   idempotent per `(session_id, event_name)` AND cannot regress. If
   the event has already been recorded, or its ordinal is ≤ the
   session's current `final_stage` ordinal, return 200 but skip the
   insert. CTA/interaction events (`cta_clicked_*`, `email_field_*`)
   bypass these rules — they enrich the timeline and can fire many
   times.
2. **Client-side "already fired" cache**: a localStorage Set per
   session tracking stage events that have fired. `trackEvent` for
   stage events returns early if present. Cheap short-circuit; server
   enforcement is the hard contract.
3. **Move `results_viewed` emission**: out of DashboardStage's mount
   effect, into the effect that flips when `emailSubmitted` transitions
   true. `stage_viewed_5` ("Report Viewed") stays on mount — it
   reflects the fact that the pipeline finished and the UI rendered.
   `results_viewed` ("More Results Viewed") now fires only when the
   user actually gets past the gate.
4. **Drop the audit-worker's `results_viewed` milestone**: the
   processor currently writes `results_viewed` server-side at
   `realtime_status=5`. That clashes with the new semantic ("user
   actually viewed unblurred content"). The worker still writes
   `stage_viewed_5` (pipeline finished = report rendered) but leaves
   `results_viewed` for the client to decide.

## Context

### Relevant files — backend (`/Users/rustinedave/Desktop/alloro`)
- `src/controllers/leadgen-tracking/LeadgenTrackingController.ts` —
  `ingestEvent` at ~line 280. Add the strict-order + idempotency check
  before the `leadgen_events` insert.
- `src/controllers/leadgen-tracking/feature-utils/util.event-ordering.ts`
  — helpers for ordinal comparisons. Possibly add a new
  `shouldRecordStageEvent(eventName, currentStage)` helper.
- `src/models/LeadgenSessionModel.ts` — `STAGE_ORDER` map (already
  covers `account_created` and `account_linked` at ordinal 13).
- `src/workers/processors/auditLeadgen.processor.ts` — the
  `recordAuditMilestone(auditId, "results_viewed")` call at ~line 520.
  Drop that one; keep `stage_viewed_5`.
- `src/controllers/leadgen-tracking/feature-services/service.audit-milestone-events.ts`
  — the server-authoritative write path. Already has its own
  idempotency (`(session_id, event_name)` check) so it won't race the
  new strict-order code.

### Relevant files — leadgen tool (`/Users/rustinedave/Desktop/alloro-leadgen-tool`)
- `src/lib/tracking.ts` — extend `trackEvent` with the localStorage
  short-circuit for stage events. CTA events (already a separate
  union) bypass.
- `App.tsx` — no changes needed; the emailSubmitted lifecycle it
  already threads through is what DashboardStage will latch onto.
- `src/components/stages/DashboardStage.tsx` — the mount effect at
  ~line 123 fires `stage_viewed_5 + results_viewed` together. Split:
  mount effect fires only `stage_viewed_5`; new effect keyed on
  `emailSubmitted === true` fires `results_viewed`.

### Patterns to follow
- **Server-side strict ordering:** mirror the existing
  `shouldSetAbandoned` / `isLaterStage` pattern — pure functions in
  `util.event-ordering.ts`, consumed in `ingestEvent`. No new
  middleware, no new table.
- **Client dedup cache:** same localStorage idiom the session id
  adoption uses. Key prefix `leadgen_fired_stages:` keeps it
  discoverable in DevTools.
- **CTA events stay untouched:** the `LeadgenEventName` union already
  separates stage events from CTA events (`cta_clicked_*`,
  `email_field_*`). The dedup logic keys off that partition.

### Reference analog
- Existing `recordServerSideEvent` (in `LeadgenTrackingController.ts`)
  — it already does the "(session_id, event_name) uniq check" for the
  email-paywall and email-notify endpoints. We're generalising that
  pattern into the main `ingestEvent` path.

## Constraints

### Must
- Every stage event must be **exactly-once** per session — no
  duplicates land, regardless of how many times the client fires it.
- Stage events must be **monotonic** — once the session is at
  `stage_viewed_4`, subsequent `audit_started` / `input_submitted`
  writes are rejected.
- CTA events (`cta_clicked_strategy_call`,
  `cta_clicked_create_account`, `email_field_focused`,
  `email_field_blurred_empty`) stay untouched — they can fire many
  times and must all land.
- `results_viewed` must fire ONLY after `emailSubmitted` is true in
  the leadgen tool.
- Server returns `{ ok: true }` for rejected writes (same shape as
  success) so silent-failure behaviour on the client continues to
  work — nothing crashes.
- Log when a write is rejected, with the reason, so future-us can
  see suppression activity in pm2.

### Must not
- Don't drop support for legacy `account_created` — keep it as a
  synonym for `account_linked` in ordering checks.
- Don't gate CTA events by ordinal — they're not in the progression.
- Don't refactor the funnel aggregator — it reads event_name and is
  fine.
- Don't break the existing idempotent server-authoritative paths
  (`/email-paywall`, `/email-notify`, audit-worker milestones) —
  they already dedupe their own writes; the new ingestEvent gate
  must stack cleanly on top (first-writer wins).

### Out of scope
- Session-level retroactive cleanup of existing duplicate rows. One-
  off SQL if desired; not in this plan.
- Re-emitting `results_viewed` on subsequent drawer reopens — one-
  and-done per session is correct.
- Adding UI for "event not recorded — you tried to regress" (it's a
  silent no-op, which is correct UX).

## Risk

**Level:** 2 (Concern — touches the high-traffic ingest path and a
client behavior change)

### Risks identified

1. **Over-zealous suppression.** If the ordering check is too strict,
   legitimate events (e.g., a second `stage_viewed_1` after a fresh
   audit on the same session) could get dropped. We mitigate by
   scoping the dedup to the CURRENT session's events — NOT global.
   And by rejecting only *regression* and *exact-dup*; anything
   ordinally forward is still accepted.

2. **Client-cache staleness.** If the user's browser cached "fired:
   stage_viewed_5" but the server row got deleted via admin, the
   client won't re-fire. Accept this — it's an edge case; server-side
   strict ordering is the hard contract, client cache is just
   optimization.

3. **Moving `results_viewed` after email gate changes funnel
   semantics.** Historical rows have `results_viewed` firing on
   dashboard mount (pre-email). After this change, `results_viewed`
   count drops for ungated sessions. That's intended — the data is
   now honest. Call out in the CHANGELOG that the count will step
   down post-deploy.

4. **Race between client trackEvent + server-authoritative write.**
   If both fire "email_submitted" at roughly the same moment, only
   the first wins. Verified this is fine — the idempotency check is
   atomic enough (row exists or doesn't).

### Blast radius
- Backend: 2 files (controller + event-ordering util). No new tables,
  no migration.
- Leadgen tool: 2 files (tracking.ts + DashboardStage.tsx).
- Audit worker: 1-line removal of `results_viewed` milestone call.

### Pushback
- Worth flagging: we're making `results_viewed` a subjective signal
  (user-engagement) rather than objective (pipeline-ready). That's
  correct for funnel purposes. But any code that reads
  `results_viewed` as "pipeline done" (there isn't any right now, but
  future additions might be tempted) will get confused. Document
  the shift in the CHANGELOG.

## Tasks

### T1: Backend — `shouldRecordStageEvent` helper
**Do:** Add to `src/controllers/leadgen-tracking/feature-utils/util.event-ordering.ts`:
```ts
export function isProgressionStage(event: LeadgenEventName): boolean;
// returns true for anything in STAGE_ORDER (minus 'abandoned');
// false for CTA events and abandoned.

export function shouldRecordStageEvent(
  incoming: LeadgenEventName,
  session: { final_stage: FinalStage }
): { allow: boolean; reason?: "duplicate" | "regression" | "ok" };
// - allow=false reason='duplicate' when incoming === session.final_stage
// - allow=false reason='regression' when ordinal(incoming) <
//   ordinal(session.final_stage) [excluding abandoned's 99]
// - allow=true otherwise
```
CTA events short-circuit to `{allow: true}` without any ordinal math —
they can fire arbitrarily often.
**Files:** `util.event-ordering.ts`
**Depends on:** none

### T2: Backend — wire `shouldRecordStageEvent` into `ingestEvent`
**Do:** In `LeadgenTrackingController.ts`, right before the
`leadgen_events` insert inside `ingestEvent`, call `shouldRecordStageEvent`.
If `allow=false`:
- `console.log("[LeadgenTracking] suppressed event", { session_id,
  event_name, reason })` so the decision is visible in pm2
- Return `{ok: true}` (no event row, no session patch)

Idempotency is still honoured for BOTH the `leadgen_events` insert AND
the session's `final_stage` column promotion — the existing
`isLaterStage` guard already does the latter. The new guard adds: even
if `isLaterStage` would let the session advance, we still skip the
event row for dupes.
**Files:** `LeadgenTrackingController.ts`
**Depends on:** T1
**Verify:** curl POST `/leadgen/event` with event_name that duplicates
the current session's final_stage → 200 but no new row; pm2 shows
suppression log line.

### T3: Backend — drop `recordAuditMilestone(auditId, "results_viewed")` from worker
**Do:** In `auditLeadgen.processor.ts`, remove the single call that
writes `results_viewed` from the completion block at ~line 520. Keep
the `stage_viewed_5` milestone — that still reflects "pipeline finished,
data is ready". `results_viewed` is now client-owned and fires only
after the user satisfies the paywall.
**Files:** `auditLeadgen.processor.ts`
**Depends on:** none
**Verify:** an audit that completes server-side produces
`stage_viewed_5` but NOT `results_viewed` in `leadgen_events` until
the user submits the paywall email.

### T4: Leadgen tool — client dedup cache
**Do:** In `src/lib/tracking.ts`:
- New module-level helper `hasFiredStage(eventName: LeadgenEventName): boolean`
  — reads from `localStorage[`leadgen_fired_stages:${sessionId}`]`
  (comma-separated list). Returns false if not present or localStorage
  unavailable.
- New `markStageFired(eventName: LeadgenEventName): void` — writes back.
- Patch `trackEvent`: before the fetch, if `isProgressionStage(name)`
  AND `hasFiredStage(name)` → silent return. Otherwise `markStageFired`
  first, then fetch.
- Don't touch CTA events — they stay fire-and-forget as many times as
  the user wants.
- Clear the cache when `adoptSessionId` swaps the session id, so the
  NEW adopted session gets a fresh slate.

The backend will still reject duplicates from outdated clients; this
cache just saves the round-trip.
**Files:** `src/lib/tracking.ts`
**Depends on:** none

### T5: Leadgen tool — move `results_viewed` after email submit
**Do:** In `src/components/stages/DashboardStage.tsx`:
- The mount effect fires `stage_viewed_5` only (Report Viewed).
- New effect: `useEffect(() => { if (emailSubmitted) { setCurrentStage("results_viewed"); trackEvent("results_viewed"); } }, [emailSubmitted]);`
  — fires exactly once when the gate flips.
- Also keep the 60s `report_engaged_1min` timer but gate it on
  `emailSubmitted` too? No — engaged-1min should only fire when the
  user is actually engaging with the report content. If they're still
  paywalled, they're waiting, not engaging. So gate that too:
  `useEffect(() => { if (!emailSubmitted) return; const t =
  setTimeout(...); return () => clearTimeout(t); }, [emailSubmitted]);`
**Files:** `src/components/stages/DashboardStage.tsx`
**Depends on:** none
**Verify:** open leadgen tool, finish audit, sit on paywall without
submitting → admin shows `stage_viewed_5` (Report Viewed) ONCE, no
`results_viewed`, no `report_engaged_1min`. Submit email → admin
shows `email_submitted` + `results_viewed` within the second.

### T6: tsc + build verify
**Do:** `npx tsc --noEmit` on backend, `npm run build` on admin
frontend AND leadgen tool.
**Depends on:** all above

### T7: Manual smoke on localhost
**Do:** user runs leadgen tool on `localhost:3002`, admin on
`localhost:3000/admin`. Watch the event timeline during a full run:
- Land → single `landed` row
- Input → single `input_started` + `input_submitted`
- Audit runs → single `audit_started`, `stage_viewed_1`,
  `stage_viewed_2`, `stage_viewed_4`, `stage_viewed_5`
- Paywall shown → single `email_gate_shown`
- Email submitted → single `email_submitted` + single `results_viewed`
- No duplicates, no regressions, no CTA-event suppression
- pm2 console shows "suppressed event" lines for any refused retries

## Done

- [ ] `npx tsc --noEmit` backend — exit 0
- [ ] `npm run build` admin frontend — exit 0
- [ ] `npx tsc --noEmit` leadgen tool — exit 0
- [ ] Fresh localhost audit produces exactly one row per stage event
      in `leadgen_events`
- [ ] `results_viewed` does NOT appear in `leadgen_events` until the
      user submits the paywall email
- [ ] `report_engaged_1min` does NOT fire until after email submit
- [ ] Attempting to re-fire any stage event (via client retry,
      cross-device visit, manual curl) produces a `[LeadgenTracking]
      suppressed event` pm2 log and NO duplicate row
- [ ] CTA events (`cta_clicked_*`, `email_field_*`) continue to fire
      unrestricted — an admin can click the strategy-call CTA 5
      times and see all 5 events in the timeline
- [ ] CHANGELOG entry written — note the intentional downward step
      in historical `results_viewed` counts post-deploy
