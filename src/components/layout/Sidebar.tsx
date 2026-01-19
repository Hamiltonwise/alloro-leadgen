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
} from "lucide-react";
import { AuditStage } from "../../types";
import { TimeElapsed } from "../ui/TimeElapsed";

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
    {
      id: "schedule-call",
      label: "Schedule A Strategy Call",
      icon: Calendar,
      color: "text-orange-500",
    },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === stage);

  // If we are in dashboard stage, we render a completely different sidebar content
  if (stage === "dashboard") {
    return (
      <div className="hidden md:flex w-80 flex-col bg-white border-r border-gray-100 h-screen p-6 shadow-lg z-20">
        <div className="mb-8 flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Alloro"
            className="w-9 h-9 object-contain"
          />
          <div className="flex flex-col">
            <span className="font-bold text-lg text-gray-800 tracking-tight font-sans leading-tight">
              Alloro
            </span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
              What we got for you
            </span>
          </div>
        </div>
        <div className="space-y-4 flex-1 overflow-y-auto">
          {dashboardSteps.map((step, idx) => {
            return (
              <button
                key={step.id}
                onClick={() =>
                  onDashboardAction && onDashboardAction(step.id as any)
                }
                className={`w-full flex items-center gap-3 transition-all duration-200 text-left group py-2.5 px-3 rounded-lg hover:bg-gray-50 ${
                  step.color ? "" : "text-gray-600"
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                    step.color
                      ? "bg-orange-50 text-orange-500"
                      : "bg-gray-100 text-gray-500 group-hover:bg-brand-50 group-hover:text-brand-500"
                  } transition-colors`}
                >
                  <step.icon
                    className={`w-4 h-4 ${step.color ? step.color : ""}`}
                  />
                </div>
                <span
                  className={`text-sm font-medium ${
                    step.color
                      ? "text-orange-600 font-bold"
                      : "text-gray-600 group-hover:text-gray-900"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:flex w-80 flex-col bg-white border-r border-gray-100 h-screen p-6 shadow-lg z-20">
      <div className="mb-8 flex items-center gap-3">
        <img src="/logo.png" alt="Alloro" className="w-9 h-9 object-contain" />
        <div className="flex flex-col">
          <span className="font-bold text-lg text-gray-800 tracking-tight font-sans leading-tight">
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
        <div className="mt-auto">
          <div className="flex justify-between text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">
            <span>Time elapsed</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <TimeElapsed />
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
            <motion.div
              className="bg-gradient-to-r from-brand-400 to-brand-600 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
