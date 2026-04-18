/**
 * Leadgen tracking client
 *
 * Fire-and-forget instrumentation for the public leadgen tool. Posts session
 * + event rows to the signalsai-backend tracking endpoints so that admins can
 * see a funnel of who landed, who submitted an email, and who dropped off.
 *
 * Design notes:
 * - Session ID lives in `localStorage` so the same person on the same device
 *   keeps the same session id across browser closes / tab churn / iOS Safari
 *   aggressive tab eviction. Was previously `sessionStorage` which produced
 *   ghost rows in admin every time a user closed and reopened their browser.
 *   Cleared only by explicit "clear site data" action by the user.
 * - Session creation is LAZY: we do not POST `/leadgen/session` on app mount.
 *   The first `trackEvent` / `trackBeacon` call ensures the session is created
 *   before (or alongside) the event fires. This keeps bots and drive-by loads
 *   out of the sessions table unless a real funnel signal was emitted (T6 will
 *   call `trackEvent("landed")` from `AuditToolPage`, so real users are still
 *   counted).
 * - All network calls are silent on failure. Tracking must NEVER break UX.
 * - Abandonment beacon uses `navigator.sendBeacon` because `fetch` is blocked
 *   during `beforeunload` in most browsers.
 */

import { API_BASE_URL } from "../../utils/config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeadgenEventName =
  | "landed"
  | "input_started"
  | "input_submitted"
  | "audit_started"
  | "audit_retried"
  | "stage_viewed_1"
  | "stage_viewed_2"
  | "stage_viewed_3"
  | "stage_viewed_4"
  | "stage_viewed_5"
  | "results_viewed"
  | "report_engaged_1min"
  | "email_gate_shown"
  | "email_submitted"
  | "account_created"
  | "abandoned"
  | "cta_clicked_strategy_call"
  | "cta_clicked_create_account"
  | "email_field_focused"
  | "email_field_blurred_empty";

/**
 * Non-stage events — these fire unrestricted. Click a CTA 5 times, the
 * timeline records 5 events. Dedup cache does NOT apply to these.
 *
 * Keep in sync with the NON_STAGE_EVENTS set in the backend's
 * util.event-ordering.ts.
 */
const NON_STAGE_EVENTS = new Set<LeadgenEventName>([
  "cta_clicked_strategy_call",
  "cta_clicked_create_account",
  "email_field_focused",
  "email_field_blurred_empty",
  "abandoned",
  "audit_retried",
]);

function isProgressionStage(name: LeadgenEventName): boolean {
  return !NON_STAGE_EVENTS.has(name);
}

export interface TrackEventPayload {
  event_name: LeadgenEventName;
  event_data?: Record<string, unknown>;
  audit_id?: string;
  email?: string;
  domain?: string;
  practice_search_string?: string;
}

interface SessionInitPayload {
  session_id: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const SESSION_STORAGE_KEY = "leadgen_session_id";
const ATTR_SENT_KEY = "leadgen_attr_sent";
// Prefix — the full key is `leadgen_fired_stages:<session_id>`, value is
// a comma-separated list of progression stage event names that have
// already been dispatched from this device. Server-side strict ordering
// is the hard contract; this cache just saves round-trips.
const FIRED_STAGES_PREFIX = "leadgen_fired_stages:";
const SESSION_ENDPOINT = `${API_BASE_URL}/leadgen/session`;
const EVENT_ENDPOINT = `${API_BASE_URL}/leadgen/event`;
const BEACON_ENDPOINT = `${API_BASE_URL}/leadgen/beacon`;
const EMAIL_NOTIFY_ENDPOINT = `${API_BASE_URL}/leadgen/email-notify`;
const EMAIL_PAYWALL_ENDPOINT = `${API_BASE_URL}/leadgen/email-paywall`;
const SESSION_BY_AUDIT_ENDPOINT = `${API_BASE_URL}/leadgen/session-by-audit`;
const AUDIT_RETRY_ENDPOINT = `${API_BASE_URL}/audit`;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let cachedSessionId: string | null = null;
let sessionInitPromise: Promise<void> | null = null;
let missingKeyWarned = false;
let currentStage: LeadgenEventName = "landed";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function generateUuid(): string {
  // Modern browsers support crypto.randomUUID; guard anyway in case of older
  // environments (e.g. very old iOS Safari). Fallback uses crypto.getRandomValues.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Last-resort (tests / very old envs). Not cryptographically strong.
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getTrackingKey(): string | null {
  const key = import.meta.env.VITE_LEADGEN_TRACKING_KEY;
  if (!key) {
    if (!missingKeyWarned) {
      missingKeyWarned = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[leadgen-tracking] VITE_LEADGEN_TRACKING_KEY not set — tracking disabled",
      );
    }
    return null;
  }
  return key;
}

function parseUtmParams(): Omit<SessionInitPayload, "session_id" | "referrer"> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const out: Omit<SessionInitPayload, "session_id" | "referrer"> = {};
  const src = params.get("utm_source");
  const med = params.get("utm_medium");
  const camp = params.get("utm_campaign");
  const term = params.get("utm_term");
  const content = params.get("utm_content");
  if (src) out.utm_source = src;
  if (med) out.utm_medium = med;
  if (camp) out.utm_campaign = camp;
  if (term) out.utm_term = term;
  if (content) out.utm_content = content;
  return out;
}

/**
 * Returns true iff this tab has not yet flushed attribution (referrer + UTM)
 * to the server. Flip the flag once so subsequent session upserts (e.g. after
 * page reloads in the same tab) don't re-send the same values.
 */
function shouldSendAttribution(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ATTR_SENT_KEY) !== "1";
  } catch {
    return false;
  }
}

function markAttributionSent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ATTR_SENT_KEY, "1");
  } catch {
    // no-op — localStorage may be unavailable in private mode
  }
}

function buildHeaders(key: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Leadgen-Key": key,
  };
}

// ---------------------------------------------------------------------------
// Fired-stages cache — prevents the same progression event from being
// POSTed repeatedly (mount effects, StrictMode double-invocations, tab
// switches). Only applies to progression stage events; CTA events always
// fire.
// ---------------------------------------------------------------------------

function firedStagesKey(sessionId: string): string {
  return `${FIRED_STAGES_PREFIX}${sessionId}`;
}

function readFiredStages(sessionId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(firedStagesKey(sessionId));
    if (!raw) return new Set();
    return new Set(raw.split(",").filter(Boolean));
  } catch {
    return new Set();
  }
}

function writeFiredStages(sessionId: string, set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      firedStagesKey(sessionId),
      Array.from(set).join(","),
    );
  } catch {
    // localStorage may be unavailable; fall through — server is still
    // the hard contract on dedup.
  }
}

function hasFiredStage(sessionId: string, name: LeadgenEventName): boolean {
  return readFiredStages(sessionId).has(name);
}

function markStageFired(sessionId: string, name: LeadgenEventName): void {
  const set = readFiredStages(sessionId);
  if (set.has(name)) return;
  set.add(name);
  writeFiredStages(sessionId, set);
}

function clearFiredStages(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(firedStagesKey(sessionId));
  } catch {
    // noop
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Overwrite the cached + persisted session id. Used when the app mounts
 * with `?audit_id=<id>` and we've resolved the ORIGINAL session that
 * owns that audit — we want every subsequent `trackEvent` to land on
 * that session, not a brand-new one generated from `getSessionId()`.
 *
 * Silent on failure (private-mode etc). Also clears the in-flight
 * session init promise so the next `ensureSession()` triggers a fresh
 * upsert under the new id.
 */
export function adoptSessionId(id: string): void {
  if (!UUID_REGEX.test(id)) return;
  const previousId = cachedSessionId;
  cachedSessionId = id;
  sessionInitPromise = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  } catch {
    // localStorage may be unavailable — the in-memory cache still
    // works for this tab's lifetime.
  }
  // If we swapped to a different session id, wipe the fired-stages
  // cache for the OLD id so it doesn't pollute storage, and start the
  // new adopted session with a fresh slate (server still dedupes; this
  // is optimistic).
  if (previousId && previousId !== id) {
    clearFiredStages(previousId);
  }
}

/**
 * Resolves an audit_id to its originating leadgen session id (if the
 * audit was kicked off via the leadgen flow). Returns null when no
 * session owns this audit. Never throws.
 */
export async function resolveSessionByAuditId(
  auditId: string
): Promise<string | null> {
  const key = getTrackingKey();
  if (!key) return null;
  if (!UUID_REGEX.test(auditId)) return null;
  try {
    const response = await fetch(
      `${SESSION_BY_AUDIT_ENDPOINT}/${encodeURIComponent(auditId)}`,
      {
        method: "GET",
        headers: buildHeaders(key),
      },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { session_id?: string | null };
    return typeof body.session_id === "string" ? body.session_id : null;
  } catch {
    return null;
  }
}

export function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  if (typeof window === "undefined") {
    // SSR / non-browser path — just return a transient UUID (not persisted).
    cachedSessionId = generateUuid();
    return cachedSessionId;
  }
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      cachedSessionId = existing;
      return existing;
    }
    const fresh = generateUuid();
    window.localStorage.setItem(SESSION_STORAGE_KEY, fresh);
    cachedSessionId = fresh;
    return fresh;
  } catch {
    // localStorage may throw in private-mode or sandboxed iframes.
    if (!cachedSessionId) cachedSessionId = generateUuid();
    return cachedSessionId;
  }
}

export function getCurrentStage(): LeadgenEventName {
  return currentStage;
}

export function setCurrentStage(stage: LeadgenEventName): void {
  currentStage = stage;
}

/**
 * Idempotent. Safe to call many times. Actually POSTs /leadgen/session at most
 * once per tab (successful or not — we never retry, per silent-failure rule).
 */
export function ensureSession(): Promise<void> {
  if (sessionInitPromise) return sessionInitPromise;

  const key = getTrackingKey();
  if (!key) {
    sessionInitPromise = Promise.resolve();
    return sessionInitPromise;
  }

  const payload: SessionInitPayload = {
    session_id: getSessionId(),
  };

  // Only attach attribution (referrer + UTM) on the FIRST session upsert of a
  // tab. Reloads in the same tab keep the original attribution and omit these
  // fields so the server doesn't clobber prior values with empty strings.
  if (shouldSendAttribution()) {
    const referrer =
      typeof document !== "undefined" && document.referrer
        ? document.referrer
        : undefined;
    if (referrer) payload.referrer = referrer;
    Object.assign(payload, parseUtmParams());
    markAttributionSent();
  }

  sessionInitPromise = fetch(SESSION_ENDPOINT, {
    method: "POST",
    headers: buildHeaders(key),
    body: JSON.stringify(payload),
    keepalive: true,
  })
    .then(() => undefined)
    .catch(() => undefined);

  return sessionInitPromise;
}

/**
 * Fire-and-forget event. Ensures a session row exists first (lazy init) then
 * posts the event. Never throws.
 */
export function trackEvent(
  name: LeadgenEventName,
  extra?: Partial<TrackEventPayload>,
): void {
  const key = getTrackingKey();
  if (!key) return;

  const sessionId = getSessionId();

  // Progression stage events are exactly-once per session. CTA /
  // interaction events bypass this check. Server enforces the same
  // rule; the local cache just prevents the fetch round-trip.
  if (isProgressionStage(name)) {
    if (hasFiredStage(sessionId, name)) {
      return;
    }
    markStageFired(sessionId, name);
  }

  const body = JSON.stringify({
    session_id: sessionId,
    event_name: name,
    ...extra,
  });

  // Kick off session init; don't await the response (fire-and-forget chain).
  ensureSession()
    .then(() =>
      fetch(EVENT_ENDPOINT, {
        method: "POST",
        headers: buildHeaders(key),
        body,
        keepalive: true,
      }).catch(() => undefined),
    )
    .catch(() => undefined);
}

/**
 * Submit the FAB "Email me when ready" form. POSTs to /leadgen/email-notify
 * which:
 *   - upserts a row in `leadgen_email_notifications` (idempotent per
 *     (session_id, audit_id))
 *   - server-authoritatively writes `email_gate_shown` + `email_submitted`
 *     funnel events
 *   - sends the report email immediately if the audit is already complete,
 *     otherwise leaves it for the worker to drain on completion
 *
 * Awaitable so the FAB can render a confirmation pulse on success. Never
 * throws.
 */
export async function submitEmailNotify(opts: {
  email: string;
  auditId: string;
}): Promise<{ ok: boolean }> {
  const key = getTrackingKey();
  if (!key) return { ok: false };

  try {
    const response = await fetch(EMAIL_NOTIFY_ENDPOINT, {
      method: "POST",
      headers: buildHeaders(key),
      body: JSON.stringify({
        session_id: getSessionId(),
        audit_id: opts.auditId,
        email: opts.email,
      }),
      keepalive: true,
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

/**
 * Submit the in-tab paywall email server-authoritatively. Same idea as
 * `submitEmailNotify` (the FAB endpoint) but hits a separate route that
 * does NOT enqueue a send — the paywall flow already triggers the n8n
 * email send client-side via `sendAuditReportEmail`. This call's only job
 * is durable event recording: write `email_gate_shown` + `email_submitted`
 * server-side and patch session.email so `linkAccountCreation` can match
 * by email at signup time even if the JS `trackEvent` never landed.
 *
 * Awaitable so the paywall can `await` before navigating to /signup.
 * Never throws.
 */
export async function submitEmailPaywall(opts: {
  email: string;
  auditId: string;
}): Promise<{ ok: boolean }> {
  const key = getTrackingKey();
  if (!key) return { ok: false };

  try {
    const response = await fetch(EMAIL_PAYWALL_ENDPOINT, {
      method: "POST",
      headers: buildHeaders(key),
      body: JSON.stringify({
        session_id: getSessionId(),
        audit_id: opts.auditId,
        email: opts.email,
      }),
      keepalive: true,
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

/**
 * Self-service retry for a failed leadgen audit. POSTs to
 * `/audit/:auditId/retry` (shared-secret gated by X-Leadgen-Key). The server
 * resets the audit row to `pending` and re-enqueues the BullMQ job — reusing
 * the same `audit_id` so session → audit continuity is preserved.
 *
 * The public endpoint caps retries at 3 per audit. On the 4th attempt the
 * server returns 429 `limit_exceeded` and the caller should flip the FAB
 * into its retry-exhausted state (hide the button, keep the email form).
 *
 * Awaitable, never throws. On success also fires a `trackEvent("audit_retried")`
 * for funnel visibility (non-stage event — doesn't dedup or advance stages).
 */
export type RetryAuditResult =
  | { ok: true; retryCount: number }
  | {
      ok: false;
      reason: "not_failed" | "limit_exceeded" | "not_found" | "network";
      retryCount?: number;
    };

export async function retryAudit(auditId: string): Promise<RetryAuditResult> {
  const key = getTrackingKey();
  if (!key) return { ok: false, reason: "network" };
  if (!UUID_REGEX.test(auditId)) return { ok: false, reason: "not_found" };

  try {
    const response = await fetch(
      `${AUDIT_RETRY_ENDPOINT}/${encodeURIComponent(auditId)}/retry`,
      {
        method: "POST",
        headers: buildHeaders(key),
        keepalive: true,
      }
    );

    if (response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        retry_count?: number;
      };
      const retryCount =
        typeof body.retry_count === "number" ? body.retry_count : 0;
      trackEvent("audit_retried", {
        audit_id: auditId,
        event_data: { retry_count: retryCount },
      });
      return { ok: true, retryCount };
    }

    if (response.status === 429) {
      const body = (await response.json().catch(() => ({}))) as {
        retry_count?: number;
      };
      return {
        ok: false,
        reason: "limit_exceeded",
        retryCount:
          typeof body.retry_count === "number" ? body.retry_count : undefined,
      };
    }
    if (response.status === 404) return { ok: false, reason: "not_found" };
    if (response.status === 409) return { ok: false, reason: "not_failed" };
    return { ok: false, reason: "network" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/**
 * Fires via navigator.sendBeacon for use during `beforeunload` where fetch is
 * unreliable. The backend's /leadgen/beacon endpoint accepts JSON blobs.
 */
export function trackBeacon(
  name: LeadgenEventName,
  extra?: Partial<TrackEventPayload>,
): void {
  const key = getTrackingKey();
  if (!key) return;
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
    return;
  }

  try {
    const payload = {
      session_id: getSessionId(),
      event_name: name,
      key, // beacon cannot set custom headers; pass key in body
      ...extra,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    navigator.sendBeacon(BEACON_ENDPOINT, blob);
  } catch {
    // swallow — tracking must never break UX
  }
}

/**
 * Attach a single `beforeunload` handler that fires an `abandoned` beacon iff
 * the user left before hitting results. Must only be called once (main entry).
 */
let beaconBound = false;
export function bindAbandonmentBeacon(
  getStage: () => LeadgenEventName = getCurrentStage,
): void {
  if (beaconBound) return;
  if (typeof window === "undefined") return;
  beaconBound = true;

  window.addEventListener("beforeunload", () => {
    const stage = getStage();
    // Never downgrade a terminal success state. `results_viewed` means the
    // user saw their report; `account_created` means they converted. Either
    // way, closing the tab afterward is not abandonment.
    if (
      stage === "results_viewed" ||
      stage === "account_created" ||
      stage === "abandoned"
    ) {
      return;
    }
    trackBeacon("abandoned", { event_data: { final_stage: stage } });
  });
}
