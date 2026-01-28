import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Send,
  Home,
} from "lucide-react";

interface AuditErrorModalProps {
  isOpen: boolean;
  onRetry: () => void;
  onEmailSubmit: (email: string) => Promise<void>;
}

export const AuditErrorModal: React.FC<AuditErrorModalProps> = ({
  isOpen,
  onRetry,
  onEmailSubmit,
}) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Countdown and redirect after email is sent
  useEffect(() => {
    if (!emailSent) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "https://getalloro.com";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [emailSent]);

  if (!isOpen) return null;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    if (!email.trim()) {
      setEmailError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      await onEmailSubmit(email);
      setEmailSent(true);
    } catch (err) {
      setEmailError(
        err instanceof Error
          ? err.message
          : "Failed to send. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative"
        initial={{ scale: 0.8, y: 60, opacity: 0, rotateX: 15 }}
        animate={{
          scale: 1,
          y: 0,
          opacity: 1,
          rotateX: 0,
          x: [0, -8, 8, -6, 6, -4, 4, -2, 2, 0],
        }}
        exit={{ scale: 0.8, y: 60, opacity: 0, rotateX: -15 }}
        transition={{
          scale: { type: "spring", stiffness: 400, damping: 30, mass: 1 },
          y: { type: "spring", stiffness: 400, damping: 30, mass: 1 },
          opacity: { type: "spring", stiffness: 400, damping: 30, mass: 1 },
          rotateX: { type: "spring", stiffness: 400, damping: 30, mass: 1 },
          x: { duration: 0.5, delay: 0.3, ease: "easeOut" },
        }}
      >
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-brand-500/5"
          animate={{
            background: [
              "linear-gradient(135deg, rgba(239,68,68,0.05) 0%, transparent 50%, rgba(214,104,83,0.05) 100%)",
              "linear-gradient(135deg, rgba(214,104,83,0.05) 0%, transparent 50%, rgba(239,68,68,0.05) 100%)",
              "linear-gradient(135deg, rgba(239,68,68,0.05) 0%, transparent 50%, rgba(214,104,83,0.05) 100%)",
            ],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 p-8">
          {emailSent ? (
            // Success state with countdown
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="text-center py-6"
            >
              <motion.div
                className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30 relative"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
              >
                {/* Success pulse rings */}
                <motion.div
                  className="absolute inset-0 rounded-3xl bg-green-500"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                >
                  <CheckCircle2 className="w-12 h-12 text-white relative z-10" />
                </motion.div>
              </motion.div>

              <motion.h2
                className="text-3xl font-bold text-gray-900 mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Thank You!
              </motion.h2>

              <motion.p
                className="text-gray-600 text-base mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Our team has been notified and will reach out to you shortly.
              </motion.p>

              {/* Countdown */}
              <motion.div
                className="flex items-center justify-center gap-2 text-gray-500 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Home className="w-4 h-4" />
                <span className="text-sm">
                  Redirecting to homepage in{" "}
                  <motion.span
                    key={countdown}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-bold text-brand-500"
                  >
                    {countdown}
                  </motion.span>
                  s...
                </span>
              </motion.div>

              {/* Progress bar */}
              <motion.div
                className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "linear" }}
                />
              </motion.div>

              <motion.button
                onClick={() => window.location.href = "https://getalloro.com"}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw className="w-4 h-4" />
                Or try again now
              </motion.button>
            </motion.div>
          ) : (
            // Error state with form
            <>
              {/* Error Icon with pulse animation */}
              <motion.div
                className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-500/30 relative"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                }}
              >
                {/* Pulse rings */}
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-red-500"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-red-500"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.3,
                  }}
                />
                <AlertCircle className="w-10 h-10 text-white relative z-10" />
              </motion.div>

              {/* Title & Message */}
              <motion.div
                className="text-center mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  We had trouble looking into your data
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Something went wrong while analyzing your practice. You can try
                  again or leave your email and we'll reach out to help.
                </p>
              </motion.div>

              {/* Email Form - Inline */}
              <motion.form
                onSubmit={handleEmailSubmit}
                className="mb-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="relative flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                    placeholder="your@email.com"
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-3.5 rounded-xl border-2 transition-all outline-none font-medium ${
                      emailError
                        ? "border-red-500/50 bg-red-50 focus:border-red-500 text-gray-900 placeholder-red-300"
                        : "border-gray-200 focus:border-brand-500 bg-gray-50 text-gray-900 placeholder-gray-400"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || !email.trim()}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-3.5 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    whileHover={!isSubmitting ? { scale: 1.05 } : {}}
                    whileTap={!isSubmitting ? { scale: 0.95 } : {}}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Send className="w-6 h-6" />
                    )}
                  </motion.button>
                </div>
                {emailError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-1 text-red-500 text-xs font-medium mt-2"
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>{emailError}</span>
                  </motion.div>
                )}
              </motion.form>

              {/* Divider */}
              <motion.div
                className="flex items-center gap-3 mb-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </motion.div>

              {/* Try Again Button */}
              <motion.button
                onClick={() => window.location.href = "https://getalloro.com"}
                className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-xl shadow-brand-500/25 flex items-center justify-center gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
