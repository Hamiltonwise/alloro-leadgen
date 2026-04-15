/**
 * Leadgen tracking client
 *
 * Fire-and-forget instrumentation for the public leadgen tool. Posts session
 * + event rows to the signalsai-backend tracking endpoints so that admins can
 * see a funnel of who landed, who submitted an email, and who dropped off.
 *
 * Design notes:
 * - Session ID is generated once per tab via `sessionStorage` (a new tab starts
 *   a fresh session; intentional so reopening re-engages the funnel cleanly).
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
const SESSION_ENDPOINT = `${API_BASE_URL}/leadgen/session`;
const EVENT_ENDPOINT = `${API_BASE_URL}/leadgen/event`;
const BEACON_ENDPOINT = `${API_BASE_URL}/leadgen/beacon`;

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
    return window.sessionStorage.getItem(ATTR_SENT_KEY) !== "1";
  } catch {
    return false;
  }
}

function markAttributionSent(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ATTR_SENT_KEY, "1");
  } catch {
    // no-op — sessionStorage may be unavailable in private mode
  }
}

function buildHeaders(key: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Leadgen-Key": key,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  if (typeof window === "undefined") {
    // SSR / non-browser path — just return a transient UUID (not persisted).
    cachedSessionId = generateUuid();
    return cachedSessionId;
  }
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      cachedSessionId = existing;
      return existing;
    }
    const fresh = generateUuid();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, fresh);
    cachedSessionId = fresh;
    return fresh;
  } catch {
    // sessionStorage may throw in private-mode or sandboxed iframes.
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

  const body = JSON.stringify({
    session_id: getSessionId(),
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
