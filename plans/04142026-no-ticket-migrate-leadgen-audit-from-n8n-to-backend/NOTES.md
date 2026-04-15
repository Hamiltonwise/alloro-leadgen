# Execution notes — 2026-04-14

Integration notes for T6/T7/T8 of the leadgen audit migration from n8n to
`signalsai-backend`. Read before running the e2e test against production
traffic.

## Claude-vs-Gemini scoring drift disclaimer

The three prompts (`CompetitorStringBuilder`, `WebsiteAnalysis`, `GBPAnalysis`)
were originally tuned against Gemini 2.5-flash inside n8n. They now run against
Claude Sonnet 4.6 via `service.llm-runner.ts`. Expect drift:

- **Numerical scores will shift.** A 78 under Gemini may become a 71 or an 84
  under Claude with the same prompt. This is normal and not a regression — the
  scoring posture in the prompt is intentionally strict, and Claude interprets
  that posture more literally than Gemini did.
- **Grade letters are the stability contract.** Acceptable baseline: same grade
  letter (A/B/C/D/F) for ≥ 80% of test cases across the 3 known domains below.
- **Action-item wording will differ.** Claude tends to write tighter, more
  directive copy; Gemini tended toward hedged/verbose. This is fine unless a
  frontend expectation broke.
- **What is NOT OK:** empty pillars, invalid JSON, missing `top_action_items`,
  or scoring that contradicts the strict-posture language in the prompt.

If drift exceeds the 80% grade-parity threshold, revisit the prompt's scoring
weights — do not change the model.

## Implementation divergences from pure n8n parity

- **CompetitorStringBuilder runs without GBP address pre-hint.** In n8n, the
  workflow fed both `practice_search_string` and a pre-fetched GBP address
  into this agent. The backend port runs it with only `practice_search_string`
  because the self-GBP scrape now *follows* the string builder in the pipeline
  (the builder produces the `self_compact_string` that seeds the scrape).

  This is an intentional simplification — it drops a coupling and a pre-call
  to Apify. If the builder's `self_compact_string` output is materially worse
  without the address hint, two options:
    1. Run a pre-scrape to fetch the address, then pass it in (adds 30–60s).
    2. Tune the prompt to infer city/state more aggressively from the raw
       search string alone. Prefer option 2.

  Validate during the e2e runs — if the self-GBP scrape returns the wrong
  business or no business, the simplification needs reverting.

- **No JSON cleanup validator step.** n8n had a post-agent "clean JSON"
  validator. Dropped here because Claude + the runner's built-in `extractJson`
  fence-stripping + brace-matching handles the same failure modes.

- **Partial-failure writes are persistent.** If Branch C fails after Branch A
  succeeds, the `step_screenshots` column stays populated and the row is marked
  `status=failed` with `error_message`. The frontend sees whatever
  `realtime_status` was last reached. Spec explicitly allows this.

## Required manual validation steps post-deploy

1. **Deploy order:** migrate DB first (`npm run migrate`), deploy the worker
   process, then the API. The worker must be running before the first
   `POST /audit/start` hits Redis, or jobs pile up unhandled.
2. **Run `audit.e2e-test.ts` against three known domains.** Pick domains with
   past n8n baselines so grade letters can be compared side-by-side. Swap the
   `TEST_DOMAIN` and `TEST_PRACTICE_SEARCH_STRING` constants at the top of the
   script between runs.
3. **Confirm frontend parity.** Load the leadgen tool frontend (`main` branch)
   and trigger an audit. It polls `GET /audit/:id/status` and should render
   without code changes. No shape drift is acceptable here — if the frontend
   breaks, the `step_*` columns are producing something different from n8n.
4. **Compare grade letters.** For each of the 3 test domains, record:
   - Website `overall_grade` from `step_website_analysis`
   - GBP `gbp_grade` from `step_gbp_analysis`
   - Competitor `rank_grade` from `step_gbp_analysis.competitor_analysis`

   If ≥ 80% of these match the n8n baseline, migration is a go. If < 80%,
   investigate prompt drift before cutting traffic over.
5. **Monitor the worker logs for the first 24 hours.** Watch for:
   - Apify timeouts (default wait is 5 min per scrape; long tail may exceed)
   - Claude rate-limit errors
   - S3 upload failures (bucket permissions; region mismatch)

## Env cleanup needed

- **Remove `WEB_SCRAPING_TOOL_AGENT_WEBHOOK`** from production `.env` after
  traffic is fully cut over. This is the only n8n webhook this migration
  retires. Do NOT remove other n8n webhook vars (skills, emails, practice
  ranking) — those are separate pipelines.
- The repo has no `.env.example` file — nothing to update there.
- New code requires no new env vars; existing `APIFY_TOKEN`, `AWS_S3_IMPORTS_*`,
  `ANTHROPIC_API_KEY`, `REDIS_HOST`/`REDIS_PORT` are sufficient.
