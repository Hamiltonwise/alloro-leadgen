# Leadgen Audit Retry — Self-Service (end user) + Admin Rerun

## Why
When a leadgen audit fails, there is no way to re-run it. The current error UX (`EmailNotifyFab` variant="error") only captures the user's email so the backend can send them the *same failed* report once the worker finishes its catch block. The user sits staring at "Heavier traffic than usual" with no way forward. Admins have no rerun either — only PracticeRanking has a retry button, and it's a different pipeline entirely.

Additionally, a dead `handleErrorRetry` path exists in `App.tsx` that, if it were ever wired up, would create a **brand-new audit row** and orphan the failed one — breaking session-to-audit continuity in the admin timeline. This spec replaces that approach with a proper in-place retry.

## What

**Self-service retry (public, end user):**
1. On the FAB error variant, add a primary "Try again" button ABOVE the email-me-when-ready form.
2. Clicking it hits a new public endpoint `POST /api/audit/:auditId/retry` (shared-secret gated, same pattern as leadgen tracking) which:
   - Verifies the row exists and `status='failed'`.
   - Enforces a **max of 3 retries** per audit (`retry_count < 3` on the row). The 3rd retry is allowed; the 4th (which would push the count to 4) is rejected with 429.
   - Resets `status='pending'`, `realtime_status=0`, `error_message=null` on the **same** `audit_processes` row, AND atomically increments `retry_count`.
   - Re-enqueues the `audit-leadgen` BullMQ job with the row's existing `domain + practice_search_string`.
3. Frontend reuses the same `auditId`, resets polling state, fires a new `audit_retried` event, and rejoins the scanning stages. No new audit row is created. The admin timeline still shows one audit lineage.
4. The email-capture half of the FAB remains as a secondary fallback in case the retry also fails or the limit has been reached.
5. When the retry limit is hit, the FAB hides the "Try again" button and swaps copy to make the email-capture path the sole remaining action.

**Admin rerun:**
1. A new "Rerun audit" button in the admin `LeadgenSubmissionDetail` drawer, visible only when `audit.status='failed'`.
2. Hits `POST /api/admin/leadgen-submissions/:id/rerun` (JWT + super-admin gated), which delegates to the same shared service as the public endpoint but **bypasses the 3-retry cap** — admin is the manual escape valve once the user hits their limit. Admin retries do NOT increment `retry_count` (they are out-of-band, not part of the user's automatic budget).
3. Toast feedback on success; re-fetches the detail so the drawer shows `status='pending'` immediately.
4. Drawer also displays current `retry_count` so admins can see how many times the user already tried before escalating.

**Cleanup:**
- Delete the dead `handleErrorRetry` callback in `App.tsx` that POSTs to `/audit/start` with GBP data. It has no caller today and represents the wrong retry pattern (orphans failed rows).

## Context

### Relevant files — backend (`/Users/rustinedave/Desktop/alloro/src`)
- `src/workers/processors/auditLeadgen.processor.ts:238-252` — failure branch. Sets `status='failed'`, `error_message`. Does NOT reset `realtime_status` (stays at whatever stage failed), so retry controller must reset it explicitly.
- `src/workers/queues.ts:34-43` — `getAuditQueue('leadgen')` returns the BullMQ queue. Enqueue with `queue.add("process", { auditId, domain, practiceSearchString })`.
- `src/controllers/audit/audit-services/auditWorkflowService.ts:18-42` — existing kickoff. Same enqueue payload shape we need to reproduce on retry.
- `src/routes/audit.ts:6` — existing `POST /start` route. Retry route lives here too (`POST /:auditId/retry`).
- `src/controllers/audit/audit.controller.ts` — existing `startAudit` controller. New `retryAudit` controller lives here.
- `src/controllers/practice-ranking/PracticeRankingController.ts:633-757` — **closest analog**. Reset-row-then-enqueue pattern. Mirror its structure (validation, status gate, row reset, enqueue, response shape).
- `src/controllers/admin-leadgen/AdminLeadgenController.ts` — existing read-only handlers. New `rerunAuditFromAdmin` lives here, delegating to the shared service.
- `src/routes/admin/leadgenSubmissions.ts:23-50` — register `POST /:id/rerun` with `authenticateToken` + `superAdminMiddleware`.
- `src/controllers/leadgen-tracking/feature-utils/util.tracking-auth.ts` — existing `validateTrackingKey` helper. Reused to gate the public retry endpoint.

### Relevant files — leadgen tool (`/Users/rustinedave/Desktop/alloro-leadgen-tool`)
- `App.tsx:357-361` — where `auditError` flips `fabVariant="error"`. Retry handler lives alongside.
- `App.tsx:404-442` — dead `handleErrorRetry` to DELETE.
- `src/components/EmailNotifyFab.tsx` — add a retry button to the error variant only. Keep the email form as a secondary CTA below it.
- `src/lib/tracking.ts:31-50` — add `audit_retried` to the `LeadgenEventName` union. Add `NON_STAGE_EVENTS` entry so it doesn't interact with the exactly-once stage dedup cache.
- `src/lib/tracking.ts` — add `retryAudit(auditId: string): Promise<{ok: boolean}>` helper matching the `submitEmailNotify` shape.
- `src/hooks/useAuditPolling` — confirm polling resumes automatically when the audit row flips back to `status='pending'`. If not, may need a manual poll restart.

### Relevant files — admin UI (`/Users/rustinedave/Desktop/alloro/frontend`)
- `src/pages/admin/LeadgenSubmissions.tsx` — detail drawer lives here (`<LeadgenSubmissionDetail>` around line 20 import). Button mounts inside the drawer, not the table.
- `src/pages/admin/PracticeRanking.tsx:973-997` — reference fetch+toast pattern to mirror exactly. Uses `fetch`, `react-hot-toast`, and `localStorage.getItem("auth_token")`.

### Reference files
- For backend retry pattern: `PracticeRankingController.ts:633-757` (`retryRanking`). Match: param validation, status gate (reject if pending/processing), row reset with explicit field list, enqueue, 200 JSON response.
- For admin route registration: `src/routes/admin/leadgenSubmissions.ts:23-50`. Match the `authenticateToken` → `superAdminMiddleware` chain.
- For public endpoint auth: `src/routes/leadgenTracking.ts:51-61` (`requireTrackingKey` gate pattern). Same 401 shape.
- For frontend FAB layout: current `EmailNotifyFab.tsx:132-210` (expanded-card JSX). Retry button mounts above the `<form>`.

## Constraints

### Must
- Retry reuses the **same** `audit_id`. No new row created. Session → audit linkage preserved.
- Public endpoint gated by `X-Leadgen-Key` header (same secret as other `/leadgen/*` routes). NOT the silent-204 variant — real 401 on bad key, since this is fetch not beacon.
- Public endpoint caps retries at 3 per audit via a persisted `retry_count` column. 4th attempt returns 429.
- Retry endpoint rejects with 409 if `status != 'failed'`. No retrying a completed audit. No retrying an in-flight audit.
- Admin endpoint JWT + super-admin middleware, same pattern as every other admin-leadgen route.
- Admin endpoint **bypasses** the retry cap and does NOT increment `retry_count`. The admin path is an out-of-band manual override, not part of the user's automatic budget.
- Shared service module so public + admin retry share one code path. A single `skipLimit` flag distinguishes the two callers.
- `audit_retried` event is in `NON_STAGE_EVENTS` — it doesn't advance the funnel, doesn't dedup per session.
- Worker processor is NOT modified. It already reads from the row; resetting the row and re-enqueuing is enough.
- `retry_count` increment must be atomic with the status reset (same UPDATE statement, same transaction) so two simultaneous requests cannot both see `retry_count=2` and both succeed.

### Must not
- Don't persist new columns on `audit_processes` (e.g., `gbp_place_id`, retry counters). The existing `domain + practice_search_string` already encodes the GBP selection. Adding retry counters is premature — pull from BullMQ job logs if needed.
- Don't modify `auditLeadgen.processor.ts`. Retry is purely a row-reset + re-enqueue concern.
- Don't create a separate "retry" queue. Reuse `audit-leadgen`.
- Don't change the `EmailNotifyFab` "wait" variant — no retry button there (audit is still running).
- Don't remove the email-capture form from the error variant. Retry may also fail; email is still the escape hatch.
- Don't touch the existing `POST /audit/start` route.

### Out of scope
- Admin retry UI for **completed** audits (e.g., "re-run to refresh data"). Only failed audits get a button.
- Exponential backoff between retries.
- Resetting `retry_count` after a successful completion. Once the counter ticks, it stays — the cap protects against repeated-failure loops regardless of whether there was a success in between.
- Persisting `gbp_place_id` to make retry fully deterministic (today's `practice_search_string` is specific enough — this was explicitly called out and skipped).
- Cleaning up stale BullMQ job artifacts. BullMQ's `removeOnFail: { count: 50 }` handles this.
- Replacing the email-capture path with retry-only UX.

## Risk

**Level:** 2 (Concern — new public mutating endpoint, retry cap bounds the damage but doesn't eliminate the enumeration vector)

### Risks identified

1. **Audit-ID enumeration via the public retry endpoint (accepted).** UUIDs are 128-bit, but the tracking key ships to the browser so `X-Leadgen-Key` is not a real secret. An attacker could script retries against guessed audit IDs.
   **Mitigation (bounded, not eliminated):** the 3-retry cap limits abuse to ≤3 wasted worker runs per audit, regardless of attacker effort. Combined with UUID unguessability (no listing endpoint, no sequential IDs), the practical attack surface is narrow. The user explicitly chose to skip the session-ownership check to keep the endpoint simple; this is the tradeoff. If abuse materializes, the fix is to add the ownership check back (one SQL lookup) without schema changes — not a dead-end.
   **Residual concern:** if an attacker ever obtains a valid `audit_id` (e.g., via a URL share, screenshot, or intercepted analytics), they can burn that audit's retry budget. Low-severity, well-bounded.

2. **Race: user double-taps retry before state updates.** Frontend sends two POSTs; backend could attempt two re-enqueues.
   **Mitigation:** atomic UPDATE with `WHERE status='failed' AND retry_count < 3` — only one request will match and flip the row. The loser sees `status='pending'` on its re-check (or rowcount=0 on its UPDATE) and returns 409. Also disable the button during the inflight fetch client-side.

3. **Race: two retries both see `retry_count=2`, both pass the check, both increment to 3.** If the check and the update are separate statements, this classic TOCTOU bug lets 4 runs through.
   **Mitigation:** single atomic UPDATE — `UPDATE ... SET retry_count = retry_count + 1, status='pending', ... WHERE id=$1 AND status='failed' AND retry_count < 3`. If rowcount=0, the caller reports either `not_failed` or `limit_exceeded` based on a follow-up SELECT. The cap is enforced by the DB, not the application.

4. **Failed audit is already re-enqueued by a worker retry loop.** BullMQ has no automatic retry configured today (confirmed by processor's catch block writing `status='failed'` directly), so this risk is theoretical — but worth noting if anyone later enables BullMQ-level retries.
   **Mitigation:** status='failed' gate. If a BullMQ retry is in flight, the processor would have reset `status='pending'` before re-running, so the API gate correctly rejects.

5. **Polling doesn't restart after retry.** If `useAuditPolling` caches the error state and doesn't re-poll when the row flips back to `status='pending'`, the user sees a stale error.
   **Mitigation:** after a successful retry call, explicitly reset local state (`setAuditError(null)` or equivalent) and ensure the polling hook resumes. Verify during execution. If the hook can't be coerced, the fallback is to trigger a soft remount of the polling component.

6. **Retry fires the n8n email queue drain twice.** Per the `EmailNotifyFab` spec (T4), the worker drains `leadgen_email_notifications` on completion AND failure. If a user submitted email on the first failure, retried, and the retry also fails → the queue drains twice, they get two emails.
   **Mitigation:** existing drain already marks rows `status='sent'` after send; a second drain finds no `pending` rows and no-ops. Already covered by existing idempotency. No change needed here — just verify during execution.

7. **Dead code deletion regret.** Removing `handleErrorRetry` loses the GBP-restart flow. If anyone was planning to wire it to a UI, this spec pulls the rug.
   **Mitigation:** the dead handler creates orphan audit rows, which is wrong. The new in-place retry replaces its intent cleanly. Git history preserves the old code if ever needed. No mitigation beyond the replacement itself.

8. **Admin bypass of the 3-retry cap could be abused.** A super-admin could retry a hopelessly broken audit 50 times and waste worker capacity.
   **Mitigation:** admin access is already gated by JWT + super-admin allowlist; this is trusted-user territory. No additional cap needed. If concerned, surface the cumulative admin-retry count in the drawer so patterns are visible.

### Blast radius
- **Backend:** two new handlers, one new shared service module, two new route registrations, one migration adding `retry_count` to `audit_processes`. No existing endpoints changed. Worker unchanged.
- **Leadgen tool:** one component (`EmailNotifyFab.tsx`) gets a new button + limit-aware handler. One new helper in `tracking.ts`. One event added to the union. `App.tsx` loses ~40 lines (dead handler) and gains one small retry state variable.
- **Admin UI:** one file (`LeadgenSubmissions.tsx` or its detail sub-component) gets a button + `retry_count` readout + fetch handler.
- **DB:** one new nullable column on `audit_processes` (default 0). Forward- and backward-compatible; existing rows get 0.

### Pushback
Two things worth flagging:

1. **The public retry endpoint has no per-caller auth beyond a browser-shared secret.** We chose to skip session ownership, so anyone who obtains a valid `audit_id` + the tracking key can spend that audit's retry budget. The 3-retry cap bounds the damage to ≤3 wasted worker runs per audit, but this is a real tradeoff. Called out explicitly because "shared secret + mutating endpoint + no per-caller identity check" is usually a smell. Accepted here given (a) the cap, (b) UUID-only addressability, (c) the reversibility of adding ownership back later if abuse shows up.

2. **We're not persisting GBP identity on `audit_processes`.** The user explicitly asked for "rerun with the already selected gbp", which today resolves through `practice_search_string` — usually specific enough to deterministically re-find the same GBP, but not guaranteed. If in testing we see retried audits picking a different business, the fix is adding `gbp_place_id` as a persisted column and teaching the processor to short-circuit the search with a direct Places Details call. That's a follow-up, not a blocker for v1.

## Tasks

### T1: Migration — add `retry_count` to `audit_processes`
**Do:** New knex migration `20260418000000_add_retry_count_to_audit_processes.ts`. Schema:
```
ALTER TABLE audit_processes
  ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
```
No index needed (the column is read as part of the per-row UPDATE, not scanned).

Rollback drops the column.

Also scaffold the three flavors in this plan's `migrations/` folder (`knexmigration.js`, `pgsql.sql`, `mssql.sql`) so deployment scripts can pick the right variant. MSSQL uses `ALTER TABLE ... ADD retry_count INT NOT NULL CONSTRAINT DF_audit_processes_retry_count DEFAULT 0`.

**Files:** `alloro/src/database/migrations/20260418000000_add_retry_count_to_audit_processes.ts`, plus the three scaffold copies in `plans/.../migrations/`
**Depends on:** none
**Verify:** `npx knex migrate:latest` runs cleanly. `\d audit_processes` shows the new column with default 0. Rollback drops it.

---

### T2: Shared service — `service.audit-retry.ts`
**Do:** New module `src/controllers/audit/audit-services/service.audit-retry.ts`. Single exported function:
```ts
export async function retryAuditById(
  auditId: string,
  options?: { skipLimit?: boolean; countsTowardLimit?: boolean }
): Promise<
  | { ok: true; auditId: string; retryCount: number }
  | { ok: false; reason: "not_found" | "not_failed" | "limit_exceeded"; currentStatus?: string; retryCount?: number }
>
```

Defaults: `skipLimit=false`, `countsTowardLimit=true`. Admin callers pass `{ skipLimit: true, countsTowardLimit: false }`.

Behavior (happy path, atomic):
1. Build the WHERE clause based on `skipLimit`:
   - Public caller: `WHERE id=$1 AND status='failed' AND retry_count < 3`
   - Admin caller: `WHERE id=$1 AND status='failed'` (no cap check)
2. Build the SET clause based on `countsTowardLimit`:
   - Public caller: `SET status='pending', realtime_status=0, error_message=NULL, retry_count = retry_count + 1, updated_at=now()`
   - Admin caller: `SET status='pending', realtime_status=0, error_message=NULL, updated_at=now()` (retry_count NOT incremented)
3. Issue the single atomic UPDATE ... RETURNING domain, practice_search_string, retry_count.
4. If rowcount=0 → disambiguate with a SELECT of the current row:
   - Row missing → `{ok:false, reason:"not_found"}`
   - `status != 'failed'` → `{ok:false, reason:"not_failed", currentStatus, retryCount}`
   - `retry_count >= 3` (only possible on public path) → `{ok:false, reason:"limit_exceeded", retryCount}`
5. On rowcount=1, enqueue: `getAuditQueue('leadgen').add("process", { auditId, domain, practiceSearchString })` — same shape as `auditWorkflowService.ts`.
6. Return `{ok:true, auditId, retryCount}`.

Never throws to the caller — catches DB / queue errors, logs, returns `{ok:false, reason:"not_found"}` (safest default).

**Files:** `alloro/src/controllers/audit/audit-services/service.audit-retry.ts`
**Depends on:** T1
**Verify:** manual — find a failed audit in dev with `retry_count=0`, call the function directly → row flips to pending, `retry_count=1`, BullMQ job appears. Call 3 more times (mark row failed between each) → 4th returns `{ok:false, reason:"limit_exceeded", retryCount: 3}`. Call with `{skipLimit:true, countsTowardLimit:false}` on the capped row → 200, row flips pending, `retry_count` stays at 3.

---

### T3: Public retry endpoint — `POST /api/audit/:auditId/retry`
**Do:** New controller `retryAudit` in `src/controllers/audit/audit.controller.ts`. Flow:
1. Validate `req.params.auditId` against UUID regex. 400 otherwise.
2. Call `retryAuditById(auditId)` — no body parsing, no ownership check.
3. Map results to HTTP:
   - `{ok:true, retryCount}` → 200 `{ ok: true, audit_id, retry_count }`.
   - `{ok:false, reason:"not_found"}` → 404.
   - `{ok:false, reason:"not_failed", currentStatus}` → 409 `{ ok: false, error: "not_failed", status: currentStatus }`.
   - `{ok:false, reason:"limit_exceeded", retryCount}` → **429** `{ ok: false, error: "limit_exceeded", retry_count: retryCount, max_retries: 3 }`.

Register route in `src/routes/audit.ts` as `POST /:auditId/retry` behind `requireTrackingKey` middleware (NOT the silent-204 variant). Check how `leadgenTracking.ts:51-61` does it and replicate. Mount just on this route so existing `/audit/*` routes are untouched.

**Files:** `alloro/src/controllers/audit/audit.controller.ts`, `alloro/src/routes/audit.ts`
**Depends on:** T2
**Verify:**
- `curl -X POST -H "X-Leadgen-Key: $KEY" /api/audit/<failed-id>/retry` → 200, response includes `retry_count: 1`.
- Same call without key → 401.
- Repeat until `retry_count=3`, then again → 429 with `{error: "limit_exceeded", retry_count: 3}`.
- Running-audit id → 409.
- Nonexistent id → 404.

---

### T4: Frontend tracking additions
**Do:**
- Add `audit_retried` to the `LeadgenEventName` union in `src/lib/tracking.ts`.
- Add `"audit_retried"` to the `NON_STAGE_EVENTS` set.
- New helper:
```ts
export async function retryAudit(
  auditId: string
): Promise<
  | { ok: true; retryCount: number }
  | { ok: false; reason: "not_failed" | "limit_exceeded" | "not_found" | "network"; retryCount?: number }
>
```
Posts to `/audit/:auditId/retry` — no body. Returns discriminated union above based on HTTP status. On 200, fires `trackEvent("audit_retried", { audit_id, retry_count })`. Awaitable, never throws.

**Files:** `alloro-leadgen-tool/src/lib/tracking.ts`
**Depends on:** T3
**Verify:** `npx tsc --noEmit` passes. Devtools smoke: `await retryAudit('<failed-id>')` → `{ok: true, retryCount: 1}`.

---

### T5: FAB retry button with limit awareness (error variant only)
**Do:** In `src/components/EmailNotifyFab.tsx`, when `variant === "error"` and the FAB is expanded, render a retry button **above** the email form. Layout:

```
[Mail icon] "Heavier traffic than usual."
            "Pop in your email and we'll deliver when it's done."

┌────────────────────────────────────────┐
│  [↻] Try again                         │  ← new primary button
└────────────────────────────────────────┘

          — or —

[ your@email.com        ]
[ Email me when ready   ]
```

New props:
```ts
onRetry: () => Promise<void>;
retriesExhausted: boolean;    // true once server returns 429
```

Button states:
- Idle: "Try again" with refresh icon.
- Submitting: spinner + "Retrying…", disabled.
- Inline-error (retry returned `{ok:false, reason:"not_failed" | "network"}`): revert to idle, show small inline error under the button, keep the email form visible.
- `retriesExhausted=true`: **hide the button entirely**. Swap the headline to "We've hit our retry limit." and keep the email-capture copy/form — now the only action. Sub-copy: "Drop your email and we'll handle this one manually."

Success: parent handles hiding the FAB via its own error-cleared effect (T6). Component just resets local state.

Only render the retry button when `variant === "error"`. In `"wait"` variant the form stays as-is.

**Files:** `alloro-leadgen-tool/src/components/EmailNotifyFab.tsx`
**Depends on:** T4
**Verify:** visual — error-variant FAB shows retry button + email form. After 3 retries, button is gone, copy changed, email form still submits. Wait-variant FAB unchanged.

---

### T6: App.tsx wire-up + dead code removal
**Do:**
- Delete `handleErrorRetry` at `App.tsx:404-442` (the dead `/audit/start` re-kickoff). Also remove any now-unused imports.
- New state: `retriesExhausted: boolean` (default false).
- New callback `handleFabRetry`:
  ```ts
  const handleFabRetry = useCallback(async () => {
    if (!auditId) return;
    const result = await retryAudit(auditId);
    if (!result.ok) {
      if (result.reason === "limit_exceeded") {
        setRetriesExhausted(true);
      }
      // Let the FAB show its inline error — do nothing else.
      return;
    }
    // Clear the error-surfacing state so polling re-engages.
    setAuditError(null); // or whatever `useAuditPolling` exposes to clear
    setFabVisible(false);
    setCurrentStage("audit_started");
  }, [auditId]);
  ```
- Pass `onRetry={handleFabRetry} retriesExhausted={retriesExhausted}` to `<EmailNotifyFab>`.
- Reset `retriesExhausted` to false when a new audit is kicked off (i.e., alongside `setAuditId` in `startAudit`).
- Verify `useAuditPolling` resumes automatically when the audit row goes back to `status='pending'`. If it's stuck on the error state, either:
  - Expose a `resetError()` from the hook and call it here, OR
  - Unmount/remount the polling component by keying it on `auditId + retryCount` (least invasive if hook is uncooperative).

**Files:** `alloro-leadgen-tool/App.tsx`, possibly `alloro-leadgen-tool/src/hooks/useAuditPolling.ts` (if hook needs a reset exposed)
**Depends on:** T5
**Verify:** manual — force an audit to fail, FAB appears in error mode, click "Try again" → FAB closes → scanning stages re-render. Force failure 3 more times → 4th retry attempt gets 429 → FAB copy swaps, button disappears, email form remains submittable.

---

### T7: Admin rerun endpoint
**Do:** New controller `rerunAuditFromAdmin` in `src/controllers/admin-leadgen/AdminLeadgenController.ts`:
1. Parse `req.params.id` (this is the submission/session ID, not audit_id).
2. Resolve the `audit_id` for that submission via the existing detail-lookup SQL (reuse the same join `getSubmissionDetail` uses).
3. Call `retryAuditById(auditId, { skipLimit: true, countsTowardLimit: false })`.
4. Map results to HTTP:
   - ok → 200 `{ ok: true, audit_id, retry_count }`.
   - not_found → 404.
   - not_failed → 409 `{ ok: false, error: "not_failed", status: currentStatus }`.
   - (limit_exceeded is unreachable when skipLimit=true, but handle defensively → 500 with log.)

Register in `src/routes/admin/leadgenSubmissions.ts`:
```ts
router.post(
  "/:id/rerun",
  authenticateToken,
  superAdminMiddleware,
  controller.rerunAuditFromAdmin
);
```

**Files:** `alloro/src/controllers/admin-leadgen/AdminLeadgenController.ts`, `alloro/src/routes/admin/leadgenSubmissions.ts`
**Depends on:** T2
**Verify:** admin-session curl with valid JWT → 200 on a failed audit, even when `retry_count=3`. After admin rerun, `retry_count` is unchanged. Same call on a completed audit → 409.

---

### T8: Admin UI — rerun button + retry_count readout in detail drawer
**Do:** In the `LeadgenSubmissionDetail` component (the drawer opened from `LeadgenSubmissions.tsx`):

1. **Display the current `retry_count` near the audit status badge.** Small subtle pill, e.g., `Retries: 2/3`. This gives admins a read on how many times the user already tried before escalating.
2. **Add "Rerun audit" button when `audit.status === 'failed'`.** Place near the status area.

Match the `PracticeRanking.tsx:973-997` pattern exactly:
- `fetch("/api/admin/leadgen-submissions/:id/rerun", { method: "POST", headers: { Authorization: \`Bearer ${token}\` } })`
- `react-hot-toast` for feedback: `toast.success("Retry queued")` on 2xx, `toast.error(error.message)` on non-2xx.
- Local `reruning` state to disable the button during flight.
- On success: re-fetch the submission detail so the drawer reflects `status='pending'` immediately. `retry_count` should stay unchanged (admin bypass).

Visually: outline button, refresh icon, same type/sizing as existing admin action buttons.

Update the admin detail response shape to include `retry_count` from `audit_processes`. Verify `getSubmissionDetail` already selects it (or add to the select list).

**Files:** `alloro/frontend/src/pages/admin/LeadgenSubmissions.tsx` (or the detail sub-component file — identify during execution), `alloro/src/controllers/admin-leadgen/AdminLeadgenController.ts` (select list change, if needed)
**Depends on:** T7
**Verify:** open admin panel → find a failed audit with `retry_count=3` → button still present (admin bypass) → click → toast fires, drawer refreshes, `retry_count` still reads 3, status badge flips to pending.

---

## Done

- [ ] `npx knex migrate:latest` runs cleanly; `retry_count` column exists on `audit_processes` with default 0
- [ ] `npx knex migrate:rollback` cleanly drops the column
- [ ] `npx tsc --noEmit` — zero errors in `alloro` (backend + frontend) and `alloro-leadgen-tool`
- [ ] Shared `retryAuditById` function covers both call sites; admin path passes `{skipLimit:true, countsTowardLimit:false}`; no duplicated reset/enqueue logic
- [ ] Public endpoint: 200 on valid retry, 401 without key, 404 on unknown ID, 409 on not-failed status, **429 on 4th attempt with `{error:"limit_exceeded", retry_count:3, max_retries:3}`**
- [ ] `retry_count` increments 0→1→2→3 across three public retries; 4th attempt returns 429 without changing the row
- [ ] Admin endpoint: 200 on valid retry with super-admin JWT, 401/403 without, 404/409 as above
- [ ] **Admin retry bypasses the cap: an audit with `retry_count=3` still succeeds via admin, and `retry_count` stays at 3 afterward**
- [ ] FAB error variant shows "Try again" button above the email form
- [ ] After 3 failed user retries, FAB hides the retry button, swaps headline to "We've hit our retry limit", keeps email form submittable
- [ ] Clicking retry on the FAB re-enters the scanning flow with the SAME audit_id (verify in DB: one row, status flips failed → pending → completed)
- [ ] Admin drawer shows current `retry_count` (e.g., "Retries: 2/3") and shows Rerun button only when audit.status='failed'; toast + drawer refresh on success
- [ ] Dead `handleErrorRetry` removed from `App.tsx`; no new audit rows created on retry
- [ ] `audit_retried` appears in `leadgen_events` when user retries (not deduped as a progression stage)
- [ ] `audit_retried` does NOT appear in the funnel stage counts (admin funnel view unchanged)
- [ ] No regression on `EmailNotifyFab` wait variant (still no retry button, email form intact)
- [ ] No regression on the existing `POST /audit/start` happy path
- [ ] Double-tap retry on FAB: second request returns 409 (if first already flipped to pending), no double-enqueue, `retry_count` advances by exactly 1
- [ ] Polling resumes after retry (frontend doesn't stay stuck on stale error state)
- [ ] CHANGELOG entry written
