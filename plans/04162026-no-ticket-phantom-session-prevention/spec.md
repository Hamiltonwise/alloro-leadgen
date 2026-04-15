# Phantom Session Prevention on Report Revisits

## Why
Right now, every time someone opens an existing report via email link
(`audit.getalloro.com?audit_id=<id>`), the leadgen tool spins up a brand-new
`leadgen_sessions` row, fires `landed` / `results_viewed`, and appears in
admin as a fresh anonymous lead. Repeat this 10 times across 3 devices
(user + 2 colleagues they forwarded the link to) and one real lead becomes
11 rows in admin — all Landed-on-Page, all Results-Viewed, all anonymous.

The fix is deterministic: if the URL carries an `?audit_id=`, the leadgen
tool should resolve that to its **original** `session_id` before any
`trackEvent` fires, and swap that id into `localStorage` so subsequent
tracking lands on the original session.

## What
1. New backend endpoint `GET /api/leadgen/session-by-audit/:auditId` that
   returns `{ session_id: string | null }`. Gated by the existing
   `X-Leadgen-Key`.
2. Leadgen-tool `App.tsx` — right after it reads `audit_id` from the URL
   and **before** any `trackEvent` fires, call the new endpoint; if a
   session_id comes back, write it to `localStorage.leadgen_session_id`
   (clobbering whatever was there) and reset the tracking lib's in-memory
   cache so `getSessionId()` picks up the new value on next call.
3. End state: opening a report link → no new session row → events land on
   the original session, merely bumping `last_seen_at` and appending
   `landed` / `results_viewed` events to the original timeline.

## Context

### Relevant files — backend (`/Users/rustinedave/Desktop/alloro`)
- `src/controllers/leadgen-tracking/LeadgenTrackingController.ts` — houses
  the existing public endpoints; new `getSessionByAudit` handler lives
  here.
- `src/routes/leadgenTracking.ts` — register `GET /session-by-audit/:auditId`.
- `src/models/LeadgenSessionModel.ts` — for the `ILeadgenSession` type.

### Relevant files — leadgen tool (`/Users/rustinedave/Desktop/alloro-leadgen-tool`)
- `App.tsx:113-131` — the mount effects that read `?audit_id=` and set
  `auditId` state. The lookup-and-swap logic slots in as a new effect
  that runs BEFORE the existing `trackEvent("landed")` on mount.
- `src/lib/tracking.ts` — add `adoptSessionId(id: string)` helper that
  writes to localStorage AND resets the module-level `cachedSessionId`
  so the next `getSessionId()` returns the new value. Also add the
  `resolveSessionByAuditId(auditId)` client function.

### Patterns to follow
- **Backend endpoint:** mirror `submitEmailNotify` exactly — same
  `requireTrackingKey` middleware, same `isValidUuid` validation.
- **Client-side lookup:** mirror `submitEmailPaywall` shape in
  `tracking.ts` — thin `fetch` wrapper, returns `{ sessionId: string
  | null }`, never throws.
- **Session id adoption:** currently `getSessionId` caches in module
  scope (`cachedSessionId`). A simple setter + localStorage write
  covers this.

## Constraints

### Must
- `landed` MUST NOT fire before the lookup completes. Today it fires on
  mount line 113. The new lookup needs to block it (or reorder so the
  lookup runs first, then `landed`).
- The lookup must be optional — if no `?audit_id=` is in the URL, skip
  entirely. Zero round-trip cost for first-time visitors.
- Lookup must be idempotent on failure: if the endpoint returns null
  or errors, fall through to the existing localStorage/fresh-UUID
  path. Never break tracking for a transient network issue.
- Only one `adoptSessionId` call per mount — don't race with other
  effects that read `getSessionId()` during the same render cycle.

### Must not
- Don't change the tracking key auth scheme.
- Don't alter the `ensureSession` upsert logic — the existing patch-by-id
  path works; we just need to make sure we're hitting it with the right
  id.
- Don't introduce any new dependency.
- Don't backfill old phantom sessions — that's a separate admin cleanup
  exercise (cheaper: filter them in the reconciliation plan).

### Out of scope
- Merging already-created phantom sessions into their parent audit's
  original session (destructive, risky — defer to a manual admin tool
  or just bulk-delete them).
- Handling the case where the audit was NEVER owned by a leadgen
  session (e.g., internal audit creation) — endpoint returns null,
  we fall through to normal behavior. Fine.
- Colleague-forwarded link handling — inherits the original lead's
  session_id, which is a data quality concern but better than the
  current fragmentation.

## Risk

**Level:** 1 (Suggestion — isolated, reversible, low blast radius)

### Risks identified

1. **Race condition** — `trackEvent("landed")` runs on mount at line 113;
   the new lookup effect also runs on mount. Both are `useEffect` with
   `[]` deps so order depends on declaration order. The lookup must be
   registered FIRST, and `trackEvent("landed")` must be gated behind a
   state that flips when the lookup completes (or we move landed
   inside the lookup's `.then`).
   **Mitigation:** add a `sessionAdopted: boolean` state that gates the
   landed-on-mount effect. Default false; flips true either after
   lookup completes or when URL has no `?audit_id=`.

2. **Lookup latency** — extra round-trip before `landed` can fire.
   Typically <100ms, acceptable. If network is slow, landed fires
   late. The report UI rendering doesn't depend on tracking so no user-
   visible lag.
   **Mitigation:** none needed; just don't await in a way that blocks
   UI.

3. **Colleague viewing a forwarded link** — they adopt the original
   lead's session_id. Their subsequent events append to that session.
   Acceptable trade — see "Out of scope" above.

### Blast radius
- Backend: 1 new route + 1 new handler. No existing endpoint changed.
- Leadgen tool: 2 files (`tracking.ts` helper, `App.tsx` mount effect).
- No DB schema change, no migration.

### Pushback
- Current fragmentation is a known anti-pattern; no architectural
  concerns with this fix. It's the cleanest possible intervention.

## Tasks

### T1: Backend endpoint — `GET /leadgen/session-by-audit/:auditId`
**Do:** Add `getSessionByAudit(req, res)` handler in
`LeadgenTrackingController.ts`:
- Validate `req.params.auditId` as a UUID — return 400 on invalid
- Query `leadgen_sessions` for the most recent row with this
  `audit_id` (`.where({audit_id}).orderBy("first_seen_at","asc").first()`)
  so if somehow multiple exist we pick the original
- Return `{ session_id: row?.id ?? null }` always 200
- Never throws, never leaks internals

Register `GET /session-by-audit/:auditId` in `leadgenTracking.ts`
behind `requireTrackingKey`.

**Files:** `src/controllers/leadgen-tracking/LeadgenTrackingController.ts`,
`src/routes/leadgenTracking.ts`
**Depends on:** none
**Verify:** `curl` with valid key and a known audit_id → 200 with the
original session id. Unknown audit_id → 200 with `null`. Bad UUID → 400.

### T2: Leadgen-tool client — `resolveSessionByAuditId` + `adoptSessionId`
**Do:** In `src/lib/tracking.ts`:
- New `adoptSessionId(id: string)` — validates UUID, writes to
  localStorage under the existing `SESSION_STORAGE_KEY`, sets module
  state `cachedSessionId = id`, also clears `sessionInitPromise` so the
  next `ensureSession()` call upserts cleanly (in case a prior init
  already resolved for a different id).
- New `resolveSessionByAuditId(auditId: string): Promise<string | null>`
  — POSTs to the new endpoint, returns `session_id` or null. Never
  throws (silent on failure, same as other tracking calls).

**Files:** `/Users/rustinedave/Desktop/alloro-leadgen-tool/src/lib/tracking.ts`
**Depends on:** T1 (endpoint must exist for a real test)
**Verify:** from devtools console:
`localStorage.setItem('leadgen_session_id', 'old-uuid'); adoptSessionId('new-uuid');`
→ localStorage now has `new-uuid`, `getSessionId()` returns `new-uuid`.

### T3: Leadgen-tool — gate `landed` behind session adoption
**Do:** In `App.tsx`:
- Add state `sessionAdopted: boolean` (default false)
- BEFORE the existing `trackEvent("landed")` mount effect:
  - On mount, read `?audit_id=` from URL
  - If present: call `resolveSessionByAuditId(auditId)` → if returns
    an id, `adoptSessionId(id)` → then set `sessionAdopted = true`
  - If not present OR endpoint returns null: just set
    `sessionAdopted = true`
- Gate the existing `trackEvent("landed")` effect with a dep on
  `sessionAdopted` and an early-return `if (!sessionAdopted) return`
- Same for any OTHER early-mount trackEvent that currently fires before
  the lookup could complete — grep for `trackEvent(` in App.tsx and
  move them all behind the gate or into the adoption `.then` chain

**Files:** `/Users/rustinedave/Desktop/alloro-leadgen-tool/App.tsx`
**Depends on:** T2
**Verify:**
- Open a new tab to `audit.getalloro.com?audit_id=<known-existing-id>`
- DevTools → Network → `POST /leadgen/session` payload uses the
  ORIGINAL session_id, not a fresh one
- Admin → Leadgen Submissions list → no new row appears; the existing
  row's `last_seen_at` bumps forward

### T4: tsc + build verify + manual prod smoke
**Do:**
- `npx tsc --noEmit` on the backend
- `npm run build` on the leadgen tool
- After deploy: open a known report link in an incognito window, confirm
  no new row in admin

**Depends on:** T1, T2, T3
**Verify:** exit 0 on both builds; admin shows zero growth from the
incognito visit.

## Done

- [ ] Backend: `GET /api/leadgen/session-by-audit/:auditId` returns the
      correct id for known audits and null for unknowns
- [ ] `tsc --noEmit` on alloro backend — zero errors
- [ ] `npm run build` on alloro-leadgen-tool — exit 0
- [ ] Manual test: opening `audit.getalloro.com?audit_id=<id>` in a
      fresh browser profile does NOT create a new `leadgen_sessions`
      row; instead the existing row's `last_seen_at` updates
- [ ] Admin UI reflects no new "Landed on Page" ghost row after the
      visit
- [ ] No regression on the first-time leadgen flow (no `?audit_id=`)
- [ ] CHANGELOG entry written
