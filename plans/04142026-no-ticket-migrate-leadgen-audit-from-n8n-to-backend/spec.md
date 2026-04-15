# Migrate Leadgen Audit Pipeline from n8n to signalsai-backend

## Why
The leadgen audit pipeline currently runs in n8n with the backend acting only as a thin webhook relay. This creates a hard dependency on an external orchestration tool, splits debugging/observability across two systems, and couples the frontend polling contract to n8n's database writes. Migrating to an in-process BullMQ pipeline consolidates the stack, removes the n8n operational surface, and lets the team evolve prompts/agents in one codebase.

## What
Replace `triggerAuditWorkflow()` in `signalsai-backend` with a native BullMQ job that runs the five audit stages end-to-end (screenshots → website analysis → self GBP → competitor GBP → GBP analysis). All LLM work moves to Claude Sonnet 4.6 via the existing `service.llm-runner.ts`. All n8n webhook calls related to `WEB_SCRAPING_TOOL_AGENT_WEBHOOK` are removed. Frontend polling contract (`GET /audit/:id/status`) stays unchanged.

Done when: a request to `POST /audit/start` enqueues a BullMQ job that produces the same `audit_processes` row shape n8n produces today, with matching `realtime_status` progression (0 → 5), and the existing leadgen tool frontend polls and renders the result without modification.

## Context

**Relevant files (signalsai-backend):**
- `src/controllers/audit/audit-services/auditWorkflowService.ts` — current n8n trigger, to be replaced
- `src/controllers/audit/audit.controller.ts` — calls `triggerAuditWorkflow`
- `src/controllers/audit/audit-services/auditRetrievalService.ts` — status/detail normalization, stays
- `src/controllers/audit/audit-services/auditUpdateService.ts` — step update wrapper, stays
- `src/models/AuditProcessModel.ts` — `audit_processes` table model (loose `unknown` types, to strengthen)
- `src/controllers/scraper/feature-services/service.scraping-orchestrator.ts` — `scrapeHomepage()` already returns desktop + mobile + markup + metrics + NAP, call directly (skip HTTP hop)
- `src/controllers/practice-ranking/feature-services/service.apify.ts` — existing Apify client, uses `compass~crawler-google-places` (same actor n8n uses); need new functions for FULL-field GBP extraction (n8n minimizes 23 fields incl. reviews, imageUrls, ownerUpdates — current service returns simplified subset)
- `src/agents/service.llm-runner.ts` — Claude Sonnet 4.6 default, JSON extraction built in; needs multimodal extension for website image analysis
- `src/agents/service.prompt-loader.ts` — loads `.md` files from `src/agents/{group}/`
- `src/workers/queues.ts` — BullMQ queue factory (`getMindsQueue()`); extend with `getAuditQueue()`
- `src/workers/worker.ts` — worker process, register new audit processor here
- `src/workers/processors/*` — existing processor pattern to mirror

**Patterns to follow:**
- Agent prompts: markdown files under `src/agents/{group}/` loaded via `getPrompt(path)` (analog: `src/agents/monthlyAgents/Summary.md`)
- LLM calls: `runAgent({ systemPrompt, userMessage, prefill })` returns `{ raw, parsed, model, inputTokens, outputTokens }`
- BullMQ processor: see `src/workers/processors/scrapeCompare.processor.ts` for queue/worker wiring
- Service file naming: `service.{feature}.ts` inside `{controller}/feature-services/`
- DB step writes go through `auditUpdateService.ts` (reuse, don't duplicate)

**Reference files:**
- Prompt analog: `src/agents/monthlyAgents/Summary.md` — structure, role identity, JSON schema at bottom
- Processor analog: `src/workers/processors/scrapeCompare.processor.ts` — BullMQ worker pattern
- Queue factory analog: `src/workers/queues.ts:23` — `getMindsQueue()`
- Apify extension analog: `service.apify.ts:292` — `getCompetitorDetails()` for full-field scraping pattern

**n8n workflow export (authoritative source):** `/Users/rustinedave/Desktop/Leadgen Analysis Agent.json` — all prompts, JS code nodes, field minimization logic verbatim.

## Constraints

**Must:**
- Use Claude Sonnet 4.6 (`claude-sonnet-4-6`) for all three migrated prompts
- Preserve `audit_processes` table schema (column names, step JSON shapes) so the leadgen tool polls unchanged
- Keep `realtime_status` progression (0=created, 1=screenshots, 2=website, 3=self_gbp, 4=competitors, 5=gbp_analysis, `status=completed`)
- Match n8n's minimized GBP field list exactly (23 fields per entry) — see n8n `parse1`/`parse3` code nodes
- Screenshots uploaded to S3 at `leadgen-screenshots/{audit_id}-{desktop|mobile}.png`
- Use existing `service.scraping-orchestrator.ts` directly (no internal HTTP)
- Stages 1 (screenshots), 2 (website analysis), 3 (self GBP), 4 (competitors) run in parallel where independent (matches n8n parallelism); stage 5 (GBP analysis) waits on 3+4+2
- LLM outputs must be JSON-parseable; use `prefill: "{"` pattern + rely on `extractJson` from runner
- Errors at any stage set `audit_processes.status="failed"` + `error_message` and do not leave partial state

**Must not:**
- Introduce Gemini SDK calls — Anthropic only
- Touch `service.rybbit.ts`, existing skill triggers, or unrelated n8n webhooks (this plan is scoped to `WEB_SCRAPING_TOOL_AGENT_WEBHOOK` only)
- Modify the frontend polling contract
- Add new environment variables beyond those already present (APIFY_TOKEN, AWS_*, ANTHROPIC_API_KEY)
- Refactor `service.llm-runner.ts` beyond adding image-message support (no provider abstraction layer yet)

**Out of scope:**
- Submissions tracker / admin UI (separate plan)
- Prompt quality tuning beyond parity with n8n
- Removing other n8n webhooks (skills, emails, practice ranking) — different contracts, different plans
- Retiring n8n entirely — only the leadgen audit workflow is migrated here
- Strengthening every `unknown` type across unrelated models
- Backfilling existing in-flight audits (assume clean cutover)

## Risk

**Level: 3 — Structural Risk**

**Risks identified:**

- **Claude vs Gemini scoring drift.** The current GBP and website analysis prompts were tuned against Gemini 2.5-flash. Claude will interpret identical prompts differently — scores, action item wording, and grade letters will shift. → **Mitigation:** port prompts verbatim as v1, run a side-by-side sanity check on 3–5 known domains before cutover, tune if drift is material. Acceptable baseline: same grade letter (A/B/C/D/F) for ≥80% of cases. Document this as an explicit non-goal of "numerical parity."
- **Apify full-field extraction.** Existing `getCompetitorDetails()` returns `CompetitorDetailedData` (simplified). The audit pipeline needs the raw 23-field minimized shape including `reviews`, `imageUrls`, `ownerUpdates`, `openingHours`, `reviewsDistribution`, etc. → **Mitigation:** add new functions `scrapeSelfGBP()` and `scrapeCompetitorGBPs()` that return the full shape; do not retrofit existing `CompetitorDetailedData` consumers.
- **Multimodal LLM runner extension.** `runAgent` currently takes string `userMessage`. Adding image support changes the content block shape. → **Mitigation:** extend with optional `images: Array<{ media_type, data }>` param; wrap into `content: [{type:"image"...}, {type:"text"...}]` when present; keep string-only backward compatible.
- **Long-running jobs vs BullMQ defaults.** Full audit can run 3–5 min (Apify calls are 60–120s each). BullMQ default stalled-job timeout may interfere. → **Mitigation:** set `lockDuration: 600000` (10 min) on the worker, use `job.updateProgress()` to keep lock alive across stages.
- **Parallel stage convergence.** Stage 5 (GBP analysis) needs outputs from stages 2, 3, 4. If one fails and others succeed, we need clean state. → **Mitigation:** sequential-with-parallel-branches — implement as `await Promise.all([stage2, stage3Then4])` inside the job; any rejection fails the whole job; partial writes are fine because checkpoints already landed in DB before failure.
- **Missing `audit_processes` migration.** The table exists in DB but no backend-owned migration creates it. Schema drift risk is high. → **Mitigation:** write a defensive migration (`CREATE TABLE IF NOT EXISTS`) that matches current production shape with strict column types; also enforce stricter TS types in `IAuditProcess`.

**Blast radius:**
- `audit_processes` table — readers: `audit.controller.ts`, `auditRetrievalService.ts`, leadgen tool frontend
- `auditWorkflowService.ts` — caller: `audit.controller.ts:startAudit`
- `service.apify.ts` — existing callers: `practice-ranking` controllers (do not touch their `CompetitorDetailedData` consumers)
- `service.llm-runner.ts` — callers: all existing agent runners (signature change must be additive/backward-compat)
- `WEB_SCRAPING_TOOL_AGENT_WEBHOOK` env — only referenced in `auditWorkflowService.ts`, safe to remove

**Pushback:**
- Not touching the loose `unknown` types on fields unrelated to the 5 step columns, even though they'd benefit from tightening. Scope discipline — do that in a follow-up. Narrator: it stayed `unknown`.
- Keeping a "JSON cleanup validator" step as n8n does it would be redundant given Claude + runner's built-in `extractJson`. Dropped.

## Tasks

### T1: Backend migration for `audit_processes` + type strengthening
**Do:** Write `src/database/migrations/{timestamp}_ensure_audit_processes.ts` with `createTable IF NOT EXISTS` matching current production shape: `id` (uuid/string PK), `domain` text, `practice_search_string` text, `status` varchar(32), `realtime_status` integer, `error_message` text nullable, `step_screenshots/website_analysis/self_gbp/competitors/gbp_analysis` jsonb nullable, `created_at/updated_at` timestamps. Strengthen `IAuditProcess` in `AuditProcessModel.ts` with explicit interfaces for each step JSON (based on n8n output shapes documented in spec — see migrations folder).
**Files:** `src/database/migrations/{timestamp}_ensure_audit_processes.ts`, `src/models/AuditProcessModel.ts`
**Depends on:** none
**Verify:** `npm run migrate` succeeds on clean DB; `npx tsc --noEmit` — zero errors; existing `auditRetrievalService` consumers compile.

### T2: Apify full-field GBP extraction
**Do:** Add `scrapeSelfGBP(searchString: string)` and `scrapeCompetitorGBPs(searchString: string, limit=7)` to a NEW file `src/controllers/audit/audit-services/service.audit-apify.ts` (not mixed into `practice-ranking/service.apify.ts` to keep consumer boundaries clean). Functions call `compass~crawler-google-places` actor and return the 23-field minimized shape matching n8n's `parse1`/`parse3` output (verbatim field list in n8n JSON lines 1200–1260). Include `reviews`, `imageUrls`, `reviewsDistribution`, `openingHours`, `ownerUpdates`.
**Files:** `src/controllers/audit/audit-services/service.audit-apify.ts`
**Depends on:** none
**Verify:** Unit test against a known placeId; confirms 23 fields present on both single + multi result paths.

### T3: S3 screenshot upload helper
**Do:** Add `uploadAuditScreenshot(auditId: string, variant: "desktop"|"mobile", base64: string): Promise<string>` that uploads to bucket `AWS_S3_IMPORTS_BUCKET` at key `leadgen-screenshots/{auditId}-{variant}.png`, returns full URL. Decode base64 → Buffer, content-type `image/png`, public-read not required (the leadgen tool fetches via URL — confirm bucket policy allows public GET or use presigned). Reuse existing S3 client from `src/utils/` if present; otherwise new client in `src/controllers/audit/audit-services/service.audit-s3.ts`.
**Files:** `src/controllers/audit/audit-services/service.audit-s3.ts`
**Depends on:** none
**Verify:** Manual: upload a test image, GET the returned URL in a browser, confirm 200.

### T4: Migrated agent prompts (Claude Sonnet 4.6)
**Do:** Create three prompt files under `src/agents/auditAgents/`:
- `CompetitorStringBuilder.md` — ports n8n "agent1" prompt (Webhook.body.practice_search_string + GBP address → `{competitor_string, self_compact_string}`)
- `WebsiteAnalysis.md` — ports n8n "Analyze an image" prompt (multimodal; images + HTML markup + telemetry → website scoring JSON per n8n schema)
- `GBPAnalysis.md` — ports n8n "agent" prompt (client GBP + site markup + competitors → gbp_readiness_score + pillars JSON per n8n schema)
Strip "No Unexpected token" Gemini-specific escape hatches; trust Claude + runner's `extractJson`. Keep the strict scoring posture and schemas verbatim.
**Files:** `src/agents/auditAgents/CompetitorStringBuilder.md`, `src/agents/auditAgents/WebsiteAnalysis.md`, `src/agents/auditAgents/GBPAnalysis.md`
**Depends on:** none
**Verify:** `getPrompt("auditAgents/CompetitorStringBuilder")` loads; schema in each prompt matches n8n-exported output shape.

### T5: Multimodal extension to `runAgent`
**Do:** Extend `LlmRunnerOptions` with optional `images?: Array<{ mediaType: "image/png"|"image/jpeg"; base64: string }>`. When present, wrap `userMessage` as multi-block content array `[{type:"image", source:{type:"base64",...}}, ..., {type:"text", text: userMessage}]`. String-only callers unaffected.
**Files:** `src/agents/service.llm-runner.ts`
**Depends on:** none
**Verify:** `npx tsc --noEmit` zero errors; existing agent callers (Summary, Opportunity, etc.) still compile and behave identically.

### T6: Audit queue + BullMQ processor
**Do:**
1. Add `getAuditQueue(name: string)` to `src/workers/queues.ts` with prefix `{audit}`, connection-shared.
2. Create `src/workers/processors/auditLeadgen.processor.ts` with `Worker` binding to queue `audit-leadgen`. Job data: `{ auditId, domain, practiceSearchString }`. Processor flow:
   - Load audit row, set `status=processing`, `realtime_status=0`
   - Call `scrapeHomepage(domain)` directly (internal function)
   - Parallel fan-out using `Promise.all`:
     - **Branch A:** `uploadAuditScreenshot` desktop + mobile → update `step_screenshots` + `realtime_status=1`
     - **Branch B:** `runAgent` with `auditAgents/WebsiteAnalysis` + images + markup → update `step_website_analysis` + `realtime_status=2`
     - **Branch C (sequential sub-chain):**
       - `runAgent` with `auditAgents/CompetitorStringBuilder` → `{competitor_string, self_compact_string}`
       - `scrapeSelfGBP(self_compact_string)` → update `step_self_gbp` + `realtime_status=3`
       - `scrapeCompetitorGBPs(competitor_string, 7)` → update `step_competitors` + `realtime_status=4`
   - After all branches: `runAgent` with `auditAgents/GBPAnalysis` (client GBP + markup + competitors) → update `step_gbp_analysis` + `realtime_status=5` + `status=completed`
   - On any error: `status=failed`, `error_message=err.message`, rethrow so BullMQ records failure
   - `job.updateProgress()` called at each checkpoint to keep lock alive
3. Worker options: `lockDuration: 600000`, `concurrency: 3`, `removeOnComplete: {count: 100}`, `removeOnFail: {count: 50}`
4. Register processor in `src/workers/worker.ts`
**Files:** `src/workers/queues.ts`, `src/workers/processors/auditLeadgen.processor.ts`, `src/workers/worker.ts`
**Depends on:** T1, T2, T3, T4, T5
**Verify:** Enqueue a job with a known test domain; DB row progresses 0→5; final row has all 5 step columns populated; `status=completed`.

### T7: Replace `auditWorkflowService.ts` with queue enqueue
**Do:** Rewrite `auditWorkflowService.ts` so `triggerAuditWorkflow(domain, practiceSearchString)` now:
1. Inserts a new `audit_processes` row (previously n8n did this) with `status=pending`, `realtime_status=0`
2. Adds a BullMQ job via `getAuditQueue("leadgen").add("process", { auditId, domain, practiceSearchString })`
3. Returns `auditId`
Delete the `N8N_WEBHOOK_URL` constant and fetch call. Remove `WEB_SCRAPING_TOOL_AGENT_WEBHOOK` from `.env.example` if present.
**Files:** `src/controllers/audit/audit-services/auditWorkflowService.ts`
**Depends on:** T6
**Verify:** `POST /audit/start` returns `audit_id` immediately; DB row exists with `status=pending`; job picked up by worker within seconds.

### T8: End-to-end parity test
**Do:** Write a test script `src/controllers/audit/audit.e2e-test.ts` (not part of CI, ad-hoc run) that takes a test domain + search string, triggers an audit, polls `GET /audit/:id/status` until completion, and prints the final step JSON shapes. Document the Claude-vs-Gemini drift observation in a `NOTES.md` alongside the spec (not in CHANGELOG).
**Files:** `src/controllers/audit/audit.e2e-test.ts`, `plans/04142026-no-ticket-migrate-leadgen-audit-from-n8n-to-backend/NOTES.md`
**Depends on:** T7
**Verify:** Manual: run against 3 known domains; step JSON shapes match n8n; no schema drift in frontend rendering.

## Done

- [ ] `npm run build` passes in signalsai-backend
- [ ] `npx tsc --noEmit` — zero errors from this work
- [ ] `npm run migrate` creates `audit_processes` table idempotently
- [ ] `POST /audit/start` returns `{ audit_id }` and enqueues a BullMQ job (no n8n call)
- [ ] Worker processes the job end-to-end; DB row progresses `realtime_status` 0→5
- [ ] All 5 step columns populated with schemas matching n8n output shape
- [ ] Leadgen tool frontend (`main` branch) polls `/audit/:id/status` and renders results identically to the n8n-backed flow (visual parity)
- [ ] Manual: run on 3 test domains; all complete successfully; grade letters within acceptable drift vs n8n baseline
- [ ] `WEB_SCRAPING_TOOL_AGENT_WEBHOOK` no longer referenced in code
- [ ] No regressions in practice-ranking, skills, email pipelines (other n8n webhooks untouched)
