# Mobile Responsive Refactor — Client-Facing Pages

## Why
The post-login client app was built desktop-first. On iPhone 16 (393×852, the standard iOS test target) — onboarding cards overflow viewport horizontally, headlines render at desktop sizes, padding/margin values dwarf the available width, and CTA cards fail to scale down. The user is testing the actual signup flow on their phone and the result is unusable. Left alone, mobile signup conversion will continue to leak.

This is a client-facing UX refactor — limited blast radius (admin pages out of scope), high leverage (every new account onboards through these screens).

## What
A focused, page-by-page responsive sweep with a **standardized Tailwind class vocabulary** that every refactored component adopts. End state: every targeted page renders cleanly on iPhone 16 (393px) AND on a 1440-wide desktop, with no horizontal scroll, no clipped content, no fixed widths that don't shrink, no font sizes that look like billboards on mobile.

**Targeted pages (in order of triage urgency):**
1. **Onboarding wizard** — `Step0_UserInfo` through `Step3_PlanChooser` + the `OnboardingContainer` shell. This is the highest-leverage page in the app.
2. **NewAccountOnboarding** — "Connect Your Practice" / Google API Terms / Connect Google flow. First post-signup screen.
3. **Settings parent + tabs** — Integrations / Users & Roles / Billing / Account. Daily-use surface for paying customers.
4. **BillingTab + Step3_PlanChooser plan card** — the `$2,000/month` Subscribe page. Currently overflows; revenue-critical.
5. **PageWrapper + DesignSystem primitives** — fix the underlying layout shell + shared components so future pages inherit responsive defaults instead of repeating the mistake.

## Context

### Relevant files (alloro frontend, `/Users/rustinedave/Desktop/alloro/frontend/`)

**Onboarding wizard:**
- `src/components/onboarding/OnboardingContainer.tsx` — multi-step shell
- `src/components/onboarding/Step0_UserInfo.tsx` — name fields
- `src/components/onboarding/Step1_PracticeInfo.tsx`
- `src/components/onboarding/Step2_DomainInfo.tsx`
- `src/components/onboarding/Step3_GBPSelection.tsx`
- `src/components/onboarding/Step3_PlanChooser.tsx` — plan card / Subscribe Now CTA

**First-run setup:**
- `src/pages/NewAccountOnboarding.tsx` — Google API terms + Connect Google
  - line 40: `text-4xl` headline, no responsive variant
  - line 71: `text-xl` step title
  - line 43: `text-lg` subtitle
  - line 59: `p-8` fixed card padding

**Settings:**
- `src/pages/Settings.tsx` — parent + tabs container
  - line 33: `max-w-[1400px] mx-auto` (fine)
  - line 36: `max-w-[1100px] px-6 lg:px-10` (no `sm:` middle step)
  - line 38: `text-4xl` icon (no responsive)
  - line 45: `text-3xl lg:text-5xl` headline (gap from 3xl → 5xl with no sm/md step)
  - line 58: `max-w-[1100px] px-6 lg:px-10`
- `src/pages/settings/BillingRoute.tsx` (route wrapper)
- `src/components/settings/BillingTab.tsx` — billing UI

**Layout shell:**
- `src/components/PageWrapper.tsx` — desktop sidebar at `lg:pl-72`, mobile header `h-16 px-4 sm:px-6`
- `src/App.tsx:99-175` — route declarations

**Design system primitives (currently NOT responsive — fix here amplifies everywhere):**
- `src/components/ui/DesignSystem.tsx`
  - `MetricCard:43` — `p-6` + `text-3xl` value, all fixed
  - `CompactTag:93` — `px-1.5 py-0.5 text-[8px]`, fixed
  - `SectionHeader:127` — `text-[10px]` uppercase, fixed
  - `PageHeader:145+` — pattern needs verification

**Tailwind config:** none (uses default v4 breakpoints — `sm:640 md:768 lg:1024 xl:1280 2xl:1536`).

### Patterns to follow

**Reference analogs (already do mobile right):**
1. `src/components/ReferralEngineDashboard.tsx:~143` — `p-10 lg:p-16 flex flex-col md:flex-row items-center justify-between gap-12`
2. `src/components/PMS/PMSVisualPillars.tsx:~48` — `p-6 sm:p-10 lg:p-14 flex flex-col md:flex-row items-center justify-between gap-12`
3. `src/components/dashboard/NotificationWidget.tsx` — `text-sm lg:text-base text-slate-500`

These set the precedent: 3-tier padding ladders, `flex-col md:flex-row` for stacking, responsive text scaling.

**Standardized class vocabulary (apply consistently across the refactor):**

| Concern | Mobile (default) | sm: (640+) | md: (768+) | lg: (1024+) |
|---|---|---|---|---|
| Card padding | `p-4` | `sm:p-6` | — | `lg:p-8` |
| Section padding (page-level) | `px-4 py-6` | `sm:px-6` | `md:px-8 md:py-8` | `lg:px-10 lg:py-10` |
| Headline (h1) | `text-2xl` | `sm:text-3xl` | — | `lg:text-4xl` |
| Sub-headline (h2) | `text-xl` | `sm:text-2xl` | — | `lg:text-3xl` |
| Body (lg) | `text-base` | — | — | `lg:text-lg` |
| Body (sm) | `text-sm` | — | — | `lg:text-base` |
| Card max-width | `w-full max-w-md` | `sm:max-w-lg` | — | `lg:max-w-xl` |
| Layout direction | `flex-col` | — | `md:flex-row` | — |
| Gaps between cards | `gap-3` | `sm:gap-4` | — | `lg:gap-6` |

This is the table to enforce. Reviewers should reject diffs that re-introduce `text-3xl` or `p-8` without responsive prefixes.

### Reference files for new patterns
- `PMS/PMSVisualPillars.tsx` — closest existing analog of "card + content in a centered viewport that scales" — match its padding/flex pattern.

## Constraints

### Must
- Every refactored page must render with **no horizontal scroll** at 393px (iPhone 16 portrait).
- Every refactored page must render with no horizontal scroll at 320px (iPhone SE 1st gen) — the legacy floor we still respect.
- Existing desktop appearance must be preserved at >=1024px. No regressions.
- Use the standardized class vocabulary above. Don't invent new responsive ladders per-page.
- Touch typography (text-*), padding/margin (p-*, m-*, px-*, py-*), and layout direction (flex-col/row, grid-cols-*). Color, brand, copy, behavior — all unchanged.

### Must not
- Don't introduce a CSS-in-JS library or styled-components. Tailwind only.
- Don't refactor logic/state/handlers. Class-string changes only.
- Don't change the wizard step structure or order.
- Don't add new pages.
- Don't rename props or component names — diff stays narrow.
- Don't replace `react-leaflet` map widgets or other heavy embeds; just ensure they're contained inside a responsive parent.

### Out of scope
- Admin pages (`/admin/*` routes) — different audience, different priorities.
- Authentication pages (`/signup`, `/login`, `/verify-email`) — covered by the auth-flow plan separately.
- Public-facing leadgen tool — already covered, separate repo.
- Adding "skip payment" CTA on the subscribe page — already merged from another instance per user.
- Dark mode, RTL support, accessibility audits beyond the basics that come for free with Tailwind defaults.

## Risk

**Level:** 2 (Concern — high churn surface area, mostly visual)

### Risks identified

1. **Visual regression on desktop.** Changing `text-3xl` to `text-2xl sm:text-3xl` correctly scales mobile but if applied wrongly (e.g. missing the `sm:` step) shrinks desktop too.
   **Mitigation:** Per-page acceptance criteria below — every refactored page checked at both 393px and 1440px before marked done.

2. **Over-zealous refactor of DesignSystem primitives breaks pages we didn't audit.** `MetricCard` is used everywhere in admin too.
   **Mitigation:** DesignSystem primitives get a *parameterized* `size` prop default of `"md"` that preserves current behavior. Calling sites that opt into responsive sizing pass `size={{ base: "sm", lg: "md" }}` or similar. Old call sites unchanged.

3. **Card max-widths centered on small screens look like floating boxes.** Card with `max-w-md` (28rem ≈ 448px) on a 393px viewport already fills screen — fine. But `max-w-lg` (32rem ≈ 512px) overflows.
   **Mitigation:** Card classes always start with `w-full` before `max-w-*`. Audit during the refactor.

4. **Long button labels wrap awkwardly on mobile.** "Read Our Google API Terms" + "REQUIRED" badge in NewAccountOnboarding stacks weird on narrow screens.
   **Mitigation:** Short copy stays inline; long copy gets `flex-col` on mobile, `flex-row` on `sm:`.

### Blast radius
- ~12-15 component files (5 onboarding, 3 settings/billing, 2 page shells, ~4 design-system primitives).
- Zero backend changes. Zero migration. Zero new dependencies.
- Test coverage: visual-only — automated regression isn't realistic for a Tailwind class refactor without snapshot testing infra (out of scope).

### Pushback
- We're refactoring DesignSystem primitives in this plan. That's a small architectural departure — DesignSystem becomes the place where responsive defaults LIVE, not just where shared atoms live. Worth acknowledging: future component additions to DesignSystem must follow the responsive-default rule too. Add a one-line comment at the top of `DesignSystem.tsx` enforcing this.
- An alternative is to leave DesignSystem alone and only fix specific pages. Faster but doesn't prevent the next dev from re-introducing the same issue. **Recommend the deeper fix** — costs maybe 2 extra hours, saves the team from a future "why does the new admin page look bad on mobile" cycle.

## Tasks

Each task is a self-contained file edit. Group A is foundation; Group B is per-page application. Group A blocks Group B for the design-system pieces but not for direct page edits — those can run in parallel once A1 lands.

---

### A. Foundation

#### T1: PageWrapper responsive audit
**Do:** Walk `src/components/PageWrapper.tsx` line-by-line. The mobile header (h-16, px-4 sm:px-6) is fine. The `<main>` section needs verification — ensure the desktop sidebar offset (`lg:pl-72` / `lg:pl-[68px]`) doesn't apply on mobile (it shouldn't; `lg:` is desktop-only). Confirm no fixed widths inside main.

If anything's off, fix per the standardized vocabulary.
**Files:** `src/components/PageWrapper.tsx`
**Verify:** Open any page wrapped by PageWrapper at 393px width; no horizontal scroll, mobile header visible, main content reachable.

#### T2: DesignSystem primitives — responsive defaults
**Do:** Each primitive (`MetricCard`, `CompactTag`, `SectionHeader`, `PageHeader`) gets a responsive default class string. Replace fixed `text-3xl` with `text-2xl sm:text-3xl` (etc.) inside the component. Add a doc comment at top of `DesignSystem.tsx`:
```ts
/**
 * Responsive-by-default. Every primitive must scale cleanly from 320px to
 * 1920px. Fixed font/padding values in this file are reviewed at PR time.
 */
```
For `MetricCard` specifically: `p-4 sm:p-6 lg:p-8` for the card; `text-2xl sm:text-3xl` for the value; existing label classes already small enough.
**Files:** `src/components/ui/DesignSystem.tsx`
**Depends on:** none
**Verify:** Spin up the dashboard page that uses MetricCard — check at 393px and 1440px. No regression.

#### T3: Standardized class vocabulary doc
**Do:** Add a short markdown file `frontend/docs/responsive-vocabulary.md` (create the dir if needed) containing the table from the spec's "Patterns to follow" section. Link to it from the top of `DesignSystem.tsx`.
**Files:** `frontend/docs/responsive-vocabulary.md` (new), `src/components/ui/DesignSystem.tsx` (one comment line)
**Depends on:** none
**Verify:** N/A — docs only.

---

### B. Per-page refactors

Each page-level task: open the file, identify violations against the standardized vocabulary table, fix them, leave a note in commit message saying "no copy/behavior changes". Acceptance criterion is the same for all: **renders cleanly at 393px AND 1440px, no regressions**.

#### T4: NewAccountOnboarding (Connect Your Practice)
**Do:** Apply standardized vocab to:
- line 40 headline `text-4xl` → `text-2xl sm:text-3xl lg:text-4xl`
- line 43 subtitle `text-lg` → `text-base sm:text-lg`
- line 59 card `p-8` → `p-4 sm:p-6 lg:p-8`
- line 71 step title `text-xl` → `text-lg sm:text-xl`
- "Read Our Google API Terms" + REQUIRED badge: container `flex-col sm:flex-row` so the badge wraps below the title on narrow screens
**Files:** `src/pages/NewAccountOnboarding.tsx`
**Depends on:** T3 (vocab doc reference)
**Verify:** iPhone 16 viewport — no overflow, cards fit, headline doesn't dwarf the screen.

#### T5: OnboardingContainer + Step components
**Do:** Apply vocab to the wizard container and all 5 step components:
- Container header (1/2/3/4 step indicator) — keep usable on narrow screens
- Step cards: `p-4 sm:p-6 lg:p-8`
- Step headlines: `text-xl sm:text-2xl lg:text-3xl`
- Form inputs: full-width on mobile (`w-full`), no fixed widths
- "Continue" button: `w-full sm:w-auto` so it stretches on mobile
- The 1/2/3/4 indicator bar at top: ensure it doesn't overflow at 320px — may need `gap-2 sm:gap-4` on the connecting lines
**Files:** `src/components/onboarding/OnboardingContainer.tsx`, `Step0_UserInfo.tsx`, `Step1_PracticeInfo.tsx`, `Step2_DomainInfo.tsx`, `Step3_GBPSelection.tsx`, `Step3_PlanChooser.tsx`
**Depends on:** T3
**Verify:** All four steps reachable on iPhone 16 with no scroll-to-find buttons, no wrapping issues.

#### T6: Step3_PlanChooser plan card
**Do:** The `$2,000/month` plan card specifically:
- line 67 `max-w-md mx-auto` → `w-full max-w-md mx-auto sm:max-w-lg` (already shrinks but doesn't grow on tablet)
- line 80 price `text-3xl` → `text-2xl sm:text-3xl lg:text-4xl`
- line 71 plan heading `text-xl` → `text-lg sm:text-xl lg:text-2xl`
- Subscribe Now button: `w-full` (already?) — full width on mobile
- Feature checklist rows: ensure each row uses `gap-2 sm:gap-3`, no wrapping
**Files:** `src/components/onboarding/Step3_PlanChooser.tsx`
**Depends on:** T5 (same component family)
**Verify:** iPhone 16 — the plan card doesn't overflow, Subscribe Now is reachable without scroll, price legible but not gigantic.

#### T7: Settings parent
**Do:** `src/pages/Settings.tsx`:
- line 36, 58 `px-6 lg:px-10` → `px-4 sm:px-6 md:px-8 lg:px-10`
- line 38 icon `text-4xl` → `text-2xl sm:text-3xl lg:text-4xl`
- line 45 headline `text-3xl lg:text-5xl` → `text-2xl sm:text-3xl md:text-4xl lg:text-5xl`
- Tab bar (Integrations/Users&Roles/Billing/Account): ensure it scrolls horizontally on mobile via `overflow-x-auto` if it can't fit; otherwise `flex-wrap`. Whichever matches existing UX better.
**Files:** `src/pages/Settings.tsx`
**Depends on:** T3
**Verify:** Tabs reachable on iPhone 16, headline doesn't dwarf, "Practice Details" card content visible.

#### T8: BillingTab + BillingRoute
**Do:** `src/pages/settings/BillingRoute.tsx` is just a wrapper — usually nothing to do unless it sets a max-width. Audit and fix if so.

`src/components/settings/BillingTab.tsx` — apply vocab to all card padding, headlines, and especially any pricing/plan UI inside. Should match the same look as Step3_PlanChooser since both display a plan card.
**Files:** `src/pages/settings/BillingRoute.tsx`, `src/components/settings/BillingTab.tsx`
**Depends on:** T6 (matching plan card pattern)
**Verify:** Settings → Billing tab on iPhone 16 — readable, no overflow.

---

### C. Cleanup + acceptance

#### T9: Cross-page sweep at 393px and 1440px
**Do:** Open every refactored page in browser at both viewport widths. Take screenshots (locally, don't commit). Confirm:
- No horizontal scroll at 393px
- No regression at 1440px
- All CTAs reachable without overflow
- Headlines readable but proportional
**Files:** none (verification step)
**Depends on:** T4-T8 all done
**Verify:** Screenshots show clean rendering at both widths.

#### T10: Type-check + lint
**Do:** `npx tsc --noEmit` in `frontend/`; fix anything caught.
**Files:** none (verification)
**Depends on:** T4-T8
**Verify:** Exit code 0.

## Done

- [ ] `npx tsc --noEmit` zero errors
- [ ] iPhone 16 (393px) — every refactored page renders without horizontal scroll
- [ ] iPhone SE (320px) — every refactored page renders without horizontal scroll (regression floor)
- [ ] 1440px desktop — no visual regression on any refactored page
- [ ] DesignSystem.tsx has the responsive-defaults doc comment
- [ ] `frontend/docs/responsive-vocabulary.md` exists and is referenced from DesignSystem.tsx
- [ ] No copy or behavior changes — class strings only
- [ ] Onboarding wizard, NewAccountOnboarding, Settings parent, BillingTab, Step3_PlanChooser all visually verified on iPhone 16 simulator OR real device
- [ ] CHANGELOG entry written
