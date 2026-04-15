# Leadgen Tracking & Funnel Overhaul

## Why
The admin leadgen view is currently blind in three ways: (1) the funnel miscounts — it groups by `final_stage` so one session sits in exactly one bucket instead of contributing to every bucket it passed through, making the funnel report zeros for stages the user actually hit; (2) there's no way to clean up a session group (bad tests, spam, staff QA runs); (3) leadgen sessions have no tie to the actual `users` table, so we can't answer "did this lead convert?". On top of that the funnel still shows a legacy Photos sub-stage that is no longer emitted, and the overall tracking is too thin to be *actually useful* — no stage timing, no UA breakdown, no UTM capture, no CTA clicks.

## What
Rebuild the leadgen tracking + admin surface so it's accurate and useful:

1. **Accurate funnel** — cumulative counts based on the max stage each session reached (via `leadgen_events`), not just current `final_stage`.
2. **Delete a session group** — admin can remove a session and all its events (cascade already set).
3. **Drop Photos legacy stage** from admin display (keep in enum for legacy rows).
4. **New Account Created stage** — post-signup hook links `users.email`/`session_id` → `leadgen_sessions`, writes a terminal success stage.
5. **Sophisticated tracking** — stage timing, UA parsing, UTM capture, CTA click events, time-to-convert, conversion flag. Detailed proposals below.

## Context

### Relevant files — backend (`/Users/rustinedave/Desktop/alloro`)
- `src/controllers/leadgen-tracking/LeadgenTrackingController.ts` — public /session, /event, /beacon endpoints
- `src/controllers/admin-leadgen/AdminLeadgenController.ts` — list/detail/funnel/export
- `src/controllers/admin-leadgen/feature-services/service.funnel-aggregator.ts` — **source of the funnel bug** (groupBy final_stage)
- `src/models/LeadgenSessionModel.ts` — `FinalStage` union + `STAGE_ORDER` (ordinals)
- `src/models/LeadgenEventModel.ts` — append-only event log
- `src/database/migrations/20260415000001_create_leadgen_sessions.ts` — session schema
- `src/database/migrations/20260415000002_create_leadgen_events.ts` — events schema
- `src/controllers/auth-otp/AuthOtpController.ts:91-139` (verifyOtp) — **hook point for account-created linking**
- `src/controllers/auth-otp/feature-services/service.user-onboarding.ts:24-43` (`onboardUser`) — called after successful first-time OTP verify

### Relevant files — admin UI (inside the backend repo)
- `frontend/src/pages/admin/LeadgenSubmissions.tsx` — tabs + filters + detail drawer
- `frontend/src/components/Admin/LeadgenSubmissionsTable.tsx` — table + `STAGE_LABEL` map
- `frontend/src/components/Admin/LeadgenSubmissionDetail.tsx` — detail drawer
- `frontend/src/api/leadgenSubmissions.ts` — API client
- `frontend/src/types/leadgen.ts` — shared types (FinalStage, SubmissionSummary, FunnelBucket)
- `frontend/src/components/Admin/BackupsTab.tsx` — **reference analog for destructive-action UI** (uses `useConfirm`, typed confirmation, `Trash2` icon)

### Relevant files — leadgen tool (`/Users/rustinedave/Desktop/alloro-leadgen-tool`)
- `src/lib/tracking.ts` — `getSessionId`, `trackEvent`, `trackBeacon`, `bindAbandonmentBeacon`
- `App.tsx` / `src/components/stages/*` — emission sites for stage events
- `src/components/stages/DashboardStage.tsx` — "Create Your Free Account" CTA (goes to app.getalloro.com/signup)

### Patterns to follow
- **Destructive-action UI:** match `frontend/src/components/Admin/BackupsTab.tsx` — `useConfirm()` modal, optional typed-confirmation for high-risk, `Trash2` icon, inline row button with `text-red-600 hover:bg-red-50`.
- **Admin route pattern:** `AdminLeadgenController` already owns all `/admin/leadgen-submissions/*` routes — add `DELETE /:id` here, not a new controller.
- **Tracking key auth:** all public leadgen endpoints gated by `X-Leadgen-Key` header. New events must follow this pattern, not a new secret.
- **Migration naming:** `YYYYMMDDHHMMSS_name.ts` under `src/database/migrations/`. Three scripts (mssql/pgsql/knex) live in the plan's `migrations/` folder per CLAUDE.md.

### Reference file for new files
- Funnel service rewrite → keep file `service.funnel-aggregator.ts`; reference `service.user-onboarding.ts` for service-shape conventions.
- New session-linking service → new file `src/controllers/leadgen-tracking/feature-services/service.account-linking.ts`, modeled after `service.user-onboarding.ts`.
- New admin delete route → follow the structure of the existing `getSubmissionDetail` handler in `AdminLeadgenController.ts`.

## Constraints

### Must
- Keep existing `FinalStage` union intact (don't remove `stage_viewed_3`) — legacy sessions must still render. Only hide in admin display + stop emission everywhere.
- Funnel must remain date-filterable (from/to) and perform reasonably on >10k sessions — avoid N+1 by aggregating in SQL, not in JS.
- Session deletion must cascade to `leadgen_events` (already set via FK `ON DELETE CASCADE`) and null-out `audit_id` references (already `SET NULL`).
- Account-created linking must be idempotent — re-running against an already-linked session must not duplicate state.
- All new tracking events must degrade gracefully if `X-Leadgen-Key` is absent (no crash, no exception bubbling to the leadgen UI).
- Use the existing `LEADGEN_TRACKING_KEY`; do not introduce a new secret.

### Must not
- Introduce any new third-party dependency (UA parsing can use a tiny inline helper — we already have `friendlyUserAgent` in `LeadgenSubmissionsTable.tsx`; promote it to a shared util instead of pulling `ua-parser-js`).
- Refactor unrelated admin pages.
- Touch the audit pipeline worker (`auditLeadgen.processor.ts`) — that's a separate concern.
- Change the public tracking endpoint contract in a breaking way — old leadgen-tool builds running in cached tabs must keep working.

### Out of scope
- Session replay (rrweb) — interesting but its own project
- IP-based geolocation
- Consolidating the admin UI into the leadgen-tool repo
- Rewriting the audit timing (separate plan)
- GDPR/PII automatic purge (separate compliance plan)

## Risk

**Level:** 3 (Structural Risk — touches tracking data contract, adds DB columns, introduces cross-system linking)

### Risks identified

1. **Funnel re-computation cost** — Moving from `GROUP BY final_stage` on sessions to a per-session max-stage lookup via events could be slow on large datasets.
   **Mitigation:** Use a single SQL query: `SELECT MAX(ordinal) ... FROM leadgen_events JOIN ... GROUP BY session_id`, materialized as a CTE, then count sessions per bucket. Add index `(session_id, event_name)` if absent.

2. **Double-counting on account-created link** — If the post-signup hook fires twice (retries, duplicate OTP verify), we could emit `account_created` twice.
   **Mitigation:** `service.account-linking.ts` checks for existing `leadgen_events` row with `event_name='account_created'` before writing. Idempotent by design.

3. **Abandoned-vs-completed ambiguity** — Current behavior: a session that reached `results_viewed` then closed the tab can get stamped `abandoned` by the beforeunload beacon. This conflates success with drop-off.
   **Mitigation:** Frontend already guards `bindAbandonmentBeacon` against `results_viewed`, but we should also guard server-side in `shouldSetAbandoned()` — never downgrade if `completed=true` already.

4. **Session id leak via signup URL** — Passing `session_id` on the signup redirect (`?ls={uuid}`) exposes the tracking id in browser history.
   **Mitigation:** It's a random UUID with no PII value; low-risk tradeoff for reliable cross-system linking. Document it. Do not pass email in URL.

5. **Stage enum drift between repos** — Backend and frontend both declare `FinalStage`; adding `account_created` requires updates in both + the leadgen-tool types.
   **Mitigation:** List all three declaration sites in T3 and T6 task files.

### Blast radius

Files that read `FinalStage` or call tracking endpoints (identified consumers — all will need review):
- Backend: `LeadgenTrackingController`, `AdminLeadgenController`, `service.funnel-aggregator`, `LeadgenSessionModel`, `LeadgenEventModel`, `AuthOtpController` (new consumer)
- Admin UI: `LeadgenSubmissions.tsx`, `LeadgenSubmissionsTable.tsx`, `LeadgenSubmissionDetail.tsx`, `leadgenSubmissions.ts`, `types/leadgen.ts`
- Leadgen tool: `tracking.ts`, `App.tsx`, every `src/components/stages/*` that emits events, `types/index.ts` (if FinalStage is re-declared there)

### Pushback

- **Proposed approach has nothing to push back against at the architectural level.** The funnel fix is strictly correct; the legacy-stage removal is overdue; delete is standard admin hygiene.
- **One thing to flag:** we're about to cross a line from "anonymous tracking" into "linked-identity tracking" the moment we join `leadgen_sessions.email` to `users.email`. This is fine for internal analytics but if the product ever ships a public-facing "here's your leadgen history" view, we'll want a formal consent step at the /signup form. **Recommendation:** note this in the CHANGELOG and revisit before any user-facing exposure.
- **Sophistication tradeoff:** the five proposed tracking enhancements (timing, UA, UTM, CTA clicks, conversion) each have value, but T8 is split into independently-shippable subtasks so you can cut the weakest ones if scope grows.

## Tasks

Dependencies drive the execution graph. T1–T3 are independent and small; T4–T5 depend on nothing; T6 depends on T3; T7 depends on T6; T8 subtasks are mostly independent of the rest and can ship incrementally.

---

### T1: Cumulative funnel aggregation
**Do:** Rewrite `service.funnel-aggregator.ts` so each bucket counts sessions whose **max reached stage ordinal ≥ bucket ordinal**, not sessions whose `final_stage = bucket`. Use a single SQL query that joins `leadgen_sessions → leadgen_events`, computes `MAX(stage_ordinal)` per session, then produces one row per bucket. Fallback for sessions with no events (just the `landed` upsert) = ordinal 0. Handle `abandoned` as a separate terminal counter (sessions with `abandoned=true`), not an ordinal bucket.
**Files:** `src/controllers/admin-leadgen/feature-services/service.funnel-aggregator.ts`, `src/models/LeadgenSessionModel.ts` (export `stageOrdinal(stage)` helper if not already exported)
**Depends on:** none
**Verify:** Seed 3 sessions — one reached `landed` only, one reached `stage_viewed_3`, one reached `results_viewed`. Funnel should show: landed=3, input_started=2, …, results_viewed=1. Run `npm run test:funnel` if one exists, otherwise manual via admin UI.

---

### T2: Drop Photos Sub-stage from admin display
**Do:** Remove the `stage_viewed_3` entry from the funnel stages array rendered in admin. Leave `FinalStage` enum and `STAGE_LABEL` map intact so legacy session rows still label correctly — just don't render a funnel row for it.
**Files:** `frontend/src/components/Admin/LeadgenFunnel.tsx` (or wherever the funnel list is enumerated — find by grepping `stage_viewed_3`), `frontend/src/components/Admin/LeadgenSubmissionsTable.tsx` (update comment, keep the label)
**Depends on:** none
**Verify:** Admin funnel no longer shows a "Photos Sub-stage (legacy)" row. Legacy sessions with `final_stage='stage_viewed_3'` still display the "(legacy)" pill in the submissions table.

---

### T3: Add `account_created` stage
**Do:** Add `account_created` as a new `FinalStage` value (ordinal 12, between `results_viewed` and `abandoned`). Add to all three declaration sites: backend `LeadgenSessionModel.ts`, admin `frontend/src/types/leadgen.ts`, leadgen-tool `src/types/index.ts` (if it re-declares). Add to `STAGE_LABEL` maps in both frontends with label "New Account Created". Add to funnel bucket list with tone=`green`.
**Files:** `src/models/LeadgenSessionModel.ts`, `frontend/src/types/leadgen.ts`, `frontend/src/components/Admin/LeadgenSubmissionsTable.tsx`, `/Users/rustinedave/Desktop/alloro-leadgen-tool/src/types/index.ts` (if applicable), `/Users/rustinedave/Desktop/alloro-leadgen-tool/src/lib/tracking.ts` (accept in the event name union)
**Depends on:** none (but T6 consumes this)
**Verify:** `npx tsc --noEmit` passes in all three places. Funnel view shows "New Account Created" row (with 0 until T6 ships).

---

### T4: Backend delete endpoint
**Do:** Add `DELETE /api/admin/leadgen-submissions/:id` to `AdminLeadgenController`. Validates `id` as UUID, authorizes as existing admin middleware does, runs `db("leadgen_sessions").where({id}).del()` (cascade drops events). Returns `{deleted: true, id}`. Log the deletion with admin user id for audit trail.
**Files:** `src/controllers/admin-leadgen/AdminLeadgenController.ts`, route registration file (find via grep for existing admin leadgen route paths)
**Depends on:** none
**Verify:** `curl -X DELETE` against a seeded session id returns 200, row is gone from `leadgen_sessions`, events are gone from `leadgen_events`, associated `audit_processes.id` row has `audit_id` FK null'd but isn't itself deleted.

---

### T5: Admin delete UI
**Do:** Add a trash icon button to each row in `LeadgenSubmissionsTable` (rightmost column). On click, open `useConfirm` dialog: "Delete this session and all its events? This cannot be undone." Also add a bulk-delete toolbar button that works with row-selection checkboxes (checkboxes are additional scope — if time-boxed, ship per-row only). Also add a "Delete" button in the detail drawer. After successful delete, refresh the list and close the drawer. Style per `BackupsTab.tsx` analog.
**Files:** `frontend/src/components/Admin/LeadgenSubmissionsTable.tsx`, `frontend/src/components/Admin/LeadgenSubmissionDetail.tsx`, `frontend/src/api/leadgenSubmissions.ts` (new `deleteSubmission(id)` function), `frontend/src/pages/admin/LeadgenSubmissions.tsx` (wire the refresh)
**Depends on:** T4
**Verify:** Manual — delete a session from the row, confirm it vanishes; delete from the detail drawer, confirm drawer closes and list refreshes.

---

### T6: Post-signup account-created linking
**Do:** Create `src/controllers/leadgen-tracking/feature-services/service.account-linking.ts`. Export `linkAccountCreation({email, sessionId?})`. Logic:
  1. Find candidate sessions: `(session_id = sessionId)` if provided, UNION `(email = :email)` (case-insensitive).
  2. For each candidate, check if an `account_created` event already exists — skip if so (idempotent).
  3. Write a new `leadgen_events` row with `event_name='account_created'`, `event_data={user_id, linked_via: 'session_id'|'email'}`.
  4. Update session: `final_stage='account_created'`, `completed=true`, `converted_at=now()`.
Wire into `AuthOtpController.verifyOtp` at the point where `onboardUser` returns `isNewUser=true` — fire-and-forget (do not block OTP response on this).
**Files:** new file `src/controllers/leadgen-tracking/feature-services/service.account-linking.ts`, `src/controllers/auth-otp/AuthOtpController.ts` (add the post-onboarding call), `src/models/LeadgenSessionModel.ts` (add `converted_at` to the update surface), migration file (see T8a — adds `converted_at` + `user_id` columns)
**Depends on:** T3, T8a (migration)
**Verify:** Sign up with an email that matches a prior leadgen session → session's `final_stage` becomes `account_created`, `converted_at` populated, an `account_created` event row exists, funnel "New Account Created" count increments.

---

### T7: Pass session id through signup URL
**Do:** Update `DashboardStage.tsx` and `Sidebar.tsx` CTAs from `https://app.getalloro.com/signup` to `https://app.getalloro.com/signup?ls={sessionId}`. On the signup landing page (`app.getalloro.com`), read `?ls=` from the URL and persist to a cookie or localStorage, then send it to `/api/auth/otp/verify` as `leadgen_session_id`. Backend reads it and passes to `linkAccountCreation`.
**Files:** `/Users/rustinedave/Desktop/alloro-leadgen-tool/src/components/stages/DashboardStage.tsx`, `/Users/rustinedave/Desktop/alloro-leadgen-tool/src/components/layout/Sidebar.tsx`, `alloro/frontend` signup page (grep for the `/signup` route component), `alloro/src/controllers/auth-otp/AuthOtpController.ts`
**Depends on:** T6
**Verify:** Click CTA from leadgen dashboard → URL contains `?ls=<uuid>` → complete signup → that exact session is linked by session_id, not email (works even if signup email differs from leadgen email).

---

### T8: Sophisticated tracking — split into shippable subtasks

Each T8x is independent and can land separately. Ship in order of analytical value.

#### T8a: Stage timing + new columns (HIGH value, foundational)
**Do:** Migration adds `converted_at TIMESTAMPTZ`, `user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`, `browser TEXT`, `os TEXT`, `device_type TEXT` to `leadgen_sessions`. Also promote `friendlyUserAgent` from `LeadgenSubmissionsTable.tsx` into `frontend/src/lib/userAgent.ts` (shared) AND add a backend copy at `src/lib/userAgent.ts` that parses on ingest. On every `upsertSession`, parse `user_agent` → `browser`/`os`/`device_type`. For stage timing: add a helper in the funnel service that computes `AVG(EXTRACT(EPOCH FROM (event_n.created_at - event_prev.created_at)))` across sessions → expose via `/admin/leadgen-submissions/funnel` response as `avg_ms_per_stage`.
**Files:** migration (see `migrations/` folder in this plan), `src/controllers/leadgen-tracking/LeadgenTrackingController.ts`, new `src/lib/userAgent.ts`, new `frontend/src/lib/userAgent.ts`, `service.funnel-aggregator.ts` (add timing query).
**Depends on:** none (migration first, then code)
**Verify:** Migration runs cleanly on dev DB. New sessions get `browser`/`os`/`device_type` populated. Funnel response includes `avg_ms_per_stage` per bucket.

#### T8b: UTM + referrer capture
**Do:** Columns already exist on `leadgen_sessions`. Wire the leadgen tool: on first `ensureSession`, read `document.referrer` + `URLSearchParams` for `utm_*`, include in session upsert body. Admin detail drawer adds a "Source" block showing referrer + UTM values.
**Files:** `/Users/rustinedave/Desktop/alloro-leadgen-tool/src/lib/tracking.ts` (`ensureSession`), `src/controllers/leadgen-tracking/LeadgenTrackingController.ts` (already accepts these in patch — verify), `frontend/src/components/Admin/LeadgenSubmissionDetail.tsx` (render block).
**Depends on:** none
**Verify:** Visit leadgen tool with `?utm_source=google&utm_campaign=test` → admin detail shows `utm_source=google`, `utm_campaign=test`.

#### T8c: CTA click events (MEDIUM value — reveals drop-off cause)
**Do:** Add new event names: `cta_clicked_strategy_call`, `cta_clicked_create_account`, `email_field_focused`, `email_field_blurred_empty`. Wire emission in `DashboardStage.tsx` and `Sidebar.tsx` and the email gate component. These go to `leadgen_events` only (not updating `final_stage`). Admin detail drawer timeline shows them chronologically with their stage context. No funnel bucket for these — they enrich the per-session timeline.
**Files:** `/Users/rustinedave/Desktop/alloro-leadgen-tool/src/lib/tracking.ts` (extend event name union), stage components, `src/controllers/leadgen-tracking/LeadgenTrackingController.ts` (validation allow-list).
**Depends on:** none
**Verify:** Click the "Book Strategy Call" CTA → event appears in session detail timeline.

#### T8d: Conversion metrics in admin
**Do:** Add a new stats strip at the top of the admin page: Total Sessions, Total Conversions (`account_created` count), Conversion Rate, Avg Time-to-Convert (median delta between first_seen_at and converted_at). Small tile UI, matches the rest of admin dashboard aesthetic.
**Files:** `frontend/src/pages/admin/LeadgenSubmissions.tsx`, new `frontend/src/components/Admin/LeadgenStatsStrip.tsx`, new backend endpoint `GET /admin/leadgen-submissions/stats` in `AdminLeadgenController.ts`.
**Depends on:** T6 (needs converted_at), T8a (needs column)
**Verify:** Strip shows `Conversion Rate = 12.5%` on a seeded dataset with 8 sessions, 1 converted.

#### T8e: Abandoned-vs-completed guard (small but important cleanup)
**Do:** In `LeadgenTrackingController.shouldSetAbandoned`, never flip `abandoned=true` if `completed=true` is already set. Same guard in the frontend `bindAbandonmentBeacon` (which already has some logic — audit and tighten).
**Files:** `src/controllers/leadgen-tracking/LeadgenTrackingController.ts`, `/Users/rustinedave/Desktop/alloro-leadgen-tool/src/lib/tracking.ts`
**Depends on:** none
**Verify:** Reach `results_viewed`, close the tab → session stays `final_stage='results_viewed'`, `abandoned=false`.

#### T8f (optional, consider deferring): Real-time admin stream
**Do:** SSE endpoint `/admin/leadgen-submissions/stream` that pushes new session + event rows as they arrive. Admin page has a "Live" toggle.
**Risk:** Adds a long-lived connection pattern the admin server doesn't currently have.
**Recommendation:** DEFER to a follow-up plan. Not worth the complexity for v1.

---

## Parallel execution groups

Sub-agents can run these groups concurrently on execution:
- **Group A (backend-only):** T1, T4, T8a (migration), T8e
- **Group B (admin UI only):** T2, T5 — blocked on A for T5 (needs T4 endpoint)
- **Group C (leadgen tool only):** T8b (client), T8c (client), T7 (client portion)
- **Group D (cross-cutting):** T3, T6 — sequential, must run after A completes

Recommended serialization: A → (B ∥ D) → C → T8d (consumes everything)

## Done

- [ ] `npx tsc --noEmit` — zero errors in backend, admin frontend, leadgen tool
- [ ] Migration runs on dev DB without error; rollback tested
- [ ] Funnel shows cumulative counts (seed test: 3 sessions at different stages → each earlier stage = sum of later stages)
- [ ] "Photos Sub-stage (legacy)" no longer rendered in the funnel
- [ ] Per-row delete works from admin submissions table (confirm modal, row disappears, events cascade)
- [ ] Detail drawer delete works + closes drawer
- [ ] Signup with matching email → `account_created` event fires → funnel count increments
- [ ] Signup via leadgen CTA with `?ls=uuid` → session linked by id even if email differs
- [ ] Session detail drawer shows: UA parsed fields, UTM block, CTA timeline events
- [ ] Admin stats strip shows total/conversions/rate/median time-to-convert
- [ ] Completed sessions closing the tab no longer get stamped `abandoned`
- [ ] CHANGELOG entry written with consent-boundary note from the Pushback section
- [ ] No regression: existing submissions list, filters, CSV export still work
- [ ] Old leadgen-tool tabs (cached builds) still ingest events without crashing (backwards-compatible tracking contract)
