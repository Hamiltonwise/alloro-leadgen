# Alloro Leadgen Tool Changelog

All notable changes to the Alloro Leadgen Tool are documented here.

## [0.0.4] - April 2026

### Audit — Blocked-State UX + Honest Stage Copy

Two changes paired with backend Audit 0.0.29 to fix the UX for Cloudflare-protected websites and stop the competitor-map stage from lying about what's happening during the post-fan-out tail.

**Key Changes — Blocked-state UI:**
- `AuditStatusResponse` adds `website_blocked?: boolean` matching the new backend column. Optional for forward-compat with older API versions.
- `useAuditPolling.ts` now detects scrape-blocked failures (`error_message` matching `/scrape failed|cannot load page|ERR_BLOCKED/i`) and **keeps polling** until `realtime_status >= 4` instead of stopping at the moment the failure flag is written. Without this, polling stopped at `realtime_status=1` the second the scrape failed and missed the trailing self GBP / competitor branch updates that complete a few seconds later — leaving the UI frozen on "scanning_website".
- `App.tsx` reads `auditData?.website_blocked` and threads it to `DashboardStage` as a new prop.
- `DashboardStage.tsx` adds a third state to three placeholder branches (above-the-fold screenshot card, Website Performance Grade card body, big "Website Performance Metrics" card). When `website_blocked === true`:
  - Screenshot card: amber dashed border + "Site Blocks Scanners" instead of grey "No website".
  - Performance Grade card: amber "Website Blocks Scanners" instead of grey "No website analyzed".
  - Big card: explainer text "Your website blocks Alloro scanners. This site uses bot protection (Cloudflare or similar) which prevents Alloro from analyzing the website's content. Your Google Business Profile report below is unaffected." No CTA to build a new website (user already has one).

**Key Changes — Honest stage copy:**
- `CompetitorMapStage.tsx` info-panel copy rewritten. The old line ("Mapping {N} competitors in your area. Analyzing review volume and market position...") stayed on screen for 50+ seconds after the map was actually populated, while behind the scenes Branch B's website-analysis LLM and the final GBP pillar agents were running. New copy ("Cross-referencing your practice against {N} local competitors. Compiling website & GBP insights...") stays accurate for the entire post-fan-out tail and works in all three website states (full data / blocked / no-website-provided).

**Commits:**
- `App.tsx` — `websiteBlocked` derived from `auditData?.website_blocked`, threaded as prop.
- `src/components/stages/DashboardStage.tsx` — three-way placeholders for screenshot / grade / big-CTA cards.
- `src/components/stages/CompetitorMapStage.tsx` — honest post-load copy.
- `src/hooks/useAuditPolling.ts` — keep polling on scrape-block until `realtime_status >= 4`.
- `src/types/index.ts` — `website_blocked?: boolean` on `AuditStatusResponse`.

## [0.0.3] - April 2026

### Self-Service Audit Retry on the Error FAB

When the audit pipeline fails, users now get a "Try again" button on the
FAB that re-enqueues the SAME audit job (same `audit_id`, session
continuity preserved) rather than leaving them with the email-capture
path as the only option. Capped at 3 retries per audit — the 4th attempt
returns 429 from the backend and the FAB swaps into a terminal
"retry limit reached" state where the email form becomes the sole action.

**Key Changes:**
- **New `retryAudit(auditId)` helper** in `src/lib/tracking.ts` that POSTs
  to the new backend `/api/audit/:auditId/retry` endpoint
  (shared-secret gated via `X-Leadgen-Key`). Returns a discriminated union:
  `{ok: true, retryCount}` on success, `{ok: false, reason}` where reason
  is `"limit_exceeded" | "not_failed" | "not_found" | "network"`.
- **New `audit_retried` event** added to `LeadgenEventName` union and to
  `NON_STAGE_EVENTS` so retries don't interact with the exactly-once
  progression-stage dedup or advance the funnel.
- **`EmailNotifyFab` error variant** renders a primary "Try again" button
  above the email form with `RefreshCw` icon. New props: `onRetry` and
  `retriesExhausted`. When `retriesExhausted=true`, the button disappears,
  the headline swaps to "We've hit our retry limit", and the sub-copy
  shifts to guide the user toward the email form.
- **`App.tsx` wires up `handleFabRetry`** — calls `retryAudit`, flips
  `retriesExhausted` on 429, and on success resets `stage` to
  `scanning_website` with a fresh `auditStartedAt` so the FAB's 1:20 timer
  can re-arm and polling re-engages.
- **Dead `handleErrorRetry` removed** from `App.tsx`. The old handler
  POSTed to `/audit/start` which created a brand-new audit row, orphaning
  the failed one and breaking session → audit continuity in the admin
  timeline. The new in-place retry reuses the same `audit_id`.
- **`retriesExhausted` state resets** when a brand-new audit is kicked off
  from `handleAutoStart` or `startAudit`, so a fresh audit always begins
  with a full retry budget.
- Spec paths corrected in
  `plans/04182026-no-ticket-leadgen-audit-retry-self-service-and-admin/spec.md`
  (referenced canonical `/Users/rustinedave/Desktop/alloro` instead of a
  stale clone path).

**Commits:**
- `feat: self-service audit retry on FAB error variant + 3-retry cap`

## [0.0.2] - April 2026

### LocalStorage Session Persistence + Server-Authoritative Paywall Submit

Two related fixes for the leadgen → signup conversion flow.

**Key Changes:**
- **`session_id` now persists in `localStorage`** instead of `sessionStorage`.
  Same person on the same device keeps the same session id across browser
  closes / tab churn / iOS Safari aggressive tab eviction. Eliminates the
  "ghost row" pattern in admin where every browser reopen produced a
  brand-new anonymous lead row.
- **New `submitEmailPaywall` helper** in `src/lib/tracking.ts` — POSTs to
  the new backend `/api/leadgen/email-paywall` endpoint and is `await`ed
  by the paywall before the user can navigate away.
- **`EmailPaywallOverlay.handleSubmit` now awaits server-authoritative
  recording** before calling `onEmailSubmit`. Previous fire-and-forget
  `trackEvent` was sometimes lost on iOS Safari due to fast navigation,
  which broke `linkAccountCreation`'s email-matching at signup time.
- `EmailPaywallOverlay` accepts a new optional `auditId` prop. Wired
  through from `DashboardStage`. Existing `trackEvent` stays as
  belt-and-suspenders — server endpoint is idempotent.
- Plan folders for `account-link-gap-and-localstorage` and
  `mobile-responsive-refactor` checked in.

**Commits:**
- `feat: localStorage session id + server-authoritative paywall submit`

## [0.0.1] - April 2026

### Leadgen "Email Me When Ready" FAB

Adds a bottom-center floating button that appears 1:20 after the audit
starts (or immediately on confirmed error) so users who don't want to
wait around can drop their email and get the report sent when ready.
Replaces the old shake-on-error modal entirely.

**Key Changes:**
- New `EmailNotifyFab` component — collapsed pill that pulses on first
  show, expands to email input + submit on tap. Two copy variants:
  - `wait`: "Don't want to wait around? Drop your email."
  - `error`: "Heavier traffic than usual — pop in your email and we'll
    deliver when it's done." Auto-expands on appearance.
- 80-second timer in `App.tsx` that's cancelled if the audit completes
  before it fires (no FAB for fast audits) and overridden by error
  state (instant FAB, no wait).
- FAB hides on dashboard render and after a successful submit.
- Successful FAB submit flips `emailSubmitted=true` so the dashboard
  skips its email paywall — we already have the email, no point gating
  the report a second time.
- New `submitEmailNotify(...)` helper in `src/lib/tracking.ts` posting
  to the new backend `/api/leadgen/email-notify` endpoint.
- Removed `AuditErrorModal` mount and `sendErrorNotificationEmail`
  client send — the FAB owns this flow now end-to-end.

**Commits:**
- `feat: EmailNotifyFab + tracking helper, replaces AuditErrorModal`
