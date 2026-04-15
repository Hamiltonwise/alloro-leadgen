# Account-Link Gap + LocalStorage Session Persistence

## Why
The new "New Account Created" funnel step is silently failing to fire. Three compounding bugs:

1. **`linkAccountCreation` is wired into the wrong auth controller.** We added the hook to `AuthOtpController.verifyOtp`, but the public signup flow actually goes through `AuthPasswordController.verifyEmail` — confirmed by the `[AUTH] User registered:` log line which lives **only** in `AuthPasswordController.ts:113`. The hook never runs for real signups.

2. **The alloro/frontend signup pages don't forward `?ls=<session_id>`** to the verify-email POST. Even after fix #1, the only matching strategy is email — and email-matching is fragile because:

3. **The leadgen-tool paywall submit is JS-only.** `EmailPaywallOverlay.handleSubmit` does fire-and-forget `trackEvent("email_submitted", { email })` then immediately lets the user navigate to `/signup`. On iOS Safari (where this matters most), the patch may not land before the tab unloads, so `leadgen_sessions.email` stays NULL and email-matching also returns 0.

Separately: every browser close = a brand-new "ghost" session in admin because session id lives in `sessionStorage`. Switching to `localStorage` is a one-line fix that solves it cleanly without IP-based dedup hacks.

## What
1. **Hook fires on the real signup path.** `linkAccountCreation` called from `AuthPasswordController.verifyEmail` after a successful new-user creation, with the same `{email, userId, sessionId}` shape we already use for OTP.
2. **`?ls=` flows through the auth pages.** Signup → VerifyEmail → `verifyEmail()` API call carries the leadgen session id end-to-end so backend can match by id even if email-matching fails.
3. **Paywall submit is server-authoritative.** `EmailPaywallOverlay.handleSubmit` POSTs to a new minimal endpoint that durably writes `email_gate_shown` + `email_submitted` events and patches `session.email`. Email send via n8n stays client-side for now (single source of send). Once this lands, the email column on the session is reliable.
4. **Diagnostic log on silent return.** `linkAccountCreation` logs when it finds zero candidates so future-us doesn't have to grep dist files to see what happened.
5. **`session_id` persists across browser close.** Switch the storage key from `sessionStorage` to `localStorage` in the leadgen tool's tracking lib.

## Context

### Relevant files — backend (`/Users/rustinedave/Desktop/alloro`)
- `src/controllers/auth-password/AuthPasswordController.ts:113` — the `[AUTH] User registered:` log line; `verifyEmail` handler is the actual signup completion. **Hook insertion point.**
- `src/controllers/auth-otp/AuthOtpController.ts` — already has the hook (keep — covers the OTP path which exists for admin login etc.).
- `src/controllers/leadgen-tracking/feature-services/service.account-linking.ts` — `findCandidateSessions` + `linkAccountCreation`. Add a `console.log` for the empty-candidates path.
- `src/controllers/leadgen-tracking/LeadgenTrackingController.ts` — already houses `submitEmailNotify`. New `submitEmailPaywall` handler lives here.
- `src/routes/leadgenTracking.ts` — register the new route.
- `src/routes/auth-password.ts` — verify it accepts `leadgen_session_id` in the body (validation layer if any).

### Relevant files — alloro frontend (`/Users/rustinedave/Desktop/alloro/frontend`)
- `src/pages/Signup.tsx:11` — already reads `?email=` via `useSearchParams`. Add `?ls=` capture + persist to `localStorage`.
- `src/pages/VerifyEmail.tsx:12` — same pattern. Read `?ls=` (or fall back to localStorage), pass to `verifyEmail()`.
- `src/api/auth-password.ts:12-16` — `verifyEmail(email, code)` signature. Add optional `leadgen_session_id` param, include in POST body.

### Relevant files — leadgen tool (`/Users/rustinedave/Desktop/alloro-leadgen-tool`)
- `src/lib/tracking.ts` — lines 152, 161, 186, 192 use `window.sessionStorage`. Switch to `window.localStorage`. Update the comment on line 9.
- `src/components/EmailPaywallOverlay.tsx:28-58` — `handleSubmit`. Insert an awaited POST to the new server-authoritative endpoint before/alongside the existing `trackEvent`.
- `src/components/stages/DashboardStage.tsx:142-155` — `handleEmailSubmit` chain. Probably no change; the new server call lives inside the overlay component itself.
- `src/lib/tracking.ts` — add `submitEmailPaywall(opts)` helper alongside the existing `submitEmailNotify`.

### Patterns to follow
- **New backend endpoint:** mirror `submitEmailNotify` exactly — same `requireTrackingKey` middleware, same UUID validation, same idempotent `recordServerSideEvent` helper. Just skip the queue insert.
- **New backend service hook (password controller):** mirror the OTP controller's wiring at `AuthOtpController.ts:91-139` — fire-and-forget with `.catch`, only fires when `isNewUser=true`.
- **`?ls=` propagation in frontend:** `localStorage.setItem("leadgen_session_id", ls)` on Signup mount if `?ls=` is present; `localStorage.getItem(...)` on VerifyEmail to forward. Don't use sessionStorage — survives the OTP-code-emailed-back redirect.

### Reference files
- For server-authoritative event endpoint shape: `src/controllers/leadgen-tracking/LeadgenTrackingController.ts` — the existing `submitEmailNotify` handler is the closest analog; the new `submitEmailPaywall` is a strict subset (skips queue).
- For frontend tracking helper: `src/lib/tracking.ts` already has `submitEmailNotify` — copy the shape.

## Constraints

### Must
- Backwards-compatible: old leadgen-tool builds still work even if the new `submitEmailPaywall` endpoint is missing (ie don't break the existing client-side `trackEvent` fallback).
- Idempotent: hitting `submitEmailPaywall` twice for the same session must not write two events.
- The diagnostic log in `linkAccountCreation` empty-return path must include `email`, `sessionId`, and the resolved candidate count (0) so it's debuggable from a single log line.
- The `localStorage` key name stays `leadgen_session_id` (same as the sessionStorage key) so existing in-flight sessions don't get double-counted on rollout — the new code reads localStorage; if missing, falls back to whatever sessionStorage had (one-time migration, then drop).

### Must not
- Don't introduce a new tracking-key auth scheme. Reuse `X-Leadgen-Key`.
- Don't await the n8n send inside the new endpoint — that's a separate concern. The endpoint records events + patches session, returns 200, done.
- Don't remove the existing client-side `trackEvent("email_submitted")` from `EmailPaywallOverlay` yet. Keep it as belt-and-suspenders. (Future plan: delete once we've confirmed the server endpoint covers all cases.)
- Don't change the `verifyEmail` API contract in a breaking way. `leadgen_session_id` is optional.

### Out of scope
- Password-flow vs OTP-flow consolidation (different ticket entirely).
- Removing the client-side email send and centralizing via backend (flagged in prior CHANGELOG as future work).
- IP-based session merging (we agreed localStorage handles the "same person reopens browser" case well enough).
- Backfilling old sessions where `account_created` event is missing (one-off SQL only when needed).

## Risk

**Level:** 2 (Concern — touches the auth flow + a high-traffic event path)

### Risks identified

1. **Adding the link hook to the password controller could fire it twice if both controllers run for the same signup.**
   **Mitigation:** Idempotent design — `linkAccountCreation` already guards against double-writes via the `account_created` event existence check. Even if both controllers fire, the second one no-ops cleanly.

2. **`?ls=` localStorage value lingering forever** — a user who signed up months ago could have the value persisted, then a new audit on a different device synced via login could match the wrong session.
   **Mitigation:** Clear `localStorage.leadgen_session_id` after a successful verifyEmail call (whether or not it linked anything). Single use, then forget.

3. **`localStorage` instead of `sessionStorage` means a user clearing localStorage manually (or using an "Erase site data" reset) loses their session id.** That's intentional and matches existing UX expectations — just call out that "private browsing" + iOS aggressive storage purges may still produce ghost sessions, which is fine.

4. **The new `submitEmailPaywall` endpoint adds latency** — the user clicks submit and now we await a network call before the success state. Adds ~100-300ms perceived delay.
   **Mitigation:** Acceptable for an action that already does a (longer) `sendAuditReportEmail` n8n call. The new call is the minor part of the latency budget.

### Blast radius
- Backend: new endpoint, one new hook in AuthPasswordController, one log line in service.account-linking. No table changes, no migrations.
- Alloro frontend: 3 files (Signup, VerifyEmail, api/auth-password). Surface area is the auth flow.
- Leadgen tool: 2 files (tracking.ts, EmailPaywallOverlay).

### Pushback
- Worth flagging: we now have THREE write-paths to the leadgen funnel (event endpoint, beacon endpoint, new email-paywall endpoint, plus the FAB email-notify endpoint). That's four total. Each adds a maintenance edge to the tracking lib. Acceptable for now; revisit if a fifth shows up.

## Tasks

### T1: Backend — hook `linkAccountCreation` in password verify-email handler
**Do:** In `src/controllers/auth-password/AuthPasswordController.ts:113` area, after `console.log("[AUTH] User registered: ...")` and only when the user was newly created (the same `isNewUser`-style condition the OTP controller uses), call `linkAccountCreation({ email: normalizedEmail, userId: user.id, sessionId: leadgen_session_id })` fire-and-forget with a `.catch`. Add `leadgen_session_id` to the destructured request body, validated with the same UUID regex used in the OTP controller.
**Files:** `src/controllers/auth-password/AuthPasswordController.ts`
**Depends on:** none
**Verify:** unit-trace by re-reading the OTP controller's wiring; structure should be identical.

### T2: Backend — diagnostic log in `linkAccountCreation` empty-candidates path
**Do:** In `src/controllers/leadgen-tracking/feature-services/service.account-linking.ts`, the `if (candidates.length === 0) return;` line — log before returning: `console.log("[LeadgenAccountLinking] no candidates", { email: opts.email, sessionId: opts.sessionId, userId: opts.userId })`. Single line, single shot, never throws.
**Files:** `src/controllers/leadgen-tracking/feature-services/service.account-linking.ts`
**Depends on:** none
**Verify:** existing happy-path log still fires for matched sessions; new log fires for unmatched.

### T3: Backend — new `POST /api/leadgen/email-paywall` endpoint
**Do:** Add `submitEmailPaywall` handler in `LeadgenTrackingController.ts`, modeled on `submitEmailNotify` but stripped down:
- Validate `{ session_id, audit_id, email }` (UUIDs + email regex)
- Patch `leadgen_sessions.email` (write-once via existing pattern), advance `final_stage` to `email_submitted` if later
- Idempotently write `email_gate_shown` + `email_submitted` events via `recordServerSideEvent`
- Return `{ ok: true }`
- **No queue insert, no n8n send.** Email continues to be sent client-side via the existing `sendAuditReportEmail`.

Register `POST /email-paywall` in `src/routes/leadgenTracking.ts` behind `requireTrackingKey`.
**Files:** `src/controllers/leadgen-tracking/LeadgenTrackingController.ts`, `src/routes/leadgenTracking.ts`
**Depends on:** none
**Verify:** `curl -X POST /api/leadgen/email-paywall` with valid body → 200, session.email patched, two events present, re-submit → 200 + idempotent (no duplicate events).

### T4: Backend — accept `leadgen_session_id` in password verifyEmail body
**Do:** In whatever route registers the password verify-email POST (`src/routes/auth-password.ts` or similar), ensure no validation rejects unknown fields. Also confirm the controller (T1) reads it from `req.body`. If there's a Joi/Zod schema, add `leadgen_session_id: optional UUID`.
**Files:** route file + any validation schema (find via grep on existing fields like `code` or `email`)
**Depends on:** T1
**Verify:** request with `leadgen_session_id` key passes validation, request without it still works.

### T5: Alloro frontend — capture `?ls=` on Signup mount, persist to localStorage
**Do:** In `src/pages/Signup.tsx`, after the existing `useSearchParams` line that reads `?email=`, also read `?ls=`. If present and looks like a UUID, `localStorage.setItem("leadgen_session_id", ls)`. If not a UUID, ignore silently.
**Files:** `src/pages/Signup.tsx`
**Depends on:** none
**Verify:** open `/signup?email=foo&ls=<uuid>` → DevTools → Application → localStorage shows the entry.

### T6: Alloro frontend — forward `leadgen_session_id` from VerifyEmail
**Do:** In `src/pages/VerifyEmail.tsx`, after a successful OTP code entry, read `localStorage.getItem("leadgen_session_id")` (fall back to `?ls=` URL param if you want belt-and-suspenders). Pass into the existing `verifyEmail(email, code)` call as a third arg or via an options object.
**Files:** `src/pages/VerifyEmail.tsx`
**Depends on:** T5, T7
**Verify:** network tab shows `leadgen_session_id` in the verifyEmail POST body.

### T7: Alloro frontend — extend `verifyEmail` API client signature
**Do:** In `src/api/auth-password.ts:12-16`, update `verifyEmail(email, code)` to `verifyEmail(email, code, leadgenSessionId?)`. If provided, include in the POST body. Optional → backwards-compatible.
**Files:** `src/api/auth-password.ts`
**Depends on:** none
**Verify:** TypeScript happy. Body of POST includes the field when caller passes it.

### T8: Alloro frontend — clear localStorage after verifyEmail success
**Do:** Once the verifyEmail call returns success, `localStorage.removeItem("leadgen_session_id")`. Single-use credential — don't let it linger and cause cross-account confusion later.
**Files:** `src/pages/VerifyEmail.tsx`
**Depends on:** T6
**Verify:** localStorage no longer has the entry after a successful code submit.

### T9: Leadgen tool — switch `session_id` storage from sessionStorage to localStorage
**Do:** In `/Users/rustinedave/Desktop/alloro-leadgen-tool/src/lib/tracking.ts`, replace every `window.sessionStorage` reference with `window.localStorage`:
- Line 9 comment update
- Line 152: `getItem(ATTR_SENT_KEY)`
- Line 161: `setItem(ATTR_SENT_KEY, "1")`
- Line 186: `getItem(SESSION_STORAGE_KEY)`
- Line 192: `setItem(SESSION_STORAGE_KEY, fresh)`
- Line 196 comment update

Constant rename optional but tidy: `SESSION_STORAGE_KEY` → `SESSION_LOCAL_KEY` (don't bother if it spreads the diff).
**Files:** `/Users/rustinedave/Desktop/alloro-leadgen-tool/src/lib/tracking.ts`
**Depends on:** none
**Verify:** open leadgen tool, do an audit, close browser entirely, reopen → DevTools → localStorage shows the session id; admin shows the SAME session_id continuing (no new ghost row).

### T10: Leadgen tool — `submitEmailPaywall` helper + paywall integration
**Do:** Add `submitEmailPaywall` to `src/lib/tracking.ts` (mirror `submitEmailNotify` shape — POSTs to `/leadgen/email-paywall`, returns `{ok}`, never throws).

In `src/components/EmailPaywallOverlay.tsx:handleSubmit`, after a valid email is entered but BEFORE `await onEmailSubmit(email)`, call `await submitEmailPaywall({email, auditId})`. If it returns `{ok: false}`, log to console but **do not block** the email send — degrade gracefully so the existing flow still works. The existing `trackEvent("email_submitted", { email })` stays as belt-and-suspenders.

The `auditId` needs to flow into `EmailPaywallOverlay` as a prop — find where it's mounted (`DashboardStage.tsx:1542` per exploration) and pass it through.
**Files:** `src/lib/tracking.ts`, `src/components/EmailPaywallOverlay.tsx`, `src/components/stages/DashboardStage.tsx` (prop wiring)
**Depends on:** T3 (endpoint must exist)
**Verify:** submit email via paywall → network tab shows POST to `/api/leadgen/email-paywall` returning 200 → DB shows session.email populated and two events (email_gate_shown, email_submitted) within milliseconds.

## Done

- [ ] `npx tsc --noEmit` — zero errors in backend, alloro frontend, leadgen tool
- [ ] Curl probe: `POST /api/leadgen/email-paywall` 200 with key, idempotent re-submit, no duplicate events
- [ ] Curl probe: signup with `leadgen_session_id` in body → backend reaches `linkAccountCreation`
- [ ] Manual: complete a fresh signup with a NEW email; no manual deletion in between
  - `[LeadgenAccountLinking] linked session ...` appears in pm2 logs
  - `leadgen_sessions.user_id` populated for the matched session
  - `leadgen_sessions.final_stage` = `account_created`
  - `leadgen_sessions.converted_at` populated
- [ ] Manual: same person, close browser, reopen, do another audit → SAME session_id used (verify in localStorage); admin shows ONE session row not two
- [ ] No regression on the FAB email-notify path
- [ ] CHANGELOG entry written
