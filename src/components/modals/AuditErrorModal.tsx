import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Mail,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

interface AuditErrorModalProps {
  isOpen: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onEmailSubmit: (email: string) => Promise<void>;
  onClose: () => void;
}

export const AuditErrorModal: React.FC<AuditErrorModalProps> = ({
  isOpen,
  errorMessage,
  onRetry,
  onEmailSubmit,
  onClose,
}) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative"
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Animated background glow */}
        <motion.div
          className="absolute -inset-1 bg-red-500/10 blur-xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        <div className="relative z-10 p-6 md:p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-lg transition-colors"
          >
            ✕
          </button>

          {emailSent ? (
            // Success state
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <motion.div
                className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              >
                <CheckCircle2 className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                We'll be in touch!
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Our team has been notified and will reach out to you shortly.
              </p>
              <motion.button
                onClick={onRetry}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw className="w-5 h-5" />
                Try Again Now
              </motion.button>
            </motion.div>
          ) : (
            // Error state with form
            <>
              {/* Error Icon */}
              <motion.div
                className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30"
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <AlertCircle className="w-8 h-8 text-white" />
              </motion.div>

              {/* Title & Message */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  We had trouble looking into your data
                </h2>
                <p className="text-gray-600 text-sm">
                  Something went wrong while analyzing your practice. You can try
                  again or leave your email and we'll reach out to help.
                </p>
                {errorMessage && (
                  <p className="text-xs text-gray-400 mt-2 italic">
                    Error: {errorMessage}
                  </p>
                )}
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-4 mb-4">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                    placeholder="your@email.com"
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none text-center font-medium ${
                      emailError
                        ? "border-red-500/50 bg-red-50 focus:border-red-500 text-gray-900 placeholder-red-300"
                        : "border-gray-200 focus:border-brand-500 bg-white text-gray-900 placeholder-gray-400"
                    } disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
                  />
                  {emailError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-1 text-red-500 text-xs font-medium"
                    >
                      <AlertCircle className="w-3 h-3" />
                      <span>{emailError}</span>
                    </motion.div>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                  whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                  whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Contact Me
                    </>
                  )}
                </motion.button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Try Again Button */}
              <motion.button
                onClick={onRetry}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
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
