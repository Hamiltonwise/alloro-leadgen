# Leadgen "Email Me When Ready" FAB

## Why
Audits today are mostly fast (~30-90s) but a meaningful fraction of users get impatient or hit a hang/error before the report renders. Every one of those is a lost lead. We want a low-pressure escape hatch — a tiny floating button that appears at 1:20 elapsed (or instantly on confirmed error) saying *"Don't want to wait around? Drop your email."* — so the user can bail with their email captured. When the backend audit finishes, we email them the report (same template as the paywall email). They become a tracked lead in the funnel even if they never came back to the tab.

## What
A bottom-center floating button on the audit page that:
1. Appears 1:20 (80s) after `audit_started`, on mobile and desktop.
2. Appears immediately when the audit hits a confirmed error state (replaces the existing shaking error modal).
3. Suppresses entirely if the audit completes inside 1:20 (the user got their report — no escape hatch needed).
4. Hides once the report renders or the user reaches the dashboard, whichever comes first.
5. On click, expands to an email input + submit. On submit, posts to a new public tracking endpoint that enqueues the email for backend-driven send-on-complete AND records server-authoritative funnel events (`email_gate_shown` + `email_submitted`).
6. After submit, **also auto-shows the full report when the audit completes** (we have their email, paywall is satisfied — no reason to gate them).
7. Backend audit worker, on completion, drains the notify queue for that audit and fires the existing n8n email-report webhook for each entry. Marks queue rows as `sent` / `failed`.

## Context

### Relevant files — backend (`/Users/rustinedave/Desktop/alloro`)
- `src/controllers/leadgen-tracking/LeadgenTrackingController.ts` — already houses `recordEvent`/`recordBeacon`/`upsertSession`. New `submitEmailNotify` handler lives here.
- `src/routes/leadgenTracking.ts` — register `POST /email-notify` here.
- `src/workers/processors/auditLeadgen.processor.ts` — the completion block (`realtime_status: 5`, `status: "completed"`) gets a new hook that drains the notify queue.
- `src/controllers/leadgen-tracking/feature-services/service.audit-milestone-events.ts` — reference for the idempotent server-side event-write pattern.
- `src/models/LeadgenSessionModel.ts` — for `FinalStage` / `STAGE_ORDER` / `isLaterStage` reuse.
- `src/database/connection.ts` — knex handle import path.

### Relevant files — leadgen tool (`/Users/rustinedave/Desktop/alloro-leadgen-tool`)
- `App.tsx` — owns the audit polling + `auditStarted` timestamp + error-state surface. New FAB mounts here so it has access to all three.
- `src/lib/tracking.ts` — add `submitEmailNotify(email)` helper that POSTs to `/leadgen/email-notify`. Also exports `getSessionId()` already.
- `src/components/EmailPaywallOverlay.tsx` — closest analog for the email-input UX. New FAB matches its validation + post-submit confirmation pattern.
- existing error modal — find via grep for "shake" / `motion.div` with shake animation. Replace its trigger to mount the FAB pre-expanded with error copy instead.
- `utils/emailService.ts` — existing client-side n8n send (`VITE_N8N_EMAIL_URL`). The notify worker needs the same URL on the backend; introduce `N8N_EMAIL_URL` env var.

### Patterns to follow
- **New backend service:** match `service.audit-milestone-events.ts` — fire-and-forget logging, idempotent inserts, no exceptions to caller.
- **New backend route:** match the existing pattern in `leadgenTracking.ts` — `requireTrackingKey` middleware, rate-limited.
- **New FAB component:** structure like `EmailPaywallOverlay.tsx` — same email validation, post-submit confirmation pulse.
- **Migration timestamp:** `20260417000000` so it lands after the existing `20260416000000_leadgen_tracking_overhaul`.

### Reference file
- For the FAB component shape/animation: `EmailPaywallOverlay.tsx` (same product, same brand colors, same submit pattern).
- For the queue table: `leadgen_events` migration `20260415000002` (style: knex schema builder, indexes, FK with `ON DELETE CASCADE`).
- For server-driven n8n email send from worker: there is no current reference — this is new; see Risk #4.

## Constraints

### Must
- FAB must be invisible to anyone whose audit completes before 1:20. Zero render, not just hidden — to avoid layout flash.
- FAB submit must be idempotent on the backend: same `(session_id, audit_id)` cannot enqueue twice (latest email wins or first wins — see T2 decision below).
- The notify queue drain must fire fire-and-forget from the worker — never block the audit completion or fail the job.
- All public-facing endpoints must keep the existing `X-Leadgen-Key` gate.
- Reuse existing n8n email template (same as paywall submit) — no new email template work in this plan.
- Hide the FAB the moment the user reaches the dashboard, even if the FAB hasn't been submitted (they got what they came for via the in-tab path).

### Must not
- Don't introduce a new email template, template engine, or transactional email service. Reuse n8n.
- Don't add `react-router-dom` to control FAB display — pure conditional render based on App.tsx state.
- Don't create a new tracking key or auth pattern.
- Don't modify `EmailPaywallOverlay.tsx` behavior (it stays as the primary in-tab email gate).
- Don't auto-fire `results_viewed` / `report_engaged_1min` / `account_created` from this flow — they must remain "user actually engaged" signals.

### Out of scope
- Email content redesign, A/B copy testing.
- A retry queue / cron for failed n8n sends. v1 logs `status='failed'` and admin sees the failure; manual re-send is a future plan.
- SMS / push notifications.
- Unsubscribe link in the email (n8n template owns email body).
- Click-tracking on the email link (already covered by audit_id URL param into the existing report viewer).

## Risk

**Level:** 2 (Concern — new public endpoint + new server-driven email path, both with low blast radius if done carefully)

### Risks identified

1. **Notify queue races completion** — user submits FAB the same moment audit completes. The completion-side drain may run before the FAB row inserts.
   **Mitigation:** the FAB submit endpoint also checks "is audit already complete? if so, send immediately and mark sent in one shot" — closes the race deterministically. Otherwise drain handles it.

2. **Same session, multiple FAB submits with different emails** — user types `a@b.com`, then `c@d.com`.
   **Mitigation:** unique constraint on `(session_id, audit_id)` with INSERT … ON CONFLICT UPDATE — latest email wins. Pre-existing `sent` row is NOT overwritten.

3. **n8n webhook failure during drain** — n8n is down / 5xx.
   **Mitigation:** mark queue row `status='failed'`, `last_error=<msg>`, `attempt_count++`. Worker logs but doesn't throw. Manual replay possible via direct DB query. Future: cron retry.

4. **Backend has no n8n send analog today** — `sendAuditReportEmail` lives in the leadgen-tool client. The webhook URL needs to be reachable from the backend AND the request shape needs to match.
   **Mitigation:** introduce `N8N_EMAIL_URL` env var on backend, write a thin `service.n8n-email-sender.ts` that POSTs the same body shape the client sends. Verify by reading `utils/emailService.ts` first to confirm the contract.

5. **FAB visible while user is mid-typing in EmailPaywallOverlay** — the paywall and FAB could overlap visually, both asking for an email.
   **Mitigation:** suppress FAB whenever the dashboard stage is active (which is when EmailPaywallOverlay mounts). The `hide on dashboard stage` rule covers this.

6. **`email_gate_shown` event firing twice** — once from EmailPaywallOverlay mount, once from FAB display. Both use the same event name.
   **Mitigation:** acceptable. The event is "the user saw an email gate" — true in both cases. Funnel uses MAX-ordinal so duplicates don't double-count.

### Blast radius
- Backend: new endpoint, new migration, one new hook in the audit worker. No existing endpoints changed.
- Leadgen tool: one new component, one App.tsx mount-point, one tracking helper, one error-modal replacement.
- DB: one new table. No existing table touched.

### Pushback
- Worth flagging: this plan introduces a backend-side send path that bypasses the client's existing n8n call. From now on there are TWO places that send the audit report email — the client (paywall) and the backend (FAB queue drain). If you ever change the email template or the n8n webhook contract, you have to update both. Acceptable for now (n8n is the template owner, both paths just hit the webhook), but worth a follow-up to consolidate sending behind the backend exclusively.

## Tasks

### T1: Migration — `leadgen_email_notifications` table
**Do:** New migration `20260417000000_create_leadgen_email_notifications.ts`. Schema:
```
id              UUID PRIMARY KEY
session_id      UUID NOT NULL REFERENCES leadgen_sessions(id) ON DELETE CASCADE
audit_id        UUID NOT NULL REFERENCES audit_processes(id)  ON DELETE CASCADE
email           TEXT NOT NULL
status          VARCHAR(16) NOT NULL DEFAULT 'pending'   -- pending | sent | failed
attempt_count   INTEGER NOT NULL DEFAULT 0
last_error      TEXT NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
sent_at         TIMESTAMPTZ NULL
```
Indexes: `UNIQUE (session_id, audit_id)`, `(audit_id, status)` for the worker drain query, `(status, created_at)` for admin lookups.
**Files:** `src/database/migrations/20260417000000_create_leadgen_email_notifications.ts`, plus the three scaffold copies in `plans/.../migrations/` (knex/pgsql/mssql) — see this plan's `migrations/` folder.
**Depends on:** none
**Verify:** `npx knex migrate:latest` runs cleanly. Rollback (`npx knex migrate:rollback`) drops the table.

---

### T2: Backend service — `service.email-notification-queue.ts`
**Do:** New service module with two exported functions:
- `enqueueEmailNotification({ session_id, audit_id, email })` — UPSERT on `(session_id, audit_id)`. If the audit is already complete (status='completed' on `audit_processes`), call `sendNotificationEmail` synchronously inside this function and mark `status='sent'` in one transaction. Otherwise leave `status='pending'`.
- `drainNotificationsForAudit(audit_id)` — called by the worker on completion. Selects all `pending` rows for this audit, fires `sendNotificationEmail` for each, marks `sent`/`failed` accordingly. Logs but never throws.

Internal helper `sendNotificationEmail({ email, audit_id, businessName })` — POSTs to `process.env.N8N_EMAIL_URL` with the same body shape the client uses (read `alloro-leadgen-tool/utils/emailService.ts` to confirm the exact shape). Returns `{ ok: boolean, error?: string }`.
**Files:** new `src/controllers/leadgen-tracking/feature-services/service.email-notification-queue.ts`, new `src/controllers/leadgen-tracking/feature-services/service.n8n-email-sender.ts` (the thin POSTer).
**Depends on:** T1
**Verify:** unit-trace by hand: enqueue with audit not-yet-complete → row inserted as pending. Run `drainNotificationsForAudit` → row flips to sent (or failed if n8n misbehaves).

---

### T3: Backend route — `POST /api/leadgen/email-notify`
**Do:** New handler `submitEmailNotify` in `LeadgenTrackingController.ts`. Validates `{ session_id, audit_id, email }`:
- session_id matches UUID_REGEX
- audit_id matches UUID_REGEX
- email matches a basic email regex (reuse whatever existing controllers use)

On success:
1. Call `enqueueEmailNotification(...)`.
2. Patch `leadgen_sessions` to set `email = <email>` (write-once via the existing `buildSessionPatch` helper).
3. Server-authoritatively write `email_gate_shown` AND `email_submitted` events to `leadgen_events` (idempotent per `(session_id, event_name)`, via the existing pattern in `service.audit-milestone-events.ts`). Also promote `final_stage` via `isLaterStage`.

Register route in `src/routes/leadgenTracking.ts` as `POST /email-notify` behind `requireTrackingKey` (NOT the silent variant — we want a real 401 if the key is wrong, since this is fetch not beacon).
**Files:** `src/controllers/leadgen-tracking/LeadgenTrackingController.ts`, `src/routes/leadgenTracking.ts`
**Depends on:** T2
**Verify:** `curl -X POST /api/leadgen/email-notify` with key + valid body → 200 `{ ok: true }`. Without key → 401. Re-submit same body → 200 (idempotent, no duplicate row).

---

### T4: Audit worker hook — drain on completion
**Do:** In `auditLeadgen.processor.ts`, immediately after the existing completion block (`updateAuditFields({ realtime_status: 5, status: "completed" })` + the milestone calls), add:
```ts
await drainNotificationsForAudit(auditId);
```
Wrapped in try/catch so a notification failure never bubbles up.

Also: do this on the **error / failed** branch too (the `catch` block that sets `status='failed'` and `error_message`). On audit failure, the queued users should still get an email — but with a "we hit an issue, here's a manual retry link" body. **For v1**, send the same report-email and let the report viewer surface the failure state. (Cleaner failure-specific email is a follow-up.)
**Files:** `src/workers/processors/auditLeadgen.processor.ts`
**Depends on:** T2
**Verify:** kick off an audit, queue an email mid-flight via curl, let the audit complete → queue row flips to `sent`. Tail logs for the n8n call.

---

### T5: Frontend tracking helper — `submitEmailNotify`
**Do:** Add to `src/lib/tracking.ts`:
```ts
export async function submitEmailNotify(opts: {
  email: string;
  auditId: string;
}): Promise<{ ok: boolean }>
```
Posts to `/leadgen/email-notify` with `session_id` from `getSessionId()`. Returns `{ok: true}` on 2xx, `{ok: false}` on any failure (silent — never throws). Awaitable so the FAB can show the post-submit confirmation pulse.
**Files:** `/Users/rustinedave/Desktop/alloro-leadgen-tool/src/lib/tracking.ts`
**Depends on:** T3 (endpoint must exist for testing)
**Verify:** `npx tsc --noEmit` passes. Smoke from devtools console: `await submitEmailNotify({email:'x@y.z', auditId:'<real-id>'})` → `{ok: true}`.

---

### T6: New FAB component — `EmailNotifyFab.tsx`
**Do:** New `src/components/EmailNotifyFab.tsx`. Props:
```ts
{
  visible: boolean;
  variant: "wait" | "error";   // "wait" = patient copy, "error" = high-traffic copy
  auditId: string | null;
  onSubmitted: () => void;     // parent closes the FAB / unmounts the error modal
}
```

States:
- **Collapsed (default on first show):** small pill, bottom-center, fixed positioning. Pulse once on first appearance to draw the eye, then settle. Icon (mail) + label "Email me when ready". Tap/click expands.
- **Expanded:** card grows to show the message ("Don't want to wait around? Drop your email." for `wait`, "Heavier traffic than usual — pop in your email and we'll deliver when it's done." for `error`) + email input + Submit button + small × to collapse.
- **Submitting:** button shows spinner.
- **Success:** green check, "Got it — we'll email you when it's ready." Auto-collapse after 2.5s, then call `onSubmitted`.
- **Failure:** red note "Couldn't save — try once more?" Stays expanded.

Match `EmailPaywallOverlay`'s visual language (brand colors, rounded-2xl, soft shadow). Mobile + desktop responsive — same component, no separate breakpoint files.

Animation: framer-motion entry from below (`y: 80, opacity: 0` → `y: 0, opacity: 1`).
**Files:** new `/Users/rustinedave/Desktop/alloro-leadgen-tool/src/components/EmailNotifyFab.tsx`
**Depends on:** T5
**Verify:** mount in Storybook-style by hand if needed; primary verification is via T7 + T8 wire-up.

---

### T7: App.tsx wire-up — timer + visibility logic
**Do:** In `App.tsx`:
- Capture `auditStartedAt: number | null` when `audit_started` event fires.
- New state: `fabVisible: boolean`, `fabVariant: "wait" | "error"`.
- Effect: when `auditStartedAt` is set AND audit is not yet complete, set a `setTimeout` for 80,000ms (1:20). On fire, set `fabVisible=true`, `fabVariant="wait"`. Clear the timeout if audit completes first (FAB never shows in that case) or on unmount.
- Effect: when audit polling reports `status='failed'`, set `fabVisible=true`, `fabVariant="error"` immediately (skip the timer). Also: SUPPRESS the existing shaking error modal — render the FAB INSTEAD.
- Effect: when stage transitions to `dashboard` (report rendered), set `fabVisible=false` and clear timer.
- After FAB `onSubmitted`: keep `fabVisible=false` AND set a flag `paywallSatisfied=true`. When the audit completes, route the user directly to the dashboard skipping the paywall (since we already have their email — see T8).
- Mount `<EmailNotifyFab visible={fabVisible} variant={fabVariant} auditId={auditId} onSubmitted={...} />` near the bottom of the audit flow JSX.
**Files:** `/Users/rustinedave/Desktop/alloro-leadgen-tool/App.tsx`
**Depends on:** T6
**Verify:** manual — start an audit, wait 1:20 → FAB appears. Submit → confirmation. Continue waiting → audit completes → dashboard renders with no paywall gate.

---

### T8: Paywall bypass when FAB submitted
**Do:** When `paywallSatisfied=true` (set by T7), the `EmailPaywallOverlay` should not mount on the dashboard. The user has already given us their email — gating again is hostile UX.

Find where `EmailPaywallOverlay` mounts (likely in `DashboardStage.tsx` or App.tsx around the dashboard render). Add a guard `if (paywallSatisfied) return null` (or pass `paywallSatisfied` down as a prop and check there).

Also: wire the email value through so any downstream code that needs it (e.g. `onEmailSubmitted` callback that updates URL or DB) can fire identically to a paywall submit. Look at what `onEmailSubmitted()` does in `DashboardStage.tsx` and replicate the side effects after FAB success.
**Files:** `/Users/rustinedave/Desktop/alloro-leadgen-tool/App.tsx`, `/Users/rustinedave/Desktop/alloro-leadgen-tool/src/components/stages/DashboardStage.tsx`
**Depends on:** T7
**Verify:** submit FAB at 1:30 mark → wait for audit → dashboard shows full report immediately, no paywall.

---

### T9: Error modal replacement
**Do:** Find the existing shaking error modal (grep for `shake` / `animate-shake` / error state in App.tsx or stage components). Identify where it gets rendered when `auditStatus === 'failed'`. Replace that render with a no-op (or just remove). The error is now surfaced exclusively through the FAB in `error` variant (T7 already wires this).

Keep the shake animation file/CSS in place — it might be reused elsewhere — just stop using it for the audit-failure case.
**Files:** wherever the error modal is currently rendered (TBD via grep — likely `App.tsx` or a `<ErrorState>` component)
**Depends on:** T7
**Verify:** simulate an audit failure (kill the worker job mid-run, or temporarily throw in the processor). Frontend → no shaking modal, instead the FAB appears in error mode with the high-traffic copy. Submit → email queued.

---

### T10: Backend env var — `N8N_EMAIL_URL`
**Do:** Add `N8N_EMAIL_URL` to `alloro/.env`, `.env.sandbox` (matching value to leadgen-tool's `VITE_N8N_EMAIL_URL`). Document in commit message that the same secret in GitHub Actions / prod env needs setting.
**Files:** `/Users/rustinedave/Desktop/alloro/.env`, `/Users/rustinedave/Desktop/alloro/.env.sandbox`
**Depends on:** T2 (the service that consumes it)
**Verify:** `grep N8N_EMAIL_URL .env` returns the line. Backend boot doesn't crash when the var is set.

---

## Done

- [ ] `npx knex migrate:latest` runs cleanly on dev DB; rollback verified
- [ ] `npx tsc --noEmit` — zero errors in backend, leadgen tool
- [ ] Curl probe: `POST /api/leadgen/email-notify` 200 with key, 401 without, idempotent on re-submit
- [ ] FAB does NOT appear when audit completes inside 1:20
- [ ] FAB appears at 1:20 mark on slow audit; submit captures email, queues row
- [ ] FAB appears immediately on audit failure with `error` copy
- [ ] After FAB submit, dashboard renders without the paywall once audit completes
- [ ] Audit completion drains the queue and fires n8n email; row flips to `status='sent'`
- [ ] Audit failure also drains the queue (gets the same report email); row flips to `status='sent'`
- [ ] n8n send failure marks row `status='failed'` with `last_error` populated
- [ ] Admin submissions table reflects FAB-driven submissions: `email_gate_shown` and `email_submitted` events present in the timeline; final_stage advanced to `email_submitted`; email column populated
- [ ] `results_viewed`, `report_engaged_1min`, `account_created` are NOT auto-fired by this flow
- [ ] CHANGELOG entry written
- [ ] No regression on the existing EmailPaywallOverlay flow
- [ ] CORS preflight on the new endpoint succeeds from `localhost:3002` and `audit.getalloro.com`
