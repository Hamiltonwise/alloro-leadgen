import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Circle,
  Search,
  MapPin,
  Globe,
  Users,
  TrendingUp,
  Star,
  Clock,
  Sparkles,
  Calendar,
  ArrowRight,
  UserPlus,
} from "lucide-react";

/**
 * Custom thin elegant checkmark — replaces lucide's heavier `Check` glyph.
 * Slightly extended downstroke + rounded caps for a refined editorial feel.
 */
function FancyCheck({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.5 12.5 L9.25 18.25 L20.5 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
import { AuditStage } from "../../types";
import { TimeElapsed } from "../ui/TimeElapsed";
import { trackEvent, getSessionId } from "../../lib/tracking";

/**
 * Append `?ls={sessionId}` to the signup URL, preserving any pre-existing
 * query params. Reads the session id lazily — at click-time — because the
 * tracking session may not have been initialized at component mount.
 */
function buildSignupHref(base: string): string {
  const id = getSessionId();
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}ls=${encodeURIComponent(id)}`;
}

/**
 * Sidebar Component with Fixed Icon Alignment
 */
export const Sidebar = ({
  stage,
  progress,
  setStage,
  onDashboardAction,
}: {
  stage: AuditStage;
  progress: number;
  setStage: (s: AuditStage) => void;
  onDashboardAction?: (
    action:
      | "scroll-overall"
      | "scroll-rank"
      | "scroll-gbp"
      | "scroll-website"
      | "open-insights-gbp"
      | "open-insights-website"
      | "schedule-call",
  ) => void;
}) => {
  const steps: { id: AuditStage; label: string; icon: any }[] = [
    { id: "input", label: "Business Search", icon: Search },
    { id: "scanning_website", label: "Website Analysis", icon: Globe },
    { id: "analyzing_gbp", label: "GBP Profile Audit", icon: MapPin },
    { id: "competitor_map", label: "Competitor Landscape", icon: Users },
    { id: "dashboard", label: "Final Report", icon: TrendingUp },
  ];

  const dashboardSteps = [
    { label: "Overall Score", icon: Star },
    { label: "Local Ranking Insights", icon: Users },
    {
      label: "GBP Analysis",
      icon: MapPin,
    },
    {
      label: "Website Performance Metrics",
      icon: Globe,
    },
    {
      label: "GBP Key Insights",
      icon: Sparkles,
    },
    {
      label: "Website Key Insights",
      icon: Sparkles,
    },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === stage);

  // If we are in dashboard stage, we render a completely different sidebar content
  if (stage === "dashboard") {
    return (
      <div className="hidden md:flex w-80 flex-col bg-beige border-r border-gray-100 h-screen p-6 shadow-lg z-20">
        <div className="mb-8 flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Alloro"
            className="w-9 h-9 object-contain"
          />
          <div className="flex flex-col">
            <span className="font-heading font-semibold text-lg text-gray-900 tracking-tight leading-tight">
              Alloro
            </span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
              What we got for you
            </span>
          </div>
        </div>
        <div className="space-y-2 flex-1 overflow-y-auto">
          {dashboardSteps.map((step, idx) => (
            <button
              key={`step-${idx}`}
              onClick={() =>
                onDashboardAction &&
                onDashboardAction(
                  (step as { id?: string }).id as any
                )
              }
              className="w-full flex items-center gap-3 transition-all duration-200 text-left group py-2.5 pr-3 rounded-lg hover:bg-white/60 text-gray-700"
            >
              <FancyCheck className="w-7 h-7 shrink-0 text-green-600" />
              <span className="text-[15px] font-medium text-gray-700 group-hover:text-gray-900">
                {step.label}
              </span>
            </button>
          ))}
        </div>

        {/* Bottom-anchored CTA — desktop replacement for the floating mobile CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 rounded-2xl px-5 py-5 text-center"
          style={{
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.05)",
          }}
        >
          <p className="text-sm font-semibold text-gray-700 mb-4 leading-snug">
            Knowing isn't enough. Execution matters. Let{" "}
            <span className="text-brand-500">Alloro</span> help.
          </p>
          <a
            href="https://app.getalloro.com/signup"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              trackEvent("cta_clicked_create_account", {
                event_data: { stage: "dashboard" },
              });
              e.currentTarget.href = buildSignupHref(
                "https://app.getalloro.com/signup",
              );
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-white font-bold rounded-full text-xs whitespace-nowrap"
            style={{
              backgroundColor: "#d66853",
              boxShadow: "0 6px 18px rgba(214, 104, 83, 0.4)",
            }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create Your Free Account
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="hidden md:flex w-80 flex-col bg-beige border-r border-gray-100 h-screen p-6 shadow-lg z-20">
      <div className="mb-8 flex items-center gap-3">
        <img src="/logo.png" alt="Alloro" className="w-9 h-9 object-contain" />
        <div className="flex flex-col">
          <span className="font-heading font-semibold text-lg text-gray-900 tracking-tight leading-tight">
            Alloro
          </span>
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            Practice Analyzer
          </span>
        </div>
      </div>

      <div className="space-y-0 flex-1">
        {steps.map((step, idx) => {
          const isCompleted = currentStepIndex > idx;
          const isActive = step.id === stage;
          const isClickable = isCompleted || isActive;
          const isLastStep = idx === steps.length - 1;

          return (
            <button
              key={step.id}
              onClick={() => isClickable && setStage(step.id)}
              disabled={!isClickable}
              className={`w-full flex items-start gap-4 transition-all duration-300 text-left group py-3 ${
                isActive
                  ? "text-brand-600"
                  : isCompleted
                    ? "text-gray-800"
                    : "text-gray-400 opacity-60"
              }`}
            >
              {/* Icon container with fixed width for alignment */}
              <div className="relative flex flex-col items-center w-6 flex-shrink-0">
                {/* The icon */}
                <div className="relative z-10">
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : isActive ? (
                    <div className="relative">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                      <div className="absolute inset-0 bg-brand-500/20 blur-lg rounded-full animate-pulse"></div>
                    </div>
                  ) : (
                    <Circle className="w-6 h-6 text-gray-200" />
                  )}
                </div>
                {/* Vertical connecting line - positioned below icon, centered */}
                {!isLastStep && (
                  <div
                    className={`w-0.5 h-8 mt-1 transition-colors duration-500 ${
                      isCompleted ? "bg-green-500/30" : "bg-gray-100"
                    }`}
                  />
                )}
              </div>
              {/* Label */}
              <span
                className={`font-medium pt-0.5 ${
                  isActive
                    ? "text-lg font-bold"
                    : "text-sm group-hover:text-gray-600"
                }`}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>

      {stage !== "input" && (
        <div className="mt-auto space-y-4">
          <div>
            <div className="flex justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
              <span>Time elapsed</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <TimeElapsed />
              </span>
            </div>
          </div>

          {/* Sidebar-anchored "Knowing isn't enough" CTA — desktop replaces
              the floating mobile version that lives in DashboardStage. */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl px-4 py-4 text-center"
            style={{
              background: "rgba(255, 255, 255, 0.5)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.05)",
            }}
          >
            <p className="text-xs font-semibold text-gray-700 mb-3 leading-snug">
              Knowing isn't enough. Execution matters.
              <br />
              Let <span className="text-brand-500">Alloro</span> help.
            </p>
            <motion.a
              href="https://calendar.app.google/yJsmRsEnBSfDTVyz8"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackEvent("cta_clicked_strategy_call", {
                  event_data: { stage },
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-white font-bold rounded-full transition-all text-xs"
              style={{
                backgroundColor: "#d66853",
                boxShadow: "0 6px 18px rgba(214, 104, 83, 0.4)",
              }}
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
            >
              <Calendar className="w-3.5 h-3.5" />
              Book Strategy Call
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.a>
          </motion.div>
        </div>
      )}
    </div>
  );
};
