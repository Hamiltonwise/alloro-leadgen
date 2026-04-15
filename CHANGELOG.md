# Alloro Leadgen Tool Changelog

All notable changes to the Alloro Leadgen Tool are documented here.

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
