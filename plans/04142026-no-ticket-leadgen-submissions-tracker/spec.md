# Leadgen Submissions Tracker + Admin UI

## Why
The leadgen tool currently has zero visibility into who lands on it, where users drop off, or which submissions became leads. Sales and product both need a single place to see lead captures with the full audit context, and marketing needs funnel drop-off data to tune the top of funnel. Today this is a black box — emails from the paywall are only archived via n8n email notifications with no queryable record.

## What
Add anonymous session + event tracking to the leadgen tool frontend, persisted in `signalsai-backend`, and a new admin UI tab at `/admin/leadgen-submissions` that shows:
1. Paginated submissions list (email + domain + audit status + timestamp + final funnel stage)
2. Per-submission detail drawer with full audit result + chronological event timeline
3. Funnel chart with drop-off counts at each stage
4. CSV export

Done when: anyone landing on the leadgen tool creates a session row on the backend, every stage transition fires an event, the email paywall binds an email to the session, and the admin sees all submissions + drop-off metrics via the new sidebar entry.

## Context

**Relevant files (signalsai-backend):**
- `src/routes/` — route registration pattern (each domain gets its own file, mounted in `src/index.ts`)
- `src/controllers/` — pattern is `{domain}/{Domain}Controller.ts` + `{domain}/feature-services/` + `{domain}/feature-utils/`
- `src/models/BaseModel.ts` — base model pattern (see `AuditProcessModel.ts`)
- `src/database/migrations/` — migration files use timestamp prefix `YYYYMMDDHHMMSS_description.ts`
- `src/middleware/` — auth patterns (`authMiddleware`, `scraperAuth`)
- Existing admin controllers for pattern: `src/controllers/admin-websites/`, `src/controllers/admin-settings/`

**Relevant files (leadgen tool — this repo):**
- `src/App.tsx` — entry, stage transitions live here (see lines 71, 209, 249 where `/audit/start` is called)
- `src/pages/AuditToolPage.tsx` — main tool page
- `src/contexts/AuditContext.tsx` — audit state provider; natural place to wire stage tracking
- `src/components/stages/*.tsx` — stage components; each needs a `stage_viewed` fire on mount
- `src/components/EmailPaywallOverlay.tsx` — email capture; submit path wires `email_submitted`
- `src/components/stages/InputStage.tsx` — domain/practice input; needs `input_started` + `input_submitted`
- `src/components/stages/DashboardStage.tsx` — final stage; fires `results_viewed`
- `utils/config.ts` — `API_BASE_URL`; tracking endpoints hit same backend
- `utils/emailService.ts` — existing n8n email path; keep, do not replace

**Relevant files (admin frontend — signalsai):**
- `src/components/Admin/AdminSidebar.tsx` — `AdminNavKey` union + grouped nav; new entry `leadgen-submissions` in a new `LEADGEN_ITEMS` group
- `src/App.tsx` — admin route registration
- `src/pages/admin/` — where new `LeadgenSubmissions.tsx` page lives
- `src/api/` — API client modules (per-domain files like `menus.ts`)
- `src/components/Admin/AdminLayout.tsx` — page chrome wrapper

**Patterns to follow:**
- Backend route: `src/routes/leadgenTracking.ts` + `src/routes/admin/leadgenSubmissions.ts` (admin split convention already exists)
- Backend controller: `src/controllers/leadgen-tracking/LeadgenTrackingController.ts` (public-facing) + `src/controllers/admin-leadgen/AdminLeadgenController.ts` (admin-gated)
- Admin page analog: `src/pages/admin/WebsiteDetail.tsx` — list → detail drawer pattern
- API client analog: `src/api/menus.ts` — axios-based, typed
- Event tracking pattern on frontend: Rybbit already loaded — we add our OWN session/event endpoint on top, do not replace Rybbit

**Reference files:**
- Backend controller analog: `src/controllers/admin-websites/AdminWebsitesController.ts` — list/detail/paginate pattern
- Migration analog: `src/database/migrations/20260209000002_create_pages_table.ts` — create + index pattern
- Admin page analog: `src/pages/admin/WebsiteDetail.tsx` — tabs, detail view, data fetching
- Sidebar nav extension analog: `AdminSidebar.tsx:46` — grouped nav items (`AGENTS_GROUP_ITEMS`, `DONE_FOR_YOU_ITEMS`)

## Constraints

**Must:**
- Sessions unique by `session_id` (uuid v4) generated on first landing, stored in `sessionStorage`
- Events tied to `session_id`; `audit_id` joins later once `POST /audit/start` returns
- Email capture sets `email` on the session row (one email per session)
- Public tracking endpoints use rate limiting + a lightweight `X-Leadgen-Key` header check (not full auth); never expose PII on GET
- Admin endpoints use existing admin auth middleware (same as `admin-websites`)
- Abandonment detection: `sendBeacon()` on `beforeunload` fires `abandoned` event if `final_stage < results_viewed`
- Stage names enumerated server-side; client sends enum values, server validates
- CSV export streams (do not buffer >10k rows in memory)
- All frontend event calls fire-and-forget — failures never block the user UX

**Must not:**
- Replace Rybbit or forward events to Rybbit (separate systems)
- Store full audit JSON on the session row (join to `audit_processes` via `audit_id`)
- Block user interaction on tracking failures
- Add new auth tiers; reuse existing `adminAuth`
- Capture IP or fingerprint raw (use a one-way hash at most, and only if needed; default: none)
- Touch Plan A (n8n migration) files — this plan works against the current n8n-backed audit AND the future native backend audit identically

**Out of scope:**
- Realtime push (SSE/WebSocket) for admin — polling is fine for v1
- Cohort analysis, A/B test tracking, attribution modeling
- Email drip / CRM sync (the submissions table is the record; export handles downstream use)
- Deleting or GDPR-purging leads (future work)
- Visual funnel beyond a simple stage-count bar chart
- Retroactively backfilling past audits — tracking starts at deploy time

## Risk

**Level: 2 — Concern**

**Risks identified:**
- **Event storm on the public endpoint.** An unauthenticated tracking endpoint is a DoS target. → **Mitigation:** express-rate-limit middleware at 60 req/min per IP for tracking routes; `X-Leadgen-Key` header (shared secret in leadgen tool env) gates legitimate traffic; bad events dropped silently (no error response to leak schema).
- **Abandonment false positives.** `sendBeacon` fires on tab close AND on navigation within the audit flow. Overcounting abandonments. → **Mitigation:** only fire `abandoned` if `final_stage !== "results_viewed"` AND session `last_seen_at` is >30s old; additionally dedupe on the server (never downgrade a session that already has `completed=true`).
- **PII handling.** Email is PII. Storing `practice_search_string` + email pairs is targetable. → **Mitigation:** admin endpoints behind auth; no GET endpoint returns email without auth; encrypt-at-rest is DB-level concern out of scope here; document retention policy in NOTES.md (recommend 12 months).
- **Cross-repo coordination.** Plan B spans three repos (leadgen-tool, signalsai-backend, signalsai admin). Breakage on any one leaves the others half-working. → **Mitigation:** backend ships first (endpoints + admin page with empty state); frontend beacon wiring ships second; admin goes live when backend + beacons are deployed. Each repo works independently (admin page gracefully empty while waiting for events).
- **Rybbit overlap.** Rybbit is already tracking analytics. We're adding a second system. → **Mitigation:** documented intent — Rybbit for anonymous behavioral analytics across all Alloro sites; this system specifically for leadgen lead-captures tied to `audit_id`. Non-overlap acceptable; admin only cares about lead context.

**Blast radius:**
- `audit_processes` table — read-only join from new controller (no writes)
- `AdminSidebar.tsx` — readers: everyone who sees admin sidebar; change is additive (new nav item only, no removed/renamed keys)
- Leadgen tool stage components — additive instrumentation only; no behavior change
- Backend `src/index.ts` — new route mounts; no changes to existing mounts

**Pushback:**
- "Realtime updates in admin" would be nice but not worth SSE complexity for v1. Polling every 30s is fine; document as explicit simplicity win.
- Logging the raw `referrer` + `utm_*` params is harmless and useful; capturing full user-agent is optional. Skip unless asked.

## Tasks

### T1: DB migrations — `leadgen_sessions` + `leadgen_events`
**Do:** Create `src/database/migrations/{timestamp}_create_leadgen_sessions.ts` and `{timestamp}_create_leadgen_events.ts`:

- `leadgen_sessions`: `id` (uuid PK), `audit_id` (string nullable, FK → audit_processes.id), `email` (text nullable), `domain` (text nullable), `practice_search_string` (text nullable), `referrer` (text nullable), `utm_source/medium/campaign/term/content` (text nullable), `final_stage` (varchar(48)), `completed` (boolean default false), `abandoned` (boolean default false), `first_seen_at` (timestamptz), `last_seen_at` (timestamptz), `created_at`, `updated_at`. Index on `audit_id`, `email`, `created_at DESC`.
- `leadgen_events`: `id` (uuid PK), `session_id` (uuid FK → leadgen_sessions.id ON DELETE CASCADE), `event_name` (varchar(48)), `event_data` (jsonb nullable), `created_at` (timestamptz). Index on `session_id`, `(session_id, created_at)`.

**Files:** `src/database/migrations/{timestamp}_create_leadgen_sessions.ts`, `src/database/migrations/{timestamp}_create_leadgen_events.ts` — scaffolded in `migrations/` folder alongside this spec
**Depends on:** none
**Verify:** `npm run migrate` succeeds; `npm run migrate:rollback` cleanly reverses.

### T2: Models — `LeadgenSessionModel` + `LeadgenEventModel`
**Do:** Two model files following `BaseModel` pattern. `LeadgenSessionModel` with typed `ILeadgenSession` interface (all columns, `FinalStage` enum type for `final_stage`). `LeadgenEventModel` with typed `ILeadgenEvent` + `LeadgenEventName` union.

**Enum values** (both `FinalStage` and `LeadgenEventName` share the stage names):
`landed`, `input_started`, `input_submitted`, `audit_started`, `stage_viewed_1`, `stage_viewed_2`, `stage_viewed_3`, `stage_viewed_4`, `stage_viewed_5`, `email_gate_shown`, `email_submitted`, `results_viewed`, `abandoned`.

**Files:** `src/models/LeadgenSessionModel.ts`, `src/models/LeadgenEventModel.ts`
**Depends on:** T1
**Verify:** `npx tsc --noEmit` — zero errors; basic `.findById()` / `.insert()` resolve.

### T3: Public tracking controller + routes
**Do:** Create `src/controllers/leadgen-tracking/LeadgenTrackingController.ts` with three handlers:
- `POST /leadgen/session` — body `{ session_id, referrer?, utm_* }`; upserts a session row (insert if new, update `last_seen_at` if exists); returns `{ ok: true }`.
- `POST /leadgen/event` — body `{ session_id, event_name, event_data?, audit_id?, email?, domain?, practice_search_string? }`; validates event_name against enum; inserts event row; patches session fields if provided (email, audit_id, domain, etc.); updates `final_stage` IF the new event is later in the funnel order (never downgrade); sets `completed=true` when event is `results_viewed`; sets `abandoned=true` when event is `abandoned`.
- `POST /leadgen/beacon` — same as `/event` but accepts `navigator.sendBeacon` content-type (`text/plain` with JSON body); always returns 204.

Add `src/routes/leadgenTracking.ts` mounting all three; wire `express-rate-limit` (60 req/min per IP); require `X-Leadgen-Key` header matching `LEADGEN_TRACKING_KEY` env (added fresh). Mount in `src/index.ts` under `/api/leadgen`.

**Files:** `src/controllers/leadgen-tracking/LeadgenTrackingController.ts`, `src/controllers/leadgen-tracking/feature-utils/util.event-ordering.ts`, `src/routes/leadgenTracking.ts`, `src/index.ts` (mount line only)
**Depends on:** T2
**Verify:** `curl -X POST /api/leadgen/session` with valid header creates row; repeat call updates `last_seen_at`; invalid event_name returns 400.

### T4: Admin leadgen controller + routes
**Do:** Create `src/controllers/admin-leadgen/AdminLeadgenController.ts` with four handlers:
- `GET /admin/leadgen-submissions` — paginated list. Query: `?page=1&pageSize=25&search=&status=all|completed|abandoned&from=&to=&hasEmail=`. Returns `{ items: Array<SubmissionSummary>, total, page, pageSize }`. Each `SubmissionSummary` = session row + joined `audit_processes.status` (if `audit_id` present).
- `GET /admin/leadgen-submissions/:id` — full detail. Returns session + all events ordered by `created_at ASC` + full `audit_processes` row (if linked).
- `GET /admin/leadgen-submissions/funnel` — stage counts. Returns `{ stages: Array<{ name: string, count: number, drop_off_pct: number }> }` computed from `leadgen_sessions.final_stage` aggregate.
- `GET /admin/leadgen-submissions/export` — streams CSV of all sessions matching query filters; columns: `session_id, email, domain, practice_search_string, audit_id, final_stage, completed, abandoned, first_seen_at, last_seen_at`.

All behind existing `adminAuth` middleware.

**Files:** `src/controllers/admin-leadgen/AdminLeadgenController.ts`, `src/controllers/admin-leadgen/feature-services/service.funnel-aggregator.ts`, `src/controllers/admin-leadgen/feature-services/service.csv-exporter.ts`, `src/routes/admin/leadgenSubmissions.ts`, `src/index.ts` (mount line only)
**Depends on:** T2
**Verify:** All 4 endpoints respond with correct shape; 401 without admin token; pagination works; CSV downloads.

### T5: Leadgen tool — tracking client
**Do:** Create `src/lib/tracking.ts` in the leadgen-tool repo:
- `ensureSession()` — reads/creates `session_id` in `sessionStorage`; on first call POSTs `/leadgen/session` with referrer + utm params parsed from `window.location.search`.
- `trackEvent(name, data?)` — POSTs `/leadgen/event`; fire-and-forget (no await); silent on failure.
- `trackBeacon(name, data?)` — uses `navigator.sendBeacon` to `/leadgen/beacon`; for `beforeunload`.
- `bindAbandonmentBeacon()` — `window.addEventListener("beforeunload", () => trackBeacon("abandoned", {final_stage: currentStage}))`; hooked once on app mount.
- Include the `X-Leadgen-Key` header (from `VITE_LEADGEN_TRACKING_KEY` env) on all calls.

**Files:** `src/lib/tracking.ts`, `.env.example` entry, `src/main.tsx` (bind beacon on mount)
**Depends on:** T3 (endpoints must exist for client to call; can be scaffolded with stub endpoints earlier)
**Verify:** Open leadgen tool in dev, check Network tab — `/leadgen/session` fires on load; session row appears in DB.

### T6: Leadgen tool — wire events into stages
**Do:** Add `trackEvent` calls at each funnel point:
- `src/pages/AuditToolPage.tsx` or `src/contexts/AuditContext.tsx` — on mount: `trackEvent("landed")`
- `src/components/stages/InputStage.tsx` — on first focus of domain input: `trackEvent("input_started")`; on submit: `trackEvent("input_submitted", {domain, practice_search_string})`
- `App.tsx` `startAudit` — after `/audit/start` returns `audit_id`: `trackEvent("audit_started", {audit_id, domain, practice_search_string})`
- Each of `WebsiteScanStage`, `GBPAnalysisStage`, `CompetitorMapStage`, `PhotosAnalysisSubStage`, `DashboardStage` — on first mount: `trackEvent("stage_viewed_{N}")` with corresponding N. Track current stage in AuditContext for abandonment beacon payload.
- `EmailPaywallOverlay.tsx` — on mount: `trackEvent("email_gate_shown")`; on successful submit: `trackEvent("email_submitted", {email})`
- `DashboardStage.tsx` — after full render of results: `trackEvent("results_viewed")`

**Files:** `src/pages/AuditToolPage.tsx`, `src/contexts/AuditContext.tsx`, `src/components/stages/InputStage.tsx`, `App.tsx`, `src/components/stages/WebsiteScanStage.tsx`, `src/components/stages/GBPAnalysisStage.tsx`, `src/components/stages/CompetitorMapStage.tsx`, `src/components/stages/PhotosAnalysisSubStage.tsx`, `src/components/stages/DashboardStage.tsx`, `src/components/EmailPaywallOverlay.tsx`
**Depends on:** T5
**Verify:** Manual run — all 13 events appear in DB in correct order when completing a full audit; `final_stage` progresses correctly; abandoning mid-flow fires `abandoned`.

### T7: Admin UI — sidebar entry + routing
**Do:**
- Extend `AdminNavKey` union in `src/components/Admin/AdminSidebar.tsx` with `leadgen-submissions`.
- Add new group `LEADGEN_ITEMS: NavItem[] = [{ key: "leadgen-submissions", label: "Leadgen Submissions", icon: Inbox }]` (icon from lucide-react) with group header "Leadgen" + icon `Users` or similar.
- Render the group in the same pattern as `AGENTS_GROUP_ITEMS` / `DONE_FOR_YOU_ITEMS`.
- Register route in `src/App.tsx` admin routes for `/admin/leadgen-submissions`.

**Files:** `src/components/Admin/AdminSidebar.tsx`, `src/App.tsx`
**Depends on:** none (can be scaffolded early with an empty page)
**Verify:** Sidebar shows new "Leadgen Submissions" entry; clicking navigates to `/admin/leadgen-submissions`; active state works.

### T8: Admin UI — API client
**Do:** Create `src/api/leadgenSubmissions.ts` with typed functions:
- `listSubmissions(params)` → `GET /admin/leadgen-submissions`
- `getSubmission(id)` → `GET /admin/leadgen-submissions/:id`
- `getFunnel(params)` → `GET /admin/leadgen-submissions/funnel`
- `exportCsv(params)` → triggers download via `window.location` or blob
All use existing axios instance + auth pattern from `src/api/menus.ts`.

**Files:** `src/api/leadgenSubmissions.ts`, `src/types/leadgen.ts` (shared types mirroring backend contracts)
**Depends on:** T4
**Verify:** `npx tsc --noEmit` clean; manual call from browser console succeeds.

### T9: Admin UI — LeadgenSubmissions page
**Do:** Create `src/pages/admin/LeadgenSubmissions.tsx` with two tabs:

**Tab 1 — Submissions** (default):
- Filters row: search by email/domain, status dropdown (All / Completed / Abandoned / In Progress), date range, "has email" toggle
- Table: email / domain / practice / final_stage / audit status / first_seen / last_seen / actions (view detail)
- Pagination (25 per page default)
- "Export CSV" button that calls `exportCsv(currentFilters)`
- Row click opens detail drawer

**Tab 2 — Funnel**:
- Horizontal bar chart: stage name + count + drop-off % from previous stage
- Respects current date range filter
- Use existing chart library if any (check `package.json`); else plain CSS bars

**Detail drawer** (right-side panel, slides in):
- Top: session summary (email, domain, practice, status, timestamps)
- Middle: event timeline (chronological list with icons per event_name)
- Bottom: full audit result (if `audit_id` present) — render existing audit result shape or a read-only JSON viewer
- Close button + ESC to dismiss

**Files:** `src/pages/admin/LeadgenSubmissions.tsx`, `src/components/admin/LeadgenSubmissionsTable.tsx`, `src/components/admin/LeadgenFunnelChart.tsx`, `src/components/admin/LeadgenSubmissionDetail.tsx`
**Depends on:** T7, T8
**Verify:** Manual — create test sessions, view list, filter, open detail, check timeline, view funnel, export CSV; all work.

## Done

**Backend (signalsai-backend):**
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` — zero errors from this work
- [ ] `npm run migrate` creates both new tables
- [ ] `POST /api/leadgen/session` + `/event` + `/beacon` endpoints respond correctly
- [ ] Admin endpoints (`/admin/leadgen-submissions/*`) behind auth, return correct shapes
- [ ] Rate limiting + `X-Leadgen-Key` enforced on public endpoints
- [ ] CSV export streams and opens cleanly in Excel/Google Sheets

**Leadgen tool (this repo):**
- [ ] `npm run build` passes
- [ ] Session row created on first landing
- [ ] All 13 events fire in correct order during a full audit
- [ ] `abandoned` event fires via `sendBeacon` on tab close before `results_viewed`
- [ ] Tracking failures never break user UX (manual: network tab → offline → tool still works)
- [ ] `.env.example` has `VITE_LEADGEN_TRACKING_KEY`

**Admin UI (signalsai):**
- [ ] `npm run build` passes
- [ ] New sidebar entry "Leadgen Submissions" visible under new "Leadgen" group
- [ ] Submissions tab lists entries with filters + pagination
- [ ] Detail drawer shows session + timeline + linked audit result
- [ ] Funnel tab renders bar chart with drop-off percentages
- [ ] CSV export downloads complete dataset

**End-to-end:**
- [ ] Manual: full user journey → event in DB → visible in admin within 30s
- [ ] No impact on existing admin pages, leadgen tool stages, or audit pipeline
