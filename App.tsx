import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Circle,
  Search,
  MapPin,
  Globe,
  Users,
  TrendingUp,
  Lock,
  ShieldCheck,
  Zap,
  FileText,
  Star,
  Clock,
  Shield,
  Eye,
  BarChart3,
  Target,
  AlertTriangle,
  Phone,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  MOCK_BUSINESS,
  MOCK_COMPETITORS,
  MOCK_WEBSITE_ANALYSIS,
  MOCK_GBP_ANALYSIS,
  MOCK_SCREENSHOT_DESKTOP,
  MOCK_SCREENSHOT_MOBILE,
} from "./constants";
import {
  AuditStage,
  BusinessProfile,
  Competitor,
  WebsiteAnalysis,
  GBPAnalysis,
  SelectedGBP,
  StartAuditResponse,
} from "./types";
import { GBPSearchSelect } from "./GBPSearchSelect";
import { useAuditPolling } from "./useAuditPolling";
import { API_BASE_URL } from "./utils/config";

// --- COMPONENTS ---

// Circular Progress Bar Component with Enhanced Animation
const CircularProgress = ({
  score,
  size = 120,
  strokeWidth = 8,
  label,
  color = "brand",
  delay = 0,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  color?: "brand" | "green" | "yellow" | "red" | "blue";
  delay?: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  const colorClasses = {
    brand: "text-brand-500",
    green: "text-green-500",
    yellow: "text-yellow-500",
    red: "text-red-500",
    blue: "text-blue-500",
  };

  const bgColorClasses = {
    brand: "text-brand-100",
    green: "text-green-100",
    yellow: "text-yellow-100",
    red: "text-red-100",
    blue: "text-blue-100",
  };

  const glowClasses = {
    brand: "drop-shadow-[0_0_12px_rgba(214,104,83,0.6)]",
    green: "drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]",
    yellow: "drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]",
    red: "drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]",
    blue: "drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]",
  };

  const getColor = (s: number) => {
    if (s >= 90) return "green";
    if (s >= 70) return "yellow";
    return "red";
  };

  const actualColor = color === "brand" ? getColor(score) : color;

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay, type: "spring", stiffness: 100 }}
    >
      <span className="mb-2 text-[10px] font-semibold text-gray-500 text-center uppercase tracking-wide">
        {label}
      </span>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Animated glow ring */}
        <motion.div
          className={`absolute inset-0 rounded-full ${
            actualColor === "green"
              ? "bg-green-400"
              : actualColor === "yellow"
              ? "bg-yellow-400"
              : actualColor === "red"
              ? "bg-red-400"
              : "bg-brand-400"
          }`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0, 0.2, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: delay + 0.5 }}
          style={{ filter: "blur(8px)" }}
        />
        <svg
          className={`transform -rotate-90 ${glowClasses[actualColor]} relative z-10`}
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            className={bgColorClasses[actualColor]}
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress circle with dash animation */}
          <motion.circle
            className={colorClasses[actualColor]}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1], delay }}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center z-20"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: delay + 0.8, type: "spring" }}
        >
          <motion.span
            className="text-xl font-black text-gray-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 1 }}
          >
            {score}%
          </motion.span>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Horizontal Progress Bar Component with Key Finding and Icons
const HorizontalProgressBar = ({
  score,
  label,
  keyFinding,
  delay = 0,
}: {
  score: number;
  label: string;
  keyFinding?: string;
  delay?: number;
}) => {
  const getColor = (s: number) => {
    if (s >= 90)
      return {
        bg: "bg-green-500",
        light: "bg-green-100",
        text: "text-green-600",
        icon: CheckCircle2,
        iconColor: "text-green-500",
      };
    if (s >= 70)
      return {
        bg: "bg-yellow-500",
        light: "bg-yellow-100",
        text: "text-yellow-600",
        icon: AlertTriangle,
        iconColor: "text-yellow-500",
      };
    return {
      bg: "bg-red-500",
      light: "bg-red-100",
      text: "text-red-600",
      icon: AlertTriangle,
      iconColor: "text-red-500",
    };
  };

  const colors = getColor(score);
  const IconComponent = colors.icon;

  // Parse key finding to determine icon type
  const isPositive = keyFinding?.startsWith("✓");
  const cleanKeyFinding = keyFinding?.replace(/^[✓⚠️]\s*/, "");

  return (
    <motion.div
      className="mb-5"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay, type: "spring", stiffness: 80 }}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <motion.span
          className={`text-sm font-bold ${colors.text}`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.3, type: "spring" }}
        >
          {score}%
        </motion.span>
      </div>
      <div
        className={`w-full h-3 ${colors.light} rounded-full overflow-hidden shadow-inner`}
      >
        <motion.div
          className={`h-full ${colors.bg} rounded-full relative overflow-hidden`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{
            duration: 1.2,
            ease: [0.4, 0, 0.2, 1],
            delay: delay + 0.2,
          }}
        >
          {/* Animated shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{
              duration: 1.5,
              delay: delay + 0.8,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />
        </motion.div>
      </div>
      {keyFinding && (
        <motion.div
          className="flex items-start gap-1.5 mt-2"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: delay + 0.6 }}
        >
          {isPositive ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
          )}
          <span
            className={`text-xs ${
              isPositive ? "text-gray-600" : "text-yellow-700"
            } leading-relaxed`}
          >
            {cleanKeyFinding}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

// Grade Badge Component
const GradeBadge = ({
  grade,
  size = "lg",
}: {
  grade: string;
  size?: "sm" | "lg";
}) => {
  const getGradeColor = (g: string) => {
    if (g.startsWith("A")) return "bg-green-500";
    if (g.startsWith("B") || g.startsWith("C")) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div
      className={`${getGradeColor(
        grade
      )} text-white font-black rounded-2xl flex items-center justify-center shadow-lg ${
        size === "lg" ? "w-24 h-24 text-5xl" : "w-12 h-12 text-2xl"
      }`}
    >
      {grade}
    </div>
  );
};

// Time Elapsed Component for Sidebar
const TimeElapsed = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <span className="font-mono">
      {minutes}:{secs.toString().padStart(2, "0")}
    </span>
  );
};

// 1. Sidebar Component with Fixed Icon Alignment
const Sidebar = ({
  stage,
  progress,
  setStage,
}: {
  stage: AuditStage;
  progress: number;
  setStage: (s: AuditStage) => void;
}) => {
  const steps: { id: AuditStage; label: string; icon: any }[] = [
    { id: "input", label: "Business Search", icon: Search },
    { id: "scanning_website", label: "Website Analysis", icon: Globe },
    { id: "analyzing_gbp", label: "GBP Profile Audit", icon: MapPin },
    { id: "competitor_map", label: "Competitor Landscape", icon: Users },
    { id: "dashboard", label: "Final Report", icon: TrendingUp },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === stage);

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
          const isFinalReport = step.id === "dashboard";
          const isDashboardActive = stage === "dashboard" && isFinalReport;
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
                  ) : isActive && !isDashboardActive ? (
                    <div className="relative">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                      <div className="absolute inset-0 bg-brand-500/20 blur-lg rounded-full animate-pulse"></div>
                    </div>
                  ) : isActive && isDashboardActive ? (
                    <CheckCircle2 className="w-6 h-6 text-brand-600" />
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

      {stage !== "input" && stage !== "dashboard" && (
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

// 2. Input Stage
const InputStage = ({
  onSearch,
  selectedGBP,
  onSelectGBP,
  onClearGBP,
}: {
  onSearch: (gbp: SelectedGBP) => void;
  selectedGBP: SelectedGBP | null;
  onSelectGBP: (gbp: SelectedGBP) => void;
  onClearGBP: () => void;
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGBP) onSearch(selectedGBP);
  };

  const canSubmit = selectedGBP !== null;

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-[1080px] mx-auto px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <motion.div
          className="mb-8 flex flex-col items-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <img
            src="/logo.png"
            alt="Alloro"
            className="w-16 h-16 object-contain mb-3"
          />
          <div className="flex items-center gap-2 px-4 py-1.5 bg-brand-50 rounded-full border border-brand-100">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-semibold text-brand-600">
              Alloro Practice Analyzer
            </span>
          </div>
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
          Is your practice beating the{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-orange-400">
            competition?
          </span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 font-light">
          Alloro will analyze your practice's digital presence and reveal growth
          opportunities.
        </p>

        <form
          onSubmit={handleSubmit}
          className="w-full space-y-4 flex flex-col items-center"
        >
          {/* GBP Search Select Component */}
          <div className="max-w-[600px] w-full">
            <GBPSearchSelect
              onSelect={onSelectGBP}
              selectedGBP={selectedGBP}
              onClear={onClearGBP}
              placeholder="Search for your business on Google..."
            />
          </div>

          {/* Selected GBP Info & Submit Button */}
          {selectedGBP && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <button
                type="submit"
                disabled={!canSubmit}
                className="bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl px-10 py-4 font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-500/30 disabled:shadow-none flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Confirm and Start Audit
              </button>
            </motion.div>
          )}
        </form>

        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-500">
          <span className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
            <Sparkles className="w-4 h-4 text-brand-500" /> AI-Powered
          </span>
          <span className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
            <Zap className="w-4 h-4 text-yellow-500" /> Real-time Analysis
          </span>
          <span className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
            <Users className="w-4 h-4 text-blue-500" /> Competitor Intel
          </span>
        </div>
      </motion.div>
    </div>
  );
};

// 3. Website Scan Stage with Cropped Screenshots and Extended Timing
// Shows loading skeleton initially, then real screenshots once received
const WebsiteScanStage = memo(
  ({
    desktopScreenshot,
    mobileScreenshot,
    domain,
  }: {
    desktopScreenshot?: string | null;
    mobileScreenshot?: string | null;
    domain?: string;
  }) => {
    const [activeMessage, setActiveMessage] = useState(
      "Initializing connection..."
    );
    const [floatingTags, setFloatingTags] = useState<
      { id: number; text: string; x: number; y: number }[]
    >([]);
    const [messageIndex, setMessageIndex] = useState(0);

    // Determine if we have real screenshots or still loading
    const hasScreenshots = !!desktopScreenshot && !!mobileScreenshot;
    const displayDomain = domain || "loading...";

    const messages = useMemo(
      () => [
        "Initializing connection...",
        "Checking SSL handshake...",
        "Parsing DOM structure...",
        "Evaluating Mobile Viewport...",
        "Calculating First Contentful Paint...",
        "Scanning images for Alt tags...",
        "Analyzing Color Contrast...",
        "Locating Call-To-Action buttons...",
        "Measuring Time to Interactive...",
        "Checking Core Web Vitals...",
        "Analyzing page structure...",
        "Validating accessibility features...",
        "Compiling results...",
      ],
      []
    );

    const tags = useMemo(
      () => [
        "Speed OK",
        "SSL Secure",
        "Mobile Ready",
        "Fonts Loaded",
        "JS Minified",
        "Images Optimized",
        "CTA Found",
        "H1 Present",
        "Meta Tags OK",
        "Schema Valid",
      ],
      []
    );

    useEffect(() => {
      // Show messages sequentially with 1.2s interval
      const messageInterval = setInterval(() => {
        setMessageIndex((prev) => {
          const next = prev + 1;
          if (next < messages.length) {
            setActiveMessage(messages[next]);
            return next;
          }
          return prev;
        });
      }, 1200);

      return () => clearInterval(messageInterval);
    }, [messages]);

    useEffect(() => {
      // Only show floating tags once we have screenshots
      if (!hasScreenshots) return;

      let tagIndex = 0;
      const tagInterval = setInterval(() => {
        if (tagIndex < tags.length) {
          setFloatingTags((prev) => [
            ...prev.slice(-6),
            {
              id: Date.now(),
              text: tags[tagIndex],
              x: 15 + Math.random() * 70,
              y: 15 + Math.random() * 70,
            },
          ]);
          tagIndex++;
        }
      }, 800);

      return () => clearInterval(tagInterval);
    }, [tags, hasScreenshots]);

    // Loading skeleton component for browser content - CSS-based to prevent glitches
    const BrowserLoadingSkeleton = ({
      isMobile = false,
    }: {
      isMobile?: boolean;
    }) => (
      <div
        className={`w-full h-full bg-gray-100 flex flex-col ${
          isMobile ? "p-2" : "p-4"
        }`}
      >
        {/* Fake loading bar at top - CSS-based */}
        <div className="h-1 bg-brand-500 rounded-full mb-4 loading-bar" />

        {/* Skeleton content blocks */}
        <div className="space-y-3 flex-1">
          {/* Hero skeleton */}
          <div
            className={`bg-gray-200 rounded-lg skeleton-pulse ${
              isMobile ? "h-20" : "h-32"
            }`}
          />

          {/* Text lines skeleton */}
          <div className="space-y-2">
            <div
              className={`bg-gray-200 rounded skeleton-pulse-delay-1 ${
                isMobile ? "h-2 w-3/4" : "h-3 w-2/3"
              }`}
            />
            <div
              className={`bg-gray-200 rounded skeleton-pulse-delay-2 ${
                isMobile ? "h-2 w-1/2" : "h-3 w-1/2"
              }`}
            />
            <div
              className={`bg-gray-200 rounded skeleton-pulse-delay-3 ${
                isMobile ? "h-2 w-5/6" : "h-3 w-4/5"
              }`}
            />
          </div>

          {/* Card skeletons */}
          <div
            className={`grid ${
              isMobile ? "grid-cols-1 gap-2" : "grid-cols-3 gap-3"
            } mt-4`}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`bg-gray-200 rounded-lg skeleton-pulse ${
                  isMobile ? "h-12" : "h-20"
                }`}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>

        {/* Centered loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg">
            <Loader2
              className={`${
                isMobile ? "w-4 h-4" : "w-6 h-6"
              } animate-spin text-brand-500`}
            />
            <span
              className={`${
                isMobile ? "text-[8px]" : "text-xs"
              } font-semibold text-gray-600`}
            >
              Capturing...
            </span>
          </div>
        </div>
      </div>
    );

    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50">
        <div className="text-center mb-8 relative z-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img
              src="/logo.png"
              alt="Alloro"
              className="w-8 h-8 object-contain"
            />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Alloro AI
            </span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
            {hasScreenshots
              ? "Analyzing Your Digital Presence"
              : "Gathering Information"}
          </h2>
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-brand-50 rounded-full border border-brand-100">
            <Loader2 className="w-3 h-3 animate-spin text-brand-600" />
            <p className="text-brand-600 font-mono text-sm font-semibold">
              {hasScreenshots ? activeMessage : "Connecting to website..."}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center justify-center w-full max-w-6xl relative">
          {/* Decorative Background Elements */}
          <div className="absolute -inset-10 bg-gradient-to-r from-blue-50 to-brand-50 opacity-50 blur-3xl rounded-full"></div>

          {/* Desktop View - Monitor Frame with Browser */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full md:w-3/4 z-10"
          >
            {/* Monitor SVG Frame */}
            <div className="relative">
              {/* Monitor Body */}
              <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-2 shadow-2xl border border-gray-700">
                {/* Screen Bezel */}
                <div className="bg-black rounded-lg p-1">
                  {/* Browser Window */}
                  <div className="bg-white rounded-md overflow-hidden aspect-video relative">
                    {/* Dark Header Bar - macOS style */}
                    <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-3">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#FF5F56] hover:bg-[#FF5F56]/80 transition-colors cursor-pointer"></div>
                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FFBD2E]/80 transition-colors cursor-pointer"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27CA3F] hover:bg-[#27CA3F]/80 transition-colors cursor-pointer"></div>
                      </div>
                      {/* Browser Search Bar */}
                      <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1.5 min-w-[300px] border border-gray-600">
                          {hasScreenshots ? (
                            <Lock className="w-3 h-3 text-green-400" />
                          ) : (
                            <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                          )}
                          <span
                            className={`text-xs font-medium ${
                              hasScreenshots ? "text-gray-300" : "text-gray-500"
                            }`}
                          >
                            {displayDomain}
                          </span>
                        </div>
                      </div>
                      <div className="w-16"></div>
                    </div>

                    {/* Screenshot container OR Loading skeleton */}
                    <div className="absolute inset-0 top-10 overflow-hidden">
                      {hasScreenshots ? (
                        <motion.img
                          src={desktopScreenshot}
                          alt="Desktop Screenshot"
                          className="w-full h-auto object-cover object-top"
                          style={{ minHeight: "100%" }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                        />
                      ) : (
                        <BrowserLoadingSkeleton />
                      )}
                    </div>

                    {/* Scan Line - Green - Always rendered to prevent animation restart */}
                    <div
                      className={`absolute left-0 right-0 h-0.5 bg-green-400 shadow-[0_0_20px_4px_rgba(74,222,128,0.6)] z-20 transition-opacity duration-300 ${
                        hasScreenshots ? "opacity-100" : "opacity-0"
                      }`}
                      style={{
                        animation: "scanVertical 2s linear infinite",
                      }}
                    />

                    {/* Floating Tags (only show when we have screenshots) */}
                    <AnimatePresence>
                      {hasScreenshots &&
                        floatingTags.map((tag) => (
                          <motion.div
                            key={tag.id}
                            initial={{ opacity: 0, scale: 0, x: -20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0 }}
                            style={{ top: `${tag.y}%`, left: `${tag.x}%` }}
                            className="absolute bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg z-30 pointer-events-none"
                          >
                            {tag.text}
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Monitor Stand */}
              <div className="flex flex-col items-center">
                {/* Stand Neck */}
                <div className="w-16 h-6 bg-gradient-to-b from-gray-700 to-gray-800 rounded-b-sm"></div>
                {/* Stand Base */}
                <div className="w-32 h-2 bg-gradient-to-b from-gray-600 to-gray-800 rounded-full shadow-lg"></div>
              </div>
            </div>
          </motion.div>

          {/* Mobile View - Better browser-like design */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative w-1/4 max-w-[240px] aspect-[9/19] bg-gray-900 rounded-[2.5rem] border-[6px] border-gray-800 overflow-hidden shadow-2xl z-20 ring-4 ring-gray-700/50"
          >
            {/* Dynamic Island / Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30 flex items-center justify-center">
              <div className="w-12 h-3 bg-gray-900 rounded-full"></div>
            </div>

            {/* Mobile Browser Header */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gray-800/95 backdrop-blur-sm z-20 pt-8 px-3">
              <div className="flex items-center gap-2 bg-gray-700/60 rounded-full px-3 py-1.5 border border-gray-600/50">
                {hasScreenshots ? (
                  <Lock className="w-2.5 h-2.5 text-green-400" />
                ) : (
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-gray-400" />
                )}
                <span
                  className={`text-[10px] font-medium truncate ${
                    hasScreenshots ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  {displayDomain}
                </span>
              </div>
            </div>

            {/* Screenshot container OR Loading skeleton */}
            <div className="absolute inset-0 top-16 overflow-hidden">
              {hasScreenshots ? (
                <motion.img
                  src={mobileScreenshot}
                  alt="Mobile Screenshot"
                  className="w-full h-auto object-cover object-top"
                  style={{ minHeight: "100%" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                />
              ) : (
                <BrowserLoadingSkeleton isMobile />
              )}
            </div>

            {/* Scan Line - Green - Always rendered to prevent animation restart */}
            <div
              className={`absolute left-0 right-0 h-1 bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)] z-10 transition-opacity duration-300 ${
                hasScreenshots ? "opacity-100" : "opacity-0"
              }`}
              style={{
                animation: "scanVerticalMobile 1.5s linear infinite 0.5s",
              }}
            />
          </motion.div>
        </div>
      </div>
    );
  }
);

// Photos Analysis Sub-Stage Component with delayed mini cards
const PhotosAnalysisSubStage = ({
  data,
  collageItems,
}: {
  data: BusinessProfile;
  collageItems: {
    x: number;
    y: number;
    w: number;
    h: number;
    rotate: number;
    z: number;
  }[];
}) => {
  const [showMiniCards, setShowMiniCards] = useState(false);

  // Show mini cards after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMiniCards(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      key="photos"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      className="absolute inset-0 flex flex-col items-center justify-center"
    >
      <h3 className="text-lg font-bold text-gray-500 mb-8 uppercase tracking-widest">
        Visual Portfolio Scan
      </h3>
      {/* Collage layout with random positions and sizes */}
      <div className="relative w-full max-w-4xl h-[380px]">
        {/* Animated Magnifier Image - Always on top with random movement */}
        <img
          src="/magnifier.png"
          alt="Searching"
          className="absolute w-24 h-24 object-contain pointer-events-none magnifier-animate"
          style={{
            zIndex: 100,
            filter: "drop-shadow(0 8px 16px rgba(214, 104, 83, 0.5))",
          }}
        />

        {data.imageUrls.slice(0, 8).map((url, i) => {
          const pos = collageItems[i];
          return (
            <motion.div
              key={i}
              initial={{
                opacity: 0,
                scale: 0,
                rotate: pos.rotate * 2,
              }}
              animate={{ opacity: 1, scale: 1, rotate: pos.rotate }}
              transition={{
                delay: i * 0.08,
                type: "spring",
                stiffness: 120,
                damping: 15,
              }}
              whileHover={{
                scale: 1.1,
                rotate: 0,
                zIndex: 50,
                transition: { duration: 0.3 },
              }}
              className="absolute rounded-xl overflow-hidden shadow-xl bg-gray-100 cursor-pointer group"
              style={{
                left: pos.x,
                top: pos.y,
                width: pos.w,
                height: pos.h,
                zIndex: pos.z,
              }}
            >
              <img
                src={url}
                className="w-full h-full object-cover transition-all duration-500 group-hover:brightness-110"
                alt={`Practice ${i + 1}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <motion.div
                className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                initial={{ y: 10 }}
                whileHover={{ y: 0 }}
              >
                Photo {i + 1}
              </motion.div>
            </motion.div>
          );
        })}

        {/* Mini Profile Card - Top Left - Appears after 3 seconds */}
        <AnimatePresence>
          {showMiniCards && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, x: -50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 150, damping: 15 }}
              className="absolute -top-4 -left-4 z-[60] w-56"
            >
              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                <div className="h-16 relative">
                  <img
                    src={data.imageUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="p-3">
                  <h4 className="text-xs font-bold text-gray-900 truncate">
                    {data.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-0.5 text-yellow-500">
                      <Star className="w-3 h-3 fill-yellow-500" />
                      <span className="text-[10px] font-bold">
                        {data.totalScore}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {data.reviewsCount} reviews
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400">
                    <MapPin className="w-2.5 h-2.5" />
                    <span className="truncate">
                      {data.city}, {data.state}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mini Reviews List - Bottom Right - Appears after 3 seconds */}
        <AnimatePresence>
          {showMiniCards && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 15,
                delay: 0.15,
              }}
              className="absolute -bottom-4 -right-4 z-[60] w-64"
            >
              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Star className="w-3 h-3 text-brand-500" />
                  <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">
                    Recent Reviews
                  </span>
                </div>
                <div className="space-y-1.5">
                  {data.reviews.slice(0, 3).map((review, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-1.5 bg-gray-50 rounded-lg"
                    >
                      <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-[8px] font-bold text-brand-600 flex-shrink-0">
                        {review.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-semibold text-gray-800 truncate">
                            {review.name}
                          </span>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, si) => (
                              <Star
                                key={si}
                                className={`w-2 h-2 ${
                                  si < review.stars
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-200 fill-gray-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-[8px] text-gray-500 line-clamp-1 mt-0.5">
                          {review.text || "Great experience!"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading indicator - replaces "X Photos Analyzed" */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 bg-white px-8 py-4 rounded-2xl shadow-xl border border-gray-200 flex items-center gap-4"
      >
        <div className="relative">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          <div className="absolute inset-0 bg-brand-500/20 blur-md rounded-full animate-pulse" />
        </div>
        <div>
          <p className="font-bold text-gray-800">
            Analyzing photos, sentiments and business profile
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Preparing final analysis...
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// 4. GBP Analysis Stage (Carousel) - Shows loading skeleton when data not available
// Auto-cycles through 3 pages (3s each = 9s total) after data loads
// Reports completion via onCarouselComplete callback
const GBPAnalysisStage = memo(
  ({
    data,
    isLoading = false,
    onCarouselComplete,
  }: {
    data: BusinessProfile | null;
    isLoading?: boolean;
    onCarouselComplete?: () => void;
  }) => {
    const [subStage, setSubStage] = useState(0); // 0: Profile, 1: Reviews, 2: Photos
    const [carouselStarted, setCarouselStarted] = useState(false);
    const carouselCompletedRef = React.useRef(false);
    const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

    // Generate random positions and sizes for collage
    const collageItems = useMemo(() => {
      const positions = [
        { x: 5, y: 5, w: 180, h: 140, rotate: -3, z: 1 },
        { x: 200, y: 0, w: 160, h: 200, rotate: 2, z: 2 },
        { x: 380, y: 20, w: 200, h: 150, rotate: -1, z: 1 },
        { x: 600, y: 5, w: 150, h: 180, rotate: 3, z: 2 },
        { x: 30, y: 160, w: 170, h: 130, rotate: 1, z: 3 },
        { x: 220, y: 210, w: 140, h: 170, rotate: -2, z: 2 },
        { x: 400, y: 190, w: 180, h: 140, rotate: 2, z: 1 },
        { x: 600, y: 200, w: 160, h: 160, rotate: -3, z: 3 },
      ];
      return positions;
    }, []);

    // Store callback in ref to avoid dependency issues
    const onCarouselCompleteRef = React.useRef(onCarouselComplete);
    onCarouselCompleteRef.current = onCarouselComplete;

    // Start carousel and interval when data becomes available
    useEffect(() => {
      // If already started or no data, skip
      if (carouselStarted || isLoading || !data) {
        return;
      }

      console.log("GBP carousel starting - data loaded");
      setCarouselStarted(true);
      setSubStage(0); // Reset to first page

      // Start the interval immediately
      console.log("Starting carousel interval");
      intervalRef.current = setInterval(() => {
        setSubStage((prev) => {
          const next = (prev + 1) % 3;
          console.log(`Carousel advancing: ${prev} -> ${next}`);
          // If we've completed a full cycle (back to 0), mark as complete and STOP
          if (next === 0 && !carouselCompletedRef.current) {
            carouselCompletedRef.current = true;
            console.log(
              "Carousel cycle complete, stopping interval and calling onCarouselComplete"
            );
            // Stop the interval - carousel is done
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            // Call the completion callback
            onCarouselCompleteRef.current?.();
            // Return prev to stay on last page (page 2) instead of going back to 0
            return prev;
          }
          return next;
        });
      }, 3000); // 3 seconds per page
    }, [isLoading, data, carouselStarted]);

    // Cleanup interval on unmount
    useEffect(() => {
      return () => {
        if (intervalRef.current) {
          console.log("Clearing carousel interval on unmount");
          clearInterval(intervalRef.current);
        }
      };
    }, []);

    // Skeleton component for loading state - CSS-based to prevent glitches
    const GBPLoadingSkeleton = () => (
      <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] overflow-hidden max-w-3xl w-full border border-gray-200 flex flex-col md:flex-row h-[420px] relative">
        {/* Left side - Image skeleton */}
        <div className="w-full md:w-2/5 h-full relative">
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 skeleton-pulse" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
          <div className="absolute bottom-6 left-6">
            <div className="h-6 w-24 bg-gray-400 rounded-lg mb-2 skeleton-pulse-delay-1" />
            <div className="h-4 w-32 bg-gray-400/60 rounded skeleton-pulse-delay-2" />
          </div>
        </div>

        {/* Right side - Content skeleton */}
        <div className="p-8 flex-1 flex flex-col justify-center">
          <div className="flex justify-between items-start mb-5">
            <div className="h-8 w-48 bg-gray-200 rounded-lg skeleton-pulse" />
            <div className="h-6 w-20 bg-gray-200 rounded-full skeleton-pulse-delay-1" />
          </div>

          <div className="space-y-3 mb-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 skeleton-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="p-2 bg-gray-200 rounded-lg w-10 h-10" />
                <div className="h-4 bg-gray-200 rounded flex-1" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="text-center p-4 bg-gray-100 rounded-2xl border border-gray-200 skeleton-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="h-7 w-12 bg-gray-200 rounded mx-auto mb-2" />
                <div className="h-3 w-16 bg-gray-200 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img
              src="/logo.png"
              alt="Alloro"
              className="w-8 h-8 object-contain"
            />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Alloro AI
            </span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            {isLoading || !data
              ? "Fetching Your GBP Data"
              : "Google Business Profile Deep Dive"}
          </h2>
          {/* Header tabs with more spacing - disabled when loading */}
          <div className="flex justify-center gap-10 mt-6">
            {["Profile Health", "Review Sentiment", "Visual Authority"].map(
              (label, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-2 px-3 ${
                    isLoading || !data
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                  onClick={() => !isLoading && data && setSubStage(i)}
                >
                  <span
                    className={`text-sm font-bold uppercase tracking-wider transition-colors ${
                      i === subStage ? "text-brand-600" : "text-gray-400"
                    }`}
                  >
                    {label}
                  </span>
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                      i === subStage
                        ? "w-28 bg-brand-500 shadow-brand-500/50 shadow-md"
                        : "w-16 bg-gray-200"
                    }`}
                  />
                </div>
              )
            )}
          </div>
        </div>

        <div className="w-full max-w-5xl h-[550px] relative perspective-1000">
          {/* Green horizontal scanning line - Always rendered, visibility controlled by opacity to prevent animation restart */}
          {/* Show during loading and during subStage 0 and 1, but hide during photos (subStage 2) */}
          <div
            className={`absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-500 to-transparent z-30 pointer-events-none transition-opacity duration-300 ${
              subStage !== 2 ? "opacity-100" : "opacity-0"
            }`}
            style={{
              boxShadow: "0 0 20px 2px rgba(34,197,94,0.5)",
              animation: "gbpScanVertical 1.5s linear infinite",
            }}
          />

          {/* Show loading skeleton when no data */}
          {isLoading || !data ? (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute inset-0 flex flex-col gap-6 items-center justify-center p-4"
            >
              <div className="flex items-center gap-2 mb-2 bg-white px-5 py-2.5 rounded-full shadow-lg border border-gray-100">
                <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                <span className="text-sm font-semibold text-gray-600">
                  Fetching your Google Business Profile...
                </span>
              </div>
              <GBPLoadingSkeleton />
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {subStage === 0 && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.95 }}
                  transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                  className="absolute inset-0 flex flex-col gap-6 items-center justify-center p-4"
                >
                  {/* Loading indicator */}
                  <div className="flex items-center gap-2 mb-2 bg-white px-5 py-2.5 rounded-full shadow-lg border border-gray-100">
                    <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                    <span className="text-sm font-semibold text-gray-600">
                      Extracting profile data...
                    </span>
                  </div>

                  <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] overflow-hidden max-w-3xl w-full border border-gray-200 flex flex-col md:flex-row h-[420px] relative">
                    <div className="w-full md:w-2/5 h-full relative">
                      <img
                        src={data.imageUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-6 left-6 text-white">
                        <div className="bg-brand-500 text-xs font-bold px-3 py-1.5 rounded-lg mb-2 inline-block shadow-lg shadow-brand-500/30">
                          {data.categoryName}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-white/90">
                          <MapPin className="w-3.5 h-3.5" />{" "}
                          {data.location.lat.toFixed(4)},{" "}
                          {data.location.lng.toFixed(4)}
                        </div>
                      </div>
                    </div>
                    <div className="p-8 flex-1 flex flex-col justify-center overflow-hidden">
                      <div className="flex justify-between items-start mb-5 gap-3">
                        <h3
                          className="text-2xl font-bold text-gray-900 truncate flex-1"
                          title={data.title}
                        >
                          {data.title}
                        </h3>
                        <div className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1.5 shadow-sm flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-gray-600 p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="p-2 bg-brand-100 rounded-lg flex-shrink-0">
                            <MapPin className="w-4 h-4 text-brand-600" />
                          </div>
                          <span
                            className="text-sm font-medium truncate"
                            title={data.address}
                          >
                            {data.address}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                            <Globe className="w-4 h-4 text-blue-600" />
                          </div>
                          <span
                            className="text-sm font-medium truncate"
                            title={data.website}
                          >
                            {data.website}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border border-yellow-200 shadow-sm">
                          <div className="flex items-center justify-center gap-1 text-2xl font-black text-gray-900">
                            {data.totalScore}
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                          </div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                            Star Rating
                          </div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-sm">
                          <div className="text-2xl font-black text-gray-900">
                            {data.reviewsCount}
                          </div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                            Reviews
                          </div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 shadow-sm">
                          <div className="text-2xl font-black text-gray-900">
                            {data.imagesCount}
                          </div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                            Photos
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {subStage === 1 && data && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                  className="absolute inset-0 flex flex-col gap-6 items-center justify-center p-4"
                >
                  <div className="flex items-center gap-2 mb-2 bg-white px-5 py-2.5 rounded-full shadow-lg border border-gray-100">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                    <span className="text-sm font-semibold text-gray-600">
                      Analyzing sentiment patterns...
                    </span>
                  </div>
                  <div className="w-full max-w-2xl space-y-4 relative">
                    {data.reviews.slice(0, 3).map((review, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: i * 0.15,
                          type: "spring",
                          stiffness: 100,
                        }}
                        className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 relative overflow-hidden"
                      >
                        {/* Sentiment indicator bar */}
                        <motion.div
                          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-green-400 to-green-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${review.stars * 20}%` }}
                          transition={{ delay: i * 0.15 + 0.3, duration: 0.8 }}
                        />

                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center font-bold text-brand-700 shadow-inner text-lg">
                              {review.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-sm">
                                {review.name}
                              </div>
                              <div className="flex text-yellow-400 text-xs gap-0.5 mt-0.5">
                                {[...Array(5)].map((_, si) => (
                                  <Star
                                    key={si}
                                    className={`w-3.5 h-3.5 ${
                                      si < review.stars
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-200 fill-gray-200"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                            {review.publishAt}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                          "{review.text}"
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {subStage === 2 && data && (
                <PhotosAnalysisSubStage
                  data={data}
                  collageItems={collageItems}
                />
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    );
  }
);

// 5. Competitor Map Stage with Google Maps Integration - Unmovable/Undraggable with deduplicated pins
const CompetitorMapStage = memo(
  ({
    self,
    competitors,
    isLoading = false,
  }: {
    self: BusinessProfile;
    competitors: Competitor[];
    isLoading?: boolean;
  }) => {
    const [showingCompetitors, setShowingCompetitors] = useState<number[]>([]);
    const animationStartedRef = React.useRef<string>("");

    // Deduplicate competitors by unique location to prevent overlapping pins
    const uniqueCompetitors = useMemo(() => {
      const seen = new Map<string, Competitor>();
      competitors.forEach((comp) => {
        // Check if location exists before accessing properties
        if (
          comp.location &&
          typeof comp.location.lat === "number" &&
          typeof comp.location.lng === "number"
        ) {
          const key = `${comp.location.lat.toFixed(
            4
          )}_${comp.location.lng.toFixed(4)}`;
          if (!seen.has(key)) {
            seen.set(key, comp);
          }
        }
      });
      return Array.from(seen.values());
    }, [competitors]);

    // Create a stable key for competitors to detect actual changes
    const competitorsKey = useMemo(() => {
      return uniqueCompetitors.map((c) => c.title).join("|");
    }, [uniqueCompetitors]);

    // Calculate bounding box for positioning pins
    const bounds = useMemo(() => {
      if (uniqueCompetitors.length === 0) {
        return {
          minLat: self.location.lat,
          maxLat: self.location.lat,
          minLng: self.location.lng,
          maxLng: self.location.lng,
        };
      }

      let minLat = self.location.lat;
      let maxLat = self.location.lat;
      let minLng = self.location.lng;
      let maxLng = self.location.lng;

      uniqueCompetitors.forEach((comp) => {
        minLat = Math.min(minLat, comp.location.lat);
        maxLat = Math.max(maxLat, comp.location.lat);
        minLng = Math.min(minLng, comp.location.lng);
        maxLng = Math.max(maxLng, comp.location.lng);
      });

      // Add some padding to the bounds
      const latPadding = (maxLat - minLat) * 0.1 || 0.01;
      const lngPadding = (maxLng - minLng) * 0.1 || 0.01;

      return {
        minLat: minLat - latPadding,
        maxLat: maxLat + latPadding,
        minLng: minLng - lngPadding,
        maxLng: maxLng + lngPadding,
      };
    }, [uniqueCompetitors, self.location]);

    // Store timeouts in a ref to persist across renders
    const timeoutsRef = React.useRef<NodeJS.Timeout[]>([]);

    // Progressively reveal competitors with stagger animation
    // Use ref to track animation state to avoid dependency issues
    useEffect(() => {
      // Only start revealing when not loading and we have competitors
      if (isLoading) {
        return;
      }

      // Check if we have competitors
      if (uniqueCompetitors.length === 0) {
        return;
      }

      // Check if we've already started animation for this dataset
      if (animationStartedRef.current === competitorsKey) {
        // If already animated this dataset, ensure all are shown
        if (showingCompetitors.length !== uniqueCompetitors.length) {
          const allIndices = uniqueCompetitors.map((_, i) => i);
          setShowingCompetitors(allIndices);
        }
        return;
      }

      // Mark animation as started for this dataset
      animationStartedRef.current = competitorsKey;

      console.log(
        "Starting competitor reveal animation for",
        uniqueCompetitors.length,
        "competitors"
      );

      // Clear any existing timeouts
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];

      setShowingCompetitors([]);

      // Create new timeouts
      uniqueCompetitors.forEach((_, i) => {
        const timeout = setTimeout(() => {
          setShowingCompetitors((prev) => {
            if (prev.includes(i)) return prev;
            console.log("Revealing competitor", i);
            return [...prev, i];
          });
        }, 300 + i * 300); // Faster reveal: 300ms stagger
        timeoutsRef.current.push(timeout);
      });
    }, [isLoading, competitorsKey, uniqueCompetitors.length]);

    // Cleanup timeouts on unmount only
    useEffect(() => {
      return () => {
        console.log("Cleaning up competitor reveal timeouts on unmount");
        timeoutsRef.current.forEach((t) => clearTimeout(t));
      };
    }, []);

    // Create Google Maps embed URL centered on business location - STATIC MAP (no interactions)
    const mapEmbedUrl = useMemo(() => {
      const { lat, lng } = self.location;
      // Using static map mode to prevent dragging/scrolling
      return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d6000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1705000000000!5m2!1sen!2sus`;
    }, [self.location]);

    // Competitor list item - simplified to prevent animation glitches
    const CompetitorListItem = React.memo(
      ({
        competitor,
        index,
        isRevealed,
        isLoadingState,
      }: {
        competitor: Competitor;
        index: number;
        isRevealed: boolean;
        isLoadingState: boolean;
      }) => (
        <div
          className={`flex items-center justify-between text-xs p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-all duration-300 relative overflow-hidden ${
            isRevealed ? "opacity-100" : "opacity-30"
          }`}
        >
          {/* Left-to-right scanning animation when loading - CSS-based */}
          {isLoadingState && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/20 to-transparent z-10"
              style={{
                animation: `scanHorizontal 1.5s linear infinite ${
                  index * 0.2
                }s`,
              }}
            />
          )}

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 ${
                isRevealed && !isLoadingState ? "bg-red-500" : "bg-gray-300"
              } text-white rounded-full flex items-center justify-center text-[10px] font-bold transition-colors duration-300 shadow-sm`}
            >
              {index + 1}
            </span>
            <span
              className="font-semibold text-gray-700 truncate max-w-[120px]"
              title={competitor.title}
            >
              {competitor.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-500 flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-yellow-500" />
              {competitor.totalScore}
            </span>
            <span className="text-red-500 font-bold">
              {competitor.reviewsCount}
            </span>
          </div>
        </div>
      )
    );

    return (
      <div className="h-full flex flex-col relative overflow-hidden bg-slate-50">
        {/* Info Panel */}
        <div className="absolute top-6 left-6 z-20 bg-white/95 backdrop-blur-sm p-5 rounded-2xl shadow-xl max-w-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <MapPin className="text-brand-500 w-5 h-5" /> Territory Analysis
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                Scanning competitors in your area...
              </>
            ) : (
              <>
                Mapping{" "}
                <strong className="text-gray-900">
                  {uniqueCompetitors.length} competitors
                </strong>{" "}
                in your area. Analyzing review volume and market position...
              </>
            )}
          </p>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {uniqueCompetitors.slice(0, 5).map((c, i) => (
              <CompetitorListItem
                key={`competitor-${i}-${c.title}`}
                competitor={c}
                index={i}
                isRevealed={showingCompetitors.includes(i)}
                isLoadingState={isLoading}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 bg-blue-500 rounded-full"
                style={{ animation: "legendPulse 2s ease-in-out infinite" }}
              />
              <span className="text-gray-600">Your Location</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">Competitors</span>
            </div>
          </div>
        </div>

        {/* Google Maps Embed - with overlay to prevent interactions */}
        <div className="flex-1 relative">
          {/* Transparent overlay to block map interactions */}
          <div className="absolute inset-0 z-[5] cursor-default" />

          <iframe
            src={mapEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0, pointerEvents: "none" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0"
          />

          {/* Vertical scanning line animation when loading - CSS-based - FASTER */}
          <div
            className={`absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-green-500 to-transparent z-[6] transition-opacity duration-300 ${
              isLoading ? "opacity-100" : "opacity-0"
            }`}
            style={{
              boxShadow: "0 0 20px 4px rgba(34,197,94,0.6)",
              animation: "mapScanHorizontal 2s linear infinite",
            }}
          />

          {/* Horizontal scanning line animation when loading - CSS-based - FASTER */}
          <div
            className={`absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent z-[6] transition-opacity duration-300 ${
              isLoading ? "opacity-100" : "opacity-0"
            }`}
            style={{
              boxShadow: "0 0 20px 4px rgba(34,197,94,0.6)",
              animation: "mapScanVertical 1.5s linear infinite 0.5s",
            }}
          />

          {/* Animated Magnifier - over map but under competitor card - Always visible */}
          <img
            src="/magnifier.png"
            alt="Searching"
            className="absolute w-28 h-28 object-contain pointer-events-none magnifier-animate"
            style={{
              zIndex: 15,
              filter: "drop-shadow(0 8px 16px rgba(214, 104, 83, 0.5))",
            }}
          />

          {/* Understanding Competition Card - Bottom Right - Always visible */}
          <motion.div
            className="absolute bottom-6 right-6 z-[15]"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
          >
            <div className="bg-white px-6 py-5 rounded-2xl shadow-2xl border border-gray-200 flex items-center gap-4">
              <div className="relative">
                <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
                <div className="absolute inset-0 bg-brand-500/20 blur-lg rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-800">
                  Understanding competition
                </p>
                <p className="text-sm text-gray-500">
                  Analyzing nearby businesses...
                </p>
              </div>
            </div>
          </motion.div>

          {/* Overlay with custom markers for better visibility */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Animated Radar Sweep Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(214,104,83,0.05),transparent_70%)] animate-pulse"></div>

            {/* User Pin - Center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto">
              <div className="relative">
                <div
                  className="absolute -inset-12 bg-blue-500/30 rounded-full"
                  style={{ animation: "pinPulse 2s ease-in-out infinite" }}
                />
                <div className="bg-blue-600 text-white p-3 rounded-full shadow-[0_10px_20px_rgba(37,99,235,0.4)] relative border-[3px] border-white z-20">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-lg shadow-xl text-xs font-bold whitespace-nowrap border border-gray-100 flex flex-col items-center">
                  <span className="text-blue-600">You</span>
                  <span className="text-[10px] text-gray-400">
                    {self.reviewsCount} Reviews
                  </span>
                </div>
              </div>
            </div>

            {/* Competitor Pins - Positioned using bounding box normalization */}
            {uniqueCompetitors.map((comp, i) => {
              // Calculate position using bounding box normalization
              const latRange = bounds.maxLat - bounds.minLat;
              const lngRange = bounds.maxLng - bounds.minLng;

              // Normalize to 0-1 range, then map to 15-85% for padding
              const normalizedLat =
                latRange > 0
                  ? (comp.location.lat - bounds.minLat) / latRange
                  : 0.5;
              const normalizedLng =
                lngRange > 0
                  ? (comp.location.lng - bounds.minLng) / lngRange
                  : 0.5;

              // Invert lat (higher lat = lower on screen) and map to percentage
              const top = 15 + (1 - normalizedLat) * 70; // 15% to 85%
              const left = 15 + normalizedLng * 70; // 15% to 85%

              if (!showingCompetitors.includes(i)) return null;

              return (
                <motion.div
                  key={`comp-pin-${comp.title}-${i}`}
                  initial={{ opacity: 0, scale: 0, y: -30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    delay: i * 0.1,
                  }}
                  className="absolute z-10 pointer-events-auto"
                  style={{
                    top: `${top}%`,
                    left: `${left}%`,
                  }}
                >
                  <div className="relative group/pin cursor-pointer hover:scale-110 transition-transform duration-200">
                    <div
                      className="bg-white p-1.5 rounded-full shadow-lg border-2 border-red-500 hover:z-50"
                      style={{
                        animation: "pinShadowPulse 2s ease-in-out infinite",
                      }}
                    >
                      <div className="bg-red-500 rounded-full p-1.5">
                        <Users className="w-3 h-3 text-white" />
                      </div>
                    </div>

                    {/* Pin Info Tooltip */}
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-white px-3 py-2 rounded-lg shadow-xl border border-red-100 opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none z-50 min-w-[180px] max-w-[220px]">
                      <div
                        className="text-xs font-bold text-gray-800 truncate"
                        title={comp.title}
                      >
                        {comp.title}
                      </div>
                      <div
                        className="text-[10px] text-gray-500 truncate mt-0.5"
                        title={comp.address}
                      >
                        {comp.address}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-yellow-500 text-xs flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-yellow-500" />
                          {comp.totalScore}
                        </span>
                        <span className="text-xs font-bold text-red-500">
                          {comp.reviewsCount} Reviews
                        </span>
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-red-100 rotate-45"></div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

// Card animation variants for staggered entrance
const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      type: "spring",
      stiffness: 100,
    },
  }),
};

// 6. Dashboard Stage (Final) - Enhanced with Animations and Redesigned Layout
const DashboardStage = ({
  business,
  websiteData,
  gbpData,
  screenshotUrl,
}: {
  business: BusinessProfile;
  websiteData: WebsiteAnalysis;
  gbpData: GBPAnalysis;
  screenshotUrl?: string;
}) => {
  // Find the competitor with most reviews for comparison
  const topCompetitor = MOCK_COMPETITORS.reduce(
    (max, comp) => (comp.reviewsCount > max.reviewsCount ? comp : max),
    MOCK_COMPETITORS[0]
  );

  const reviewGap = topCompetitor.reviewsCount - business.reviewsCount;

  // Key findings for each metric - mix of positive and areas needing improvement
  const gbpKeyFindings: Record<string, string> = {
    "Profile Integrity": "✓ Excellent NAP consistency across all platforms",
    "Trust & Engagement": "⚠️ Critical: 763-review gap vs top competitor",
    "Visual Authority": "✓ Strong visual presence with quality photos",
    "Search Conversion": "⚠️ Posts lack strategic keyword targeting",
    "Competitor Analysis": "⚠️ Ranking #4 in local pack, losing market share",
  };

  const websiteKeyFindings: Record<string, string> = {
    "Trust & Authority":
      "⚠️ Missing testimonials & video content on landing pages",
    Accessibility: "✓ Excellent mobile responsiveness & ADA compliance",
    "Patient Journey": "⚠️ No online booking integration detected",
    "Technical Reliability": "✓ Fast load time & excellent Core Web Vitals",
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-100">
      {/* Top Paywall Banner - Alloro Orange with Markety AI Verbiage */}
      <motion.div
        className="bg-brand-500 text-white py-4 px-6 relative overflow-hidden"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
      >
        {/* Animated background pattern */}
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <p className="text-sm font-bold">
                Your Alloro Practice Analysis is ready!
              </p>
              <p className="text-xs text-white/80 mt-0.5">
                Get personalized weekly insights & AI-powered growth
                recommendations from the Alloro team.
              </p>
            </div>
          </div>
          <motion.button
            className="bg-white text-brand-600 hover:bg-gray-100 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Phone className="w-4 h-4" />
            Schedule Strategy Call
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto p-6 md:p-10 pb-20">
        {/* Header Section - Enhanced Animation */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 mb-8 overflow-hidden relative"
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Decorative gradient */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-100/50 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none" />

          <div className="flex flex-col lg:flex-row gap-8 relative z-10">
            {/* Screenshot Preview */}
            <motion.div
              className="lg:w-1/3"
              initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.7, delay: 0.3, type: "spring" }}
            >
              <div className="rounded-xl overflow-hidden shadow-xl border border-gray-200 aspect-video relative group">
                <img
                  src={screenshotUrl || MOCK_SCREENSHOT_DESKTOP}
                  alt="Website Preview"
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <motion.div
                  className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <span className="text-xs font-semibold text-gray-700">
                    Live Preview
                  </span>
                </motion.div>
              </div>
            </motion.div>

            {/* Report Info */}
            <motion.div
              className="lg:w-2/3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4, type: "spring" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/logo.png"
                  alt="Alloro"
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <motion.h1
                    className="text-2xl font-bold text-brand-500"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    Alloro Practice Intelligence Report
                  </motion.h1>
                  <p className="text-xs text-gray-500 font-medium">
                    Powered by AI Analysis Engine
                  </p>
                </div>
              </div>
              <motion.h2
                className="text-2xl font-semibold text-gray-800 mb-4 truncate max-w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                title={business.website}
              >
                {business.website}
              </motion.h2>

              <div className="space-y-3 text-gray-600">
                {[
                  {
                    label: "Report generated:",
                    value: new Date().toLocaleString(),
                  },
                  {
                    label: "Location:",
                    value:
                      business.city && business.state
                        ? `${business.city}, ${business.state}`
                        : business.address || "N/A",
                    icon: MapPin,
                  },
                  { label: "Category:", value: business.categoryName },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + idx * 0.1 }}
                  >
                    <span className="font-medium text-gray-500">
                      {item.label}
                    </span>
                    <span className="flex items-center gap-1">
                      {item.icon && (
                        <item.icon className="w-4 h-4 text-brand-500" />
                      )}
                      {item.value}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Overall Grades Section - Enhanced with Animated Circular Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* GBP Grade */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 overflow-hidden relative"
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{
              scale: 1.02,
              boxShadow: "0 20px 50px rgba(214,104,83,0.15)",
              transition: { duration: 0.3 },
            }}
          >
            {/* Animated gradient background */}
            <motion.div
              className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-brand-200 to-brand-100 rounded-full opacity-50"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-10 -left-10 w-24 h-24 bg-brand-100 rounded-full opacity-30"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 5, repeat: Infinity, delay: 1 }}
            />
            <div className="flex items-center gap-2 mb-6 relative z-10">
              <motion.div
                className="p-2 bg-brand-100 rounded-lg"
                whileHover={{ rotate: 10 }}
              >
                <MapPin className="w-5 h-5 text-brand-500" />
              </motion.div>
              <h3 className="text-lg font-bold text-gray-700">
                Google Business Profile Grade
              </h3>
            </div>
            <div className="flex items-center gap-6 relative z-10">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  duration: 1,
                  delay: 0.5,
                  type: "spring",
                  stiffness: 80,
                }}
              >
                <GradeBadge grade={gbpData.gbp_grade} />
              </motion.div>
              <div className="flex-1 flex items-center justify-center gap-6">
                <CircularProgress
                  score={gbpData.gbp_readiness_score}
                  label="Readiness Score"
                  size={100}
                  strokeWidth={8}
                  delay={0.6}
                />
                <CircularProgress
                  score={gbpData.sync_audit.nap_match ? 100 : 85}
                  label="NAP Consistency"
                  size={100}
                  strokeWidth={8}
                  delay={0.8}
                />
              </div>
            </div>
          </motion.div>

          {/* Website Grade */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 overflow-hidden relative"
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{
              scale: 1.02,
              boxShadow: "0 20px 50px rgba(59,130,246,0.15)",
              transition: { duration: 0.3 },
            }}
          >
            {/* Animated gradient background */}
            <motion.div
              className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-200 to-blue-100 rounded-full opacity-50"
              animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
              transition={{ duration: 8, repeat: Infinity, delay: 0.5 }}
            />
            <motion.div
              className="absolute -bottom-10 -left-10 w-24 h-24 bg-blue-100 rounded-full opacity-30"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 5, repeat: Infinity, delay: 1.5 }}
            />
            <div className="flex items-center gap-2 mb-6 relative z-10">
              <motion.div
                className="p-2 bg-blue-100 rounded-lg"
                whileHover={{ rotate: -10 }}
              >
                <Globe className="w-5 h-5 text-blue-500" />
              </motion.div>
              <h3 className="text-lg font-bold text-gray-700">
                Website Performance Grade
              </h3>
            </div>
            <div className="flex items-center gap-6 relative z-10">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  duration: 1,
                  delay: 0.6,
                  type: "spring",
                  stiffness: 80,
                }}
              >
                <GradeBadge grade={websiteData.overall_grade} />
              </motion.div>
              <div className="flex-1 flex items-center justify-center gap-6">
                <CircularProgress
                  score={Math.round(websiteData.overall_score)}
                  label="Overall Score"
                  size={100}
                  strokeWidth={8}
                  delay={0.7}
                />
                <motion.div
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2, type: "spring" }}
                >
                  <motion.div
                    className="text-3xl font-black text-green-500"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    2.1s
                  </motion.div>
                  <span className="mt-2 text-[10px] font-semibold text-gray-500 text-center uppercase tracking-wide">
                    Load Time
                  </span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* GBP Performance Metrics - Horizontal Progress Bars */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 mb-8 overflow-hidden relative"
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ boxShadow: "0 15px 50px rgba(214,104,83,0.12)" }}
        >
          {/* Subtle pattern background */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #D66853 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="flex items-center gap-3 mb-8 relative z-10">
            <motion.div
              className="p-2.5 bg-brand-100 rounded-xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <MapPin className="w-5 h-5 text-brand-500" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-800">
              GBP Performance Metrics
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-1 relative z-10">
            {gbpData.pillars.map((pillar, idx) => (
              <div key={idx}>
                <HorizontalProgressBar
                  score={Number(pillar.score)}
                  label={pillar.category}
                  keyFinding={gbpKeyFindings[pillar.category]}
                  delay={0.6 + idx * 0.12}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Website Performance Metrics - Horizontal Progress Bars */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 mb-8 overflow-hidden relative"
          custom={4}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ boxShadow: "0 15px 50px rgba(59,130,246,0.12)" }}
        >
          {/* Subtle pattern background */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #3B82F6 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="flex items-center gap-3 mb-8 relative z-10">
            <motion.div
              className="p-2.5 bg-blue-100 rounded-xl"
              whileHover={{ scale: 1.1, rotate: -5 }}
            >
              <Globe className="w-5 h-5 text-blue-500" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-800">
              Website Performance Metrics
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-1 relative z-10">
            {websiteData.pillars.map((pillar, idx) => (
              <div key={idx}>
                <HorizontalProgressBar
                  score={Number(pillar.score)}
                  label={pillar.category}
                  keyFinding={websiteKeyFindings[pillar.category]}
                  delay={0.7 + idx * 0.12}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Blurred Detailed Analysis - Paywall */}
        <div className="relative">
          {/* Blurred Content */}
          <div className="blur-sm select-none pointer-events-none">
            {/* Detailed GBP Analysis */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">
                Detailed GBP Analysis
              </h3>
              <div className="space-y-6">
                {gbpData.pillars.map((pillar, idx) => (
                  <div
                    key={idx}
                    className="border-b border-gray-100 pb-6 last:border-0"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-gray-900">
                        {pillar.category}
                      </h4>
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                        {pillar.score}%
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">
                      {pillar.key_finding}
                    </p>
                    <div className="bg-brand-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-brand-600" />
                        <span className="text-sm font-bold text-brand-800">
                          Recommendation
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {pillar.executive_recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Website Analysis */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">
                Detailed Website Analysis
              </h3>
              <div className="space-y-6">
                {websiteData.pillars.map((pillar, idx) => (
                  <div
                    key={idx}
                    className="border-b border-gray-100 pb-6 last:border-0"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-gray-900">
                        {pillar.category}
                      </h4>
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                        {pillar.score}%
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      {pillar.key_finding}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6">
                30-Day Action Plan
              </h3>
              <div className="space-y-4">
                {[
                  "Implement review generation campaign to close the gap",
                  "Optimize GBP posts for weekend availability keywords",
                  "Add 5 new high-quality photos monthly",
                  "Set up automated review response system",
                  "Create location-specific landing pages",
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Paywall Overlay - Simplified Dark Card with Single CTA */}
          <div className="absolute inset-0 flex items-start justify-center pt-16 bg-gradient-to-b from-transparent via-white/90 to-white">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.8,
                type: "spring",
                stiffness: 100,
              }}
              className="bg-gray-900 text-white p-5 md:p-6 rounded-2xl shadow-2xl text-center max-w-sm mx-4 relative overflow-hidden"
            >
              {/* Animated background glow */}
              <motion.div
                className="absolute -inset-1 bg-brand-500/20 blur-xl"
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              <div className="relative z-10">
                <motion.div
                  className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center mx-auto mb-3"
                  animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Lock className="w-5 h-5 text-white" />
                </motion.div>
                <h2 className="text-lg font-bold mb-1">
                  Unlock Your Complete Alloro Growth Plan
                </h2>
                <p className="text-gray-400 mb-4 text-xs leading-relaxed">
                  Get AI-powered recommendations, your personalized 30-day
                  action plan, and strategies to close the {reviewGap} review
                  gap.
                </p>
                <motion.button
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-lg text-sm flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Phone className="w-4 h-4" />
                  Book Strategy Call
                </motion.button>
                <p className="text-[10px] text-gray-500 mt-3">
                  100% Free • No Credit Card Required
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

const App = () => {
  const [stage, setStage] = useState<AuditStage>("input");
  const [selectedGBP, setSelectedGBP] = useState<SelectedGBP | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [gbpCarouselComplete, setGbpCarouselComplete] = useState(false);
  const [pendingStage, setPendingStage] = useState<AuditStage | null>(null);

  // Use the polling hook
  const {
    data: auditData,
    error: auditError,
    isPolling,
    derivedStage,
    progress,
  } = useAuditPolling(auditId);

  // Handle GBP carousel completion - just set the flag, the useEffect will handle the transition
  const handleGbpCarouselComplete = () => {
    console.log(
      "handleGbpCarouselComplete called, pendingStage:",
      pendingStage
    );
    setGbpCarouselComplete(true);
  };

  // Sync derived stage from polling to UI stage
  // If we're on GBP stage and carousel hasn't completed, queue the transition
  useEffect(() => {
    console.log("Stage sync effect:", {
      auditId,
      derivedStage,
      stage,
      gbpCarouselComplete,
      pendingStage,
    });

    if (!auditId || derivedStage === "input") {
      return;
    }

    // If we're on GBP stage and trying to move forward but carousel isn't done
    if (
      stage === "analyzing_gbp" &&
      derivedStage !== "analyzing_gbp" &&
      !gbpCarouselComplete
    ) {
      console.log("Queueing stage transition:", derivedStage);
      setPendingStage(derivedStage);
    } else if (derivedStage !== stage) {
      // Only update if stage actually changed
      console.log("Setting stage to:", derivedStage);
      setStage(derivedStage);
      // Reset carousel state when entering GBP stage
      if (derivedStage === "analyzing_gbp") {
        setGbpCarouselComplete(false);
        setPendingStage(null);
      }
    }
  }, [derivedStage, auditId, stage, gbpCarouselComplete, pendingStage]);

  // Handle transition when carousel completes and there's a pending stage
  useEffect(() => {
    if (
      gbpCarouselComplete &&
      pendingStage &&
      pendingStage !== "analyzing_gbp"
    ) {
      console.log(
        "Carousel complete, transitioning to pending stage:",
        pendingStage
      );
      setStage(pendingStage);
      setPendingStage(null);
    }
  }, [gbpCarouselComplete, pendingStage]);

  // Handle GBP selection
  const handleSelectGBP = (gbp: SelectedGBP) => {
    setSelectedGBP(gbp);
    console.log("Selected GBP:", gbp);
    console.log("Display String:", gbp.displayString);
    console.log("Domain:", gbp.domain);
  };

  // Clear GBP selection
  const handleClearGBP = () => {
    setSelectedGBP(null);
  };

  // Start audit - creates DB record and triggers n8n via backend
  const startAudit = async (gbp: SelectedGBP) => {
    console.log("Starting audit for:", {
      practiceSearchString: gbp.practiceSearchString,
      domain: gbp.websiteUri,
      placeId: gbp.placeId,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/audit/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: gbp.websiteUri || `https://${gbp.domain}`,
          practice_search_string: gbp.practiceSearchString,
        }),
      });

      const result: StartAuditResponse = await response.json();

      if (result.success) {
        console.log("Audit started successfully:", result.audit_id);
        setAuditId(result.audit_id);
        setStage("scanning_website");
        // Polling will start automatically via useAuditPolling hook
      } else {
        console.error("Failed to start audit:", result.error);
      }
    } catch (error) {
      console.error("Audit start error:", error);
    }
  };

  // Use real data when available, fall back to mocks for graceful degradation
  // Memoize to prevent unnecessary re-renders of child components
  const screenshotDesktop = useMemo(
    () => auditData?.screenshots?.desktop_url || MOCK_SCREENSHOT_DESKTOP,
    [auditData?.screenshots?.desktop_url]
  );
  const screenshotMobile = useMemo(
    () => auditData?.screenshots?.mobile_url || MOCK_SCREENSHOT_MOBILE,
    [auditData?.screenshots?.mobile_url]
  );
  const businessData = useMemo(
    () => auditData?.self_gbp || MOCK_BUSINESS,
    [auditData?.self_gbp]
  );
  const competitorData = useMemo(
    () => auditData?.competitors || MOCK_COMPETITORS,
    [auditData?.competitors]
  );
  const websiteAnalysis = useMemo(
    () => auditData?.website_analysis || MOCK_WEBSITE_ANALYSIS,
    [auditData?.website_analysis]
  );
  const gbpAnalysis = useMemo(
    () => auditData?.gbp_analysis || MOCK_GBP_ANALYSIS,
    [auditData?.gbp_analysis]
  );

  return (
    <div className="flex h-screen bg-white font-sans text-slate-900 overflow-hidden selection:bg-brand-100 selection:text-brand-900">
      {/* Sidebar - Visible on Desktop */}
      <AnimatePresence>
        {stage !== "input" && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="h-full z-30"
          >
            <Sidebar stage={stage} progress={progress} setStage={setStage} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 relative h-full overflow-hidden bg-slate-50">
        <AnimatePresence mode="wait">
          {stage === "input" && (
            <motion.div
              key="input"
              className="h-full"
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <InputStage
                onSearch={startAudit}
                selectedGBP={selectedGBP}
                onSelectGBP={handleSelectGBP}
                onClearGBP={handleClearGBP}
              />
            </motion.div>
          )}

          {stage === "scanning_website" && (
            <motion.div
              key="scan"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <WebsiteScanStage
                desktopScreenshot={auditData?.screenshots?.desktop_url}
                mobileScreenshot={auditData?.screenshots?.mobile_url}
                domain={selectedGBP?.domain}
              />
            </motion.div>
          )}

          {stage === "analyzing_gbp" && (
            <motion.div
              key="gbp"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GBPAnalysisStage
                data={auditData?.self_gbp || null}
                isLoading={!auditData?.self_gbp}
                onCarouselComplete={handleGbpCarouselComplete}
              />
            </motion.div>
          )}

          {stage === "competitor_map" && (
            <motion.div
              key="map"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CompetitorMapStage
                self={businessData}
                competitors={auditData?.competitors || []}
                isLoading={!auditData?.competitors}
              />
            </motion.div>
          )}

          {stage === "dashboard" && (
            <motion.div
              key="dash"
              className="h-full"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <DashboardStage
                business={businessData}
                websiteData={websiteAnalysis}
                gbpData={gbpAnalysis}
                screenshotUrl={screenshotDesktop}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
