import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface EmailPaywallOverlayProps {
  onEmailSubmit: (email: string) => Promise<void>;
}

export const EmailPaywallOverlay: React.FC<EmailPaywallOverlayProps> = ({
  onEmailSubmit,
}) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      await onEmailSubmit(email);
      // Success handled by parent component
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send email. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.8,
        type: "spring",
        stiffness: 100,
      }}
      className="bg-white/80 backdrop-blur-xl text-gray-900 p-6 md:p-8 rounded-2xl shadow-2xl text-center max-w-lg mx-4 relative overflow-hidden border border-gray-200"
    >
      {/* Animated background glow */}
      <motion.div
        className="absolute -inset-1 bg-brand-500/10 blur-xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative z-10">
        <motion.div
          className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30"
          animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Mail className="w-8 h-8 text-white" />
        </motion.div>

        <h2 className="text-2xl font-bold mb-2 text-gray-900">
          Enter Your Email to Access Full Insights
        </h2>
        <p className="text-gray-600 mb-8 text-sm leading-relaxed">
          Unlock your complete practice analysis including local ranking
          insights, detailed performance metrics, and actionable recommendations
          to grow your practice.
        </p>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="your@email.com"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none text-center font-medium ${
                error
                  ? "border-red-500/50 bg-red-50 focus:border-red-500 text-gray-900 placeholder-red-300"
                  : "border-gray-200 focus:border-brand-500 bg-white text-gray-900 placeholder-gray-400"
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
            />
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-1 text-red-500 text-xs font-medium"
              >
                <AlertCircle className="w-3 h-3" />
                <span>{error}</span>
              </motion.div>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={isSubmitting || !email.trim()}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            whileHover={!isSubmitting ? { scale: 1.02 } : {}}
            whileTap={!isSubmitting ? { scale: 0.98 } : {}}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending Report...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Get My Full Report
              </>
            )}
          </motion.button>
        </form>

        <p className="text-[11px] text-gray-500 mt-6 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" />
          We respect your privacy. No spam, ever.
        </p>
      </div>
    </motion.div>
  );
};
