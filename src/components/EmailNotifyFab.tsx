import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, Loader2, CheckCircle2, X, RefreshCw } from "lucide-react";
import { submitEmailNotify } from "../lib/tracking";

/**
 * EmailNotifyFab — bottom-center floating button that lets a waiting user
 * drop their email so we'll send them the report when the audit finishes.
 *
 * Two visual variants:
 *   - "wait":  appears at 1:20 elapsed if the audit is still processing
 *              ("Don't want to wait around? Drop your email.")
 *   - "error": appears immediately when the audit hits a failure state
 *              ("Heavier traffic than usual — pop in your email and we'll
 *              deliver when it's done.")
 *
 * Visibility, variant, and the error-modal suppression are owned by the
 * parent (App.tsx). This component owns the collapse/expand UX and the
 * actual POST to /leadgen/email-notify.
 */

interface Props {
  visible: boolean;
  variant: "wait" | "error";
  auditId: string | null;
  onSubmitted: () => void;
  /**
   * Only used in the `error` variant. Invoked when the user clicks "Try
   * again". Parent is responsible for calling the retry endpoint and
   * resetting polling state; this component only owns the button lifecycle.
   */
  onRetry?: () => Promise<void>;
  /**
   * When true (parent has observed a 429 limit_exceeded from the retry
   * endpoint), hide the "Try again" button entirely and swap copy so the
   * email form is the only remaining action.
   */
  retriesExhausted?: boolean;
}

const COPY = {
  wait: {
    pill: "Email me when ready",
    headline: "Don't want to wait around?",
    sub: "Drop your email and we'll send your full report the moment it's ready.",
  },
  error: {
    pill: "Email me the report",
    headline: "Heavier traffic than usual.",
    sub: "Pop in your email and we'll deliver the report the moment it's done.",
  },
  errorExhausted: {
    pill: "Email me the report",
    headline: "We've hit our retry limit.",
    sub: "Drop your email and we'll handle this one manually.",
  },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailNotifyFab: React.FC<Props> = ({
  visible,
  variant,
  auditId,
  onSubmitted,
  onRetry,
  retriesExhausted = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const successTimeout = useRef<number | null>(null);

  // Auto-expand the moment the FAB shows in `error` mode — the user is
  // already stuck, no reason to make them tap again.
  useEffect(() => {
    if (visible && variant === "error") setExpanded(true);
    if (!visible) setExpanded(false);
  }, [visible, variant]);

  // Cleanup the post-submit auto-collapse timer on unmount.
  useEffect(() => {
    return () => {
      if (successTimeout.current) window.clearTimeout(successTimeout.current);
    };
  }, []);

  if (!visible) return null;

  const copy =
    variant === "error" && retriesExhausted ? COPY.errorExhausted : COPY[variant];

  const showRetry =
    variant === "error" && !retriesExhausted && typeof onRetry === "function";

  const handleRetryClick = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!auditId) {
      setError("Audit ID not ready yet — try again in a moment.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    const result = await submitEmailNotify({
      email: email.trim(),
      auditId,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError("Couldn't save — try once more?");
      return;
    }
    setSuccess(true);
    // Brief confirmation, then collapse + tell parent we're done so it
    // can flip paywallSatisfied and skip the in-tab paywall later.
    successTimeout.current = window.setTimeout(() => {
      setSuccess(false);
      setExpanded(false);
      onSubmitted();
    }, 2200);
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-md"
      style={{ pointerEvents: "auto" }}
    >
      <AnimatePresence mode="wait">
        {!expanded ? (
          <motion.button
            key="pill"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            onClick={() => setExpanded(true)}
            className="mx-auto flex items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600 active:scale-95 transition-all"
            aria-label={copy.pill}
          >
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.6, repeat: 2, ease: "easeInOut" }}
              className="inline-flex"
            >
              <Mail className="w-4 h-4" />
            </motion.span>
            {copy.pill}
          </motion.button>
        ) : (
          <motion.div
            key="card"
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            className="relative rounded-2xl bg-white p-4 md:p-5 shadow-2xl border border-gray-200"
          >
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
              disabled={submitting}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                <Mail className="w-4.5 h-4.5 text-brand-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-snug">
                  {copy.headline}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                  {copy.sub}
                </p>
              </div>
            </div>

            {showRetry && !success && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleRetryClick}
                  disabled={retrying}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60 transition-all"
                >
                  {retrying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Retrying…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" /> Try again
                    </>
                  )}
                </button>
                <p className="mt-2 text-center text-[11px] uppercase tracking-wide text-gray-400">
                  — or —
                </p>
              </div>
            )}

            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700"
              >
                <CheckCircle2 className="w-4 h-4" />
                Got it — we'll email you when ready.
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-3 space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="your@email.com"
                  disabled={submitting}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${
                    error
                      ? "border-red-300 bg-red-50 focus:border-red-500"
                      : "border-gray-200 bg-white focus:border-brand-500"
                  } disabled:opacity-60`}
                  autoFocus
                />
                {error && (
                  <p className="text-xs text-red-600 px-1">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    "Email me when ready"
                  )}
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
