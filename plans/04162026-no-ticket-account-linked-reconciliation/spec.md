# Account Linked — Server-Side Reconciliation

## Why
Today's `linkAccountCreation` only fires at OTP verify time and only
matches by (a) explicit `?ls=<session_id>` carried through the signup
URL, or (b) case-insensitive email. Miss either signal and the lead
stays forever labelled "Email Submitted" even after they have a real
account in `users`. Every day we accumulate more ghost leads that
actually converted — which makes the funnel lie.

Two pragmatic realities this plan responds to:

1. **Cross-device signup is common.** A lead does the audit on their
   phone, reads the email on their laptop, clicks "Create Free
   Account" there. `?ls=` lives in phone localStorage — laptop has
   nothing. The backend falls back to email match. If they typed
   `user+test@biz.com` in the paywall but `user@biz.com` at signup,
   email fallback also misses.
2. **The link data already exists elsewhere** — `audit_processes.domain`,
   `step_self_gbp.placeId`, and `organizations.domain/name` are all
   populated by the time a user signs up. We're just not joining them.

The fix: stop trusting point-in-time link success. Derive link state
every time the admin list is rendered, via a confidence-ranked LEFT
JOIN across all the identifiers we have.

Also: rename the funnel stage from `account_created` → `account_linked`
in UI + future event writes. More honest — we're never sure we
*created* the account, only that we believe it's linked.

## What

1. **Rename in UI:** `account_created` → `account_linked`. The enum
   value stays for back-compat with existing rows, but every label map
   renders "Account Linked" (and the funnel bar label updates).
2. **Reconciliation JOIN on the list endpoint:** for every session
   that doesn't already have `user_id` set, LEFT JOIN `users` by email
   AND LEFT JOIN `organizations` via `audit_processes.domain` /
   `step_self_gbp->>'placeId'`. If any match hits, surface the
   match reason and render the session as "Account Linked" in the
   admin.
3. **Match reason badge** in the admin — a tiny pill next to the stage
   showing *why* the link happened (🔗 email / 🔗 domain / 🔗 place).
   Prevents silent false positives.
4. **Persistence via background sweep:** once a match is high-confidence
   (email exact OR place exact), write `user_id` + `converted_at` +
   `final_stage=account_linked` to the session row AND append the
   `account_linked` event. So the link survives past a session with
   missing join data, and exports are consistent with what admin sees.
5. **Match confidence hierarchy** (declarative, in code):
   - `email` (exact, case-insensitive) — highest confidence
   - `place_id` (`audit.step_self_gbp->>'placeId'` matches an
     `organizations.place_id`, if that column exists; else skip)
   - `domain` (`audit.domain` matches `organizations.domain`,
     case-insensitive) — medium
   - Fuzzy name — **out of scope** for this plan (see Risk #3)

## Context

### Relevant files — backend (`/Users/rustinedave/Desktop/alloro`)
- `src/controllers/leadgen-tracking/feature-services/service.account-linking.ts`
  — current `linkAccountCreation` + `findCandidateSessions`. Extend
  with `reconcileUnlinkedSessions()` or new module
  `service.account-reconciliation.ts`.
- `src/controllers/admin-leadgen/AdminLeadgenController.ts` — list
  endpoint's SQL (lines ~159-172). Needs the new LEFT JOINs and a
  derived `linked_via` column that's `NULL` for unlinked or one of
  `"email" | "place_id" | "domain"` for linked.
- `src/controllers/admin-leadgen/feature-services/service.funnel-aggregator.ts`
  — funnel service already counts `account_created`. Keep the SQL
  counter (the string stays `account_created` in historic data); add
  `account_linked` as a display label and include in future counts.
- `src/models/LeadgenSessionModel.ts` — `FinalStage` union stays. Add
  `account_linked` as a new legal value alongside `account_created`,
  OR treat them as synonyms for rendering.
- `src/database/connection.ts` — for raw knex.

### Relevant files — admin frontend (`alloro/frontend`)
- `src/components/Admin/LeadgenSubmissionsTable.tsx` — `STAGE_LABEL`,
  `STAGE_TONE`, and the `StagePill` component. Add `account_linked`
  entry with label "Account Linked".
- `src/components/Admin/LeadgenSubmissionDetail.tsx` — event icons
  map + label fallbacks. Map `account_linked` the same way as
  `account_created`.
- `src/components/Admin/LeadgenFunnelChart.tsx` — funnel row labels.
  Rename the row previously labelled "New Account Created".
- `src/types/leadgen.ts` — `FinalStage` union stays; add the new
  value AND keep the old for back-compat.

### Schema probe (confirm before building)
These are the joins we bet on. Confirm columns exist in prod before
implementation starts. If any is missing, drop that match tier (per
"be-surprised-check-first" rule):
```
organizations: id (int), name (varchar), domain (varchar),
               place_id (uuid|varchar|NULL?)
audit_processes: id (uuid), domain (varchar), step_self_gbp (jsonb)
leadgen_sessions: id (uuid), email (text), user_id (int), audit_id (uuid)
users: id (bigint), email (text)
```
Run the information_schema query in T0 to confirm column names.

### Patterns to follow
- **Server-side derivation, not client polling.** The admin UI already
  polls the list endpoint every 5s (shipped in a prior plan). The
  reconciliation logic lives inside that endpoint's SQL — no new
  loop, no new polling cadence.
- **`linkAccountCreation` stays** for the in-line signup path. It's
  the fast case. Reconciliation is the cleanup for when the fast
  case misses.
- **Idempotent persistence:** `reconcileUnlinkedSessions` writes
  `user_id` + `account_linked` event only once per session. Guarded
  by `WHERE user_id IS NULL` and the existing event-existence check.
- **Match reason stored in `event_data.linked_via`** — same convention
  the current link uses.

## Constraints

### Must
- Reconciliation JOIN runs inside the list endpoint query — single
  SQL round-trip, no N+1.
- Match hierarchy is a strict priority order: email > place > domain.
  If two match, email wins.
- High-confidence matches (email exact or place_id exact) are
  persisted to the session row — the derivation is not purely
  read-time. Low-confidence (domain) stays derivation-only unless
  admin manually confirms.
- **No automatic fuzzy matches.** Name-based matching is off by
  default in this plan.
- The rename from "Created" → "Linked" applies EVERYWHERE it was
  visible (table pill, detail drawer, funnel, CHANGELOG copy).
  Do not ship half-renamed.

### Must not
- Don't add a new cron job or background worker. Reconciliation
  happens at list-render time (cheap, derived) and opportunistically
  at OTP verify (current behavior).
- Don't drop or rename the `account_created` enum value in the DB —
  existing rows must continue to render as "Account Linked" via
  aliasing in the label map. Data migration is not worth it.
- Don't auto-merge sessions. We only attach a `user_id` and write the
  event; the session row keeps its own identity.

### Out of scope
- **Fuzzy practice-name matching.** High false-positive risk
  (Smile Dental A vs Smile Dental B). Deferred to a Phase 2 plan
  where admins confirm a "possible match" pill.
- **Manual override UI** — admin clicking "Link this session to user
  X" — useful but separate work.
- **Bulk backfill of existing unlinked sessions.** The derivation
  covers them on read; a one-off SQL UPDATE pass is a trivial post-
  deploy step, spec'd in the Done checklist below as optional.
- Migration to rename `final_stage = 'account_created'` rows to
  `account_linked` — label aliasing covers the display.

## Risk

**Level:** 2 (Concern — touches admin list SQL, funnel counting,
and identity resolution logic)

### Risks identified

1. **False positives on domain match.** Two dentists on Wix sharing
   `sitename.wixsite.com` — both get linked to the same
   organization. Or a leadgen session with `audit.domain = "facebook.com"`
   because the user entered a Facebook page. Nothing is a real
   identity signal for those.
   **Mitigation:** only match `audit_processes.domain` against
   `organizations.domain` when the domain is not in a hard-coded
   exclusion list (`facebook.com`, `instagram.com`, `wixsite.com`,
   etc. — maintain a small server-side blocklist). Domain matches
   are marked lower-confidence and do NOT persist; they stay read-
   time derivations until an admin promotes them.

2. **SQL performance at list-render time.** Three LEFT JOINs on each
   admin list render could get slow once `leadgen_sessions` >10k rows.
   **Mitigation:** indexes — `users.email` (probably already present),
   `organizations.domain`, and `organizations.place_id` (if used).
   Benchmark on prod-size dataset before shipping. Fall back to a
   cached/materialized view if needed (Phase 1.5).

3. **Fuzzy name matching temptation.** There will be pressure to add
   it once the email/place/domain matches don't catch 100%. Resist
   the temptation in this plan — do it as Phase 2 with explicit
   admin confirmation UX.

4. **Label-rename coordination hazard.** If we rename in frontend but
   not backend (or vice versa), the admin sees mismatched labels.
   **Mitigation:** touch both repos in the same plan execution,
   one CHANGELOG entry.

### Blast radius
- Backend: 1 service extension, 1 list-endpoint SQL change, 1 funnel-
  service label update. No migration, no new table.
- Admin frontend: 3-4 files (label maps + stage pill + one chart
  label). Visual-only.
- No schema change.

### Pushback
- Worth flagging: we're committing to the idea that *derivation at
  read time* is good enough. If the admin page ever becomes a
  customer-facing surface, this may become expensive. For internal
  admin use with <100 concurrent viewers, fine. Document the ceiling.

## Tasks

### T0: Schema probe — confirm join columns exist in prod
**Do:** run the information_schema query from the Context section
against prod DB. Confirm `organizations.domain` and `organizations.place_id`
(if we want place_id matching). If either is missing, drop that tier
from T2 and update this spec before execution.
**Files:** none (read-only probe)
**Depends on:** none
**Verify:** column list printed; spec amended if anything's missing.

---

### T1: Backend — extend `service.account-linking.ts` with match helpers
**Do:** Add two new exported helpers alongside the existing
`linkAccountCreation`:

- `findUserByEmail(email: string): Promise<UserRow | null>` — trivial
  lookup; case-insensitive.
- `findOrgForAudit(auditId: string): Promise<{ id: number; domain: string | null; place_id: string | null } | null>`
  — looks up the audit's `domain` and `step_self_gbp->>'placeId'`, then
  tries to match an `organizations` row by either. Returns the org
  plus which field matched.

These are the building blocks for T3 + T4. Small, testable, reused.
**Files:** `src/controllers/leadgen-tracking/feature-services/service.account-linking.ts`
**Depends on:** T0 (confirmed schema)
**Verify:** unit trace: seed a user with `foo@bar.com` + an
org with `domain=bar.com`; calling `findUserByEmail("foo@bar.com")`
returns the user; calling `findOrgForAudit(auditId)` where
audit.domain=bar.com returns the org + matchedVia="domain".

---

### T2: Backend — reconciliation SQL in the admin list endpoint
**Do:** Rewrite the list query in `AdminLeadgenController.ts`
(`listSubmissions`) to add:
- `LEFT JOIN users u ON LOWER(u.email) = LOWER(leadgen_sessions.email)`
- `LEFT JOIN organizations org_by_domain ON LOWER(org_by_domain.domain)
   = LOWER(audit_processes.domain) AND audit_processes.domain NOT IN
   ('facebook.com','instagram.com','wixsite.com','squarespace.com',
    'weebly.com','wordpress.com','godaddysites.com','site.google.com')`
- (if T0 confirms place_id exists) `LEFT JOIN organizations org_by_place
   ON org_by_place.place_id = audit_processes.step_self_gbp->>'placeId'`
- Derived column `linked_via` computed in SELECT:
  `CASE WHEN leadgen_sessions.user_id IS NOT NULL THEN 'persisted'
        WHEN u.id IS NOT NULL THEN 'email'
        WHEN org_by_place.id IS NOT NULL THEN 'place_id'
        WHEN org_by_domain.id IS NOT NULL THEN 'domain'
        ELSE NULL END AS linked_via`
- Pass `linked_via` through to the JSON response.

Add a TypeScript type `LinkedVia = "persisted" | "email" | "place_id" | "domain" | null`
to the response shape.
**Files:** `src/controllers/admin-leadgen/AdminLeadgenController.ts`,
`/Users/rustinedave/Desktop/alloro/frontend/src/types/leadgen.ts`
(add `linked_via?: LinkedVia` to `SubmissionSummary`)
**Depends on:** T1
**Verify:** curl the list endpoint, confirm `linked_via` appears in
the response. EXPLAIN ANALYZE the query on prod-size data — should
stay <100ms. If slower, add covering index.

---

### T3: Backend — persist high-confidence matches on OTP verify
**Do:** In `linkAccountCreation` (existing function), after the
email match path, ALSO try `findOrgForAudit(opts.auditId)` when
`opts.auditId` is supplied. If a place_id match hits, write the
session's `user_id` (inferred from the org's primary
`organization_users` row) + `account_linked` event. If only a
domain match, skip persistence (leave for derivation only).

This means: at signup time, if email or place hits, we write the
link durably. If only domain hits, the admin sees it derived but
no row change.

Also: every `account_created` event written by existing code paths
must ALSO be recognised as `account_linked` for rendering purposes.
**Files:** `src/controllers/leadgen-tracking/feature-services/service.account-linking.ts`
**Depends on:** T1
**Verify:** simulate a signup where email match fails but place
match hits — session row gets `user_id` set and `account_linked`
event appears in `leadgen_events`.

---

### T4: Funnel aggregator — treat `account_linked` + `account_created` as same stage
**Do:** In `service.funnel-aggregator.ts`, the bucket labelled
`account_created` (ordinal 13) now accepts EITHER event name.
Either add `account_linked` to the ordinal map at the same value
OR treat them as aliases in the CASE statement.
**Files:** `src/controllers/admin-leadgen/feature-services/service.funnel-aggregator.ts`,
`src/models/LeadgenSessionModel.ts` (add `account_linked` to
`FinalStage` union + `STAGE_ORDER`)
**Depends on:** T1
**Verify:** seed a session with `account_linked` event — funnel
bucket count includes it in the same tile as `account_created`.

---

### T5: Admin frontend — rename "Account Created" → "Account Linked"
**Do:**
- `frontend/src/types/leadgen.ts` — add `account_linked` to
  `FinalStage` union alongside `account_created`.
- `LeadgenSubmissionsTable.tsx:STAGE_LABEL` —
  `account_created: "Account Linked"`, ADD `account_linked: "Account Linked"`.
- `STAGE_TONE` — both map to `"green"`.
- `LeadgenFunnelChart.tsx` — if the funnel rows enumerate names,
  ensure the row for `account_created` renders label "Account Linked".
- `LeadgenSubmissionDetail.tsx:EVENT_ICONS` — map `account_linked` to
  `UserPlus` (same as `account_created`). Update
  `CTA_EVENT_LABEL` if applicable.
**Files:** the four files above
**Depends on:** T2 (type field added)
**Verify:** visually — every instance of "Account Created" in the
admin now says "Account Linked".

---

### T6: Admin frontend — render "linked_via" badge
**Do:** In the admin submissions list, next to the stage pill,
render a small info pill showing the match reason when
`linked_via !== null && linked_via !== 'persisted'`. Examples:
- `🔗 via email`
- `🔗 via place`
- `🔗 via domain`

For `persisted` matches (where the link is already stored on the
row), no badge — the stage pill alone is enough.

Use an inline `<LinkedViaBadge>` subcomponent in
`LeadgenSubmissionsTable.tsx`.

Also render it in the detail drawer near the stage summary.
**Files:** `LeadgenSubmissionsTable.tsx`,
`LeadgenSubmissionDetail.tsx`
**Depends on:** T2, T5
**Verify:** open admin after deploy, confirm a freshly-linked
session shows both the "Account Linked" pill AND the match-reason
badge next to it.

---

### T7: Optional one-off backfill SQL
**Do:** (NOT part of deploy — run manually if prod data warrants it.)
Single UPDATE that sets `user_id` + `final_stage='account_linked'`
+ writes `account_linked` events for any session where email
exact-matches a users row but `user_id IS NULL`.
Pattern already used earlier in the project (see `jelab83468`
backfill). Doc the snippet at the bottom of the CHANGELOG entry.
**Files:** none (operational)
**Depends on:** T3 shipped
**Verify:** SELECT count pre/post.

---

### T8: tsc + build verify (both projects)
**Do:** `npx tsc --noEmit` on backend, `npm run build` on admin
frontend. Both exit 0.
**Depends on:** all above
**Verify:** clean builds.

## Done

- [ ] Schema probe complete; spec unchanged (or amended if drops needed)
- [ ] Backend list endpoint returns `linked_via` for every row
- [ ] At signup, place_id match triggers `user_id` persistence + event
- [ ] Funnel aggregator counts `account_linked` in the same bucket as
      `account_created`
- [ ] Every admin UI label that said "Account Created" now says
      "Account Linked"
- [ ] Match-reason badge renders next to the stage pill when linking
      was derived (not persisted)
- [ ] tsc clean on backend, build clean on frontend
- [ ] `EXPLAIN ANALYZE` on the new list query shows <100ms on prod-size
      data (or an added index brings it there)
- [ ] No regression on existing direct-link (`?ls=`) flow
- [ ] CHANGELOG entry written — includes the optional backfill SQL in
      case admin wants to run it post-deploy
