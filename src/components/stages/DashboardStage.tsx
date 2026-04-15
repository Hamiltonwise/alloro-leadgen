import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Calendar,
  UserPlus,
} from "lucide-react";
import {
  CircularProgress,
  HorizontalProgressBar,
  GradeBadge,
  WhyThisMattersTooltip,
} from "../ui";
import { ActionItemsModal } from "../modals";
import { EmailPaywallOverlay } from "../EmailPaywallOverlay";
import { cardVariants } from "../../lib/animations/variants";
import { parseScoreValue } from "../../lib/helpers/scoreUtils";
import { WHY_THIS_MATTERS } from "../../lib/constants/whyThisMatters";
import { sendAuditReportEmail } from "../../../utils/emailService";
import {
  MOCK_BUSINESS,
  MOCK_COMPETITORS,
  MOCK_SCREENSHOT_DESKTOP,
  MOCK_SCREENSHOT_MOBILE,
} from "../../../utils/constants";
import {
  WebsiteAnalysis,
  GBPAnalysis,
  BusinessProfile,
  Competitor,
} from "../../types";
import { trackEvent, setCurrentStage, getSessionId } from "../../lib/tracking";

/**
 * Append `?ls={sessionId}` to a signup URL, preserving any existing query
 * params. Resolved at click-time so the tracking session id is always current.
 */
function buildSignupHref(base: string): string {
  const id = getSessionId();
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}ls=${encodeURIComponent(id)}`;
}

/**
 * Fire tracking + rewrite href to include `?ls={sessionId}` just before the
 * browser follows the link. Safe for `<a target="_blank">` because assigning
 * `e.currentTarget.href` runs synchronously before navigation.
 */
function handleSignupClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  stage: string,
): void {
  trackEvent("cta_clicked_create_account", { event_data: { stage } });
  e.currentTarget.href = buildSignupHref("https://app.getalloro.com/signup");
}

/**
 * Dashboard Stage - Final results and analysis display
 * Shows overall grades, performance metrics, and detailed analysis
 * Largest and most complex stage component (~1166 lines)
 */
export const DashboardStage = ({
  business,
  websiteData,
  hasWebsiteData = true,
  gbpData,
  screenshotUrl,
  auditId,
  emailSubmitted,
  onEmailSubmitted,
  modalOpen,
  setModalOpen,
  selectedPillarCategory,
  setSelectedPillarCategory,
  selectedDataType,
  setSelectedDataType,
}: {
  business: BusinessProfile;
  websiteData: WebsiteAnalysis | null;
  hasWebsiteData?: boolean;
  gbpData: GBPAnalysis;
  screenshotUrl?: string;
  auditId?: string | null;
  emailSubmitted: boolean;
  onEmailSubmitted: () => void;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  selectedPillarCategory: string | null;
  setSelectedPillarCategory: (category: string | null) => void;
  selectedDataType: "website" | "gbp" | null;
  setSelectedDataType: (type: "website" | "gbp" | null) => void;
}) => {
  // Find the competitor with most reviews for comparison
  const topCompetitor = MOCK_COMPETITORS.reduce(
    (max, comp) => (comp.reviewsCount > max.reviewsCount ? comp : max),
    MOCK_COMPETITORS[0],
  );

  const reviewGap = topCompetitor.reviewsCount - business.reviewsCount;

  // Fire stage_viewed_5 + results_viewed once on mount (dashboard is final results screen).
  // Also schedule a "report_engaged_1min" event after 60s of dwell time — strong
  // signal that the user actually consumed the report rather than bouncing.
  useEffect(() => {
    setCurrentStage("stage_viewed_5");
    trackEvent("stage_viewed_5");
    setCurrentStage("results_viewed");
    trackEvent("results_viewed");

    const engagedTimer = window.setTimeout(() => {
      setCurrentStage("report_engaged_1min");
      trackEvent("report_engaged_1min");
    }, 60_000);

    return () => {
      window.clearTimeout(engagedTimer);
    };
  }, []);

  // Handle email submission
  const handleEmailSubmit = async (email: string) => {
    if (!auditId) {
      throw new Error("Audit ID not available");
    }

    await sendAuditReportEmail({
      recipientEmail: email,
      auditId: auditId,
      businessName: business.title,
    });

    // Mark email as submitted - parent component (App.tsx) handles URL update via callback
    onEmailSubmitted();
  };

  return (
    <div className="h-full overflow-y-auto bg-beige scroll-smooth">
      {/* Action Items Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ActionItemsModal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setSelectedPillarCategory(null);
              setSelectedDataType(null);
            }}
            pillarCategory={selectedPillarCategory}
            dataType={selectedDataType}
            websiteData={websiteData}
            gbpData={gbpData}
            competitorAnalysis={gbpData.competitor_analysis}
          />
        )}
      </AnimatePresence>

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
              className="w-12 h-12 shrink-0 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className="w-6 h-6 text-white" />
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
          <motion.a
            href="https://app.getalloro.com/signup"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => handleSignupClick(e, "dashboard_header")}
            className="bg-white text-brand-600 hover:bg-gray-100 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <UserPlus className="w-4 h-4" />
            Create Your Free Account
            <ArrowRight className="w-4 h-4" />
          </motion.a>
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

          <div className="flex flex-col lg:flex-row gap-4 md:gap-8 relative z-10">
            {/* Screenshot Preview — replaced with greyed icon if no website */}
            <motion.div
              className="lg:w-1/3"
              initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.7, delay: 0.3, type: "spring" }}
            >
              {hasWebsiteData && screenshotUrl ? (
                <div className="rounded-xl overflow-hidden shadow-xl border border-gray-200 aspect-video relative group">
                  <img
                    src={screenshotUrl}
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
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 aspect-video flex flex-col items-center justify-center bg-gray-50">
                  <Globe className="w-10 h-10 text-gray-300 mb-2" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    No website
                  </span>
                </div>
              )}
            </motion.div>

            {/* Report Info */}
            <motion.div
              className="lg:w-2/3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4, type: "spring" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <img
                  src="/logo.png"
                  alt="Alloro"
                  className="w-5 h-5 object-contain"
                />
                <motion.span
                  className="text-[11px] font-bold text-brand-500 uppercase tracking-wider"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  Alloro Practice Intelligence Report
                </motion.span>
              </div>
              <motion.h2
                className="font-heading text-2xl md:text-[2.25rem] font-bold text-gray-900 mb-4 tracking-tight truncate max-w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                title={business.title}
              >
                {business.title}
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
                    className="flex items-center gap-2 min-w-0"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + idx * 0.1 }}
                  >
                    <span className="font-medium text-gray-500 shrink-0">
                      {item.label}
                    </span>
                    <span
                      className="flex items-center gap-1 min-w-0"
                      title={typeof item.value === "string" ? item.value : undefined}
                    >
                      {item.icon && (
                        <item.icon className="w-4 h-4 text-brand-500 shrink-0" />
                      )}
                      <span className="truncate">{item.value}</span>
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Overall Grades Section - Enhanced with Animated Circular Progress - 3 Column */}
        <div
          id="scroll-overall"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8"
        >
          {/* Website Grade */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 overflow-hidden relative"
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{
              scale: 1.02,
              boxShadow: "0 20px 50px rgba(59,130,246,0.15)",
              transition: { duration: 0.3 },
            }}
          >
            {/* Why This Matters Tooltip */}
            <div className="absolute top-4 right-4 z-20">
              <WhyThisMattersTooltip
                description={WHY_THIS_MATTERS["Website Performance Grade"]}
                variant="icon"
              />
            </div>
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
              <h3 className="text-sm font-bold text-gray-700">
                Website Performance Grade
              </h3>
            </div>
            <div className="flex items-center gap-6 relative z-10">
              {hasWebsiteData && websiteData ? (
                <>
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
                  <div className="flex-1 flex items-center justify-center">
                    <CircularProgress
                      score={Math.round(websiteData.overall_score)}
                      label="Overall Score"
                      size={100}
                      strokeWidth={8}
                      delay={0.7}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center py-2 opacity-60 grayscale">
                  <div className="text-center">
                    <div className="text-3xl font-black text-gray-400 mb-1">—</div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      No website analyzed
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* GBP Grade */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 overflow-hidden relative"
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{
              scale: 1.02,
              boxShadow: "0 20px 50px rgba(214,104,83,0.15)",
              transition: { duration: 0.3 },
            }}
          >
            {/* Why This Matters Tooltip */}
            <div className="absolute top-4 right-4 z-20">
              <WhyThisMattersTooltip
                description={WHY_THIS_MATTERS["Google Business Profile Grade"]}
                variant="icon"
              />
            </div>
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
              <h3 className="text-sm font-bold text-gray-700">
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
              <div className="flex-1 flex items-center justify-center">
                <CircularProgress
                  score={parseScoreValue(gbpData.gbp_readiness_score)}
                  label="Readiness Score"
                  size={100}
                  strokeWidth={8}
                  delay={0.6}
                />
              </div>
            </div>
          </motion.div>

          {/* Local Ranking Grade */}
          {gbpData.competitor_analysis && (
            <motion.div
              className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 overflow-hidden relative"
              custom={3}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{
                scale: 1.02,
                boxShadow: "0 20px 50px rgba(214,104,83,0.15)",
                transition: { duration: 0.3 },
              }}
            >
              {/* Why This Matters Tooltip */}
              <div className="absolute top-4 right-4 z-20">
                <WhyThisMattersTooltip
                  description={WHY_THIS_MATTERS["Local Ranking"]}
                  variant="icon"
                />
              </div>
              {/* Animated gradient background - Orange */}
              <motion.div
                className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-brand-200 to-brand-100 rounded-full opacity-50"
                animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                transition={{ duration: 8, repeat: Infinity, delay: 1 }}
              />
              <motion.div
                className="absolute -bottom-10 -left-10 w-24 h-24 bg-brand-100 rounded-full opacity-30"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 5, repeat: Infinity, delay: 2 }}
              />
              <div className="flex items-center gap-2 mb-6 relative z-10">
                <motion.div
                  className="p-2 bg-brand-100 rounded-lg"
                  whileHover={{ rotate: 10 }}
                >
                  <TrendingUp className="w-5 h-5 text-brand-500" />
                </motion.div>
                <h3 className="text-sm font-bold text-gray-700">
                  Local Ranking
                </h3>
              </div>
              <div className="flex items-center gap-6 relative z-10">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    duration: 1,
                    delay: 0.7,
                    type: "spring",
                    stiffness: 80,
                  }}
                >
                  <GradeBadge grade={gbpData.competitor_analysis.rank_grade} />
                </motion.div>
                <div className="flex-1 flex items-center justify-center">
                  <CircularProgress
                    score={parseScoreValue(
                      gbpData.competitor_analysis.rank_score,
                    )}
                    label="Rank Score"
                    size={100}
                    strokeWidth={8}
                    delay={0.8}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* CTA Section - Alloro Orange with Gradient */}
        <motion.div
          className="relative overflow-hidden rounded-2xl mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            background:
              "linear-gradient(135deg, #d66853 0%, #bf4b36 50%, #d66853 100%)",
          }}
        >
          {/* Animated background pattern */}
          <motion.div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
            animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />
          {/* Floating circles */}
          <motion.div
            className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
            animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-10 -right-10 w-52 h-52 bg-white/10 rounded-full blur-2xl"
            animate={{ scale: [1, 1.3, 1], x: [0, -20, 0] }}
            transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          />

          <div className="relative z-10 p-8 md:p-12 text-center">
            {(() => {
              const candidateGrades = [
                hasWebsiteData && websiteData ? websiteData.overall_grade : null,
                gbpData?.gbp_grade,
                gbpData?.competitor_analysis?.rank_grade,
              ]
                .filter((g): g is string => typeof g === "string" && g.length > 0)
                .map((g) => g.charAt(0).toUpperCase());
              const isOutranked = candidateGrades.some(
                (g) => g === "D" || g === "F"
              );
              return (
                <>
                  <p className="text-white/90 flex gap-3 items-center justify-center text-sm font-bold md:text-base max-w-2xl mx-auto mb-6">
                    Alloro Verdict{" "}
                    <span className="h-[.5px] w-[20px] bg-white/50 inline-block"></span>
                    <span
                      className={`text-xs px-5 py-1.5 rounded-full ${
                        isOutranked
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {isOutranked ? "Outranked" : "Good"}
                    </span>
                  </p>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    {!isOutranked && (
                      <>
                        But good enough isn't winning. <br />
                      </>
                    )}
                    Your practice has more potential.
                  </h3>
                  <p className="text-white/90 text-sm md:text-base max-w-2xl mx-auto mb-6">
                    {isOutranked ? (
                      <>
                        Your scores show bad foundations, and competitors with
                        stronger execution are capturing the patients you're
                        missing. Alloro helps you close those gaps and
                        outperform the average practice in your area.
                      </>
                    ) : (
                      <>
                        Your scores show a solid foundation, but competitors
                        with stronger execution are capturing the patients
                        you're missing. Alloro helps you close those gaps and
                        outperform the average practice in your area.
                      </>
                    )}
                  </p>
                </>
              );
            })()}

            <motion.a
              href="https://app.getalloro.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleSignupClick(e, "dashboard_overall_cta")}
              className="inline-flex items-center gap-2 bg-white text-brand-600 hover:bg-gray-100 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-lg"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <UserPlus className="w-5 h-5" />
              Create Your Free Account
              <ArrowRight className="w-5 h-5" />
            </motion.a>

            <p className="text-white/70 text-xs mt-4">
              Free Consultation • No obligation • Clear next steps
            </p>
          </div>
        </motion.div>

        <span id="scroll-rank"></span>
        {/* Email Paywall Wrapper - Content below 3-column cards */}
        <div className="relative">
          {/* Content to be blurred when email not submitted */}
          <div
            className={
              emailSubmitted ? "" : "blur-md select-none pointer-events-none"
            }
          >
            {/* Local Ranking Insights Card - Cobalt Blue with Orange Accent */}
            {gbpData.top_action_items && (
              <motion.div
                className="bg-slate-900 rounded-2xl shadow-lg p-6 md:p-8 mb-8 overflow-hidden relative"
                custom={4}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Orange accent contour - top right */}
                <div className="absolute -top-10 -right-10 w-52 h-52 bg-brand-500 rounded-full opacity-40 blur-2xl pointer-events-none"></div>
                <div className="flex items-start gap-4 mb-6 relative z-10">
                  <motion.div
                    className="p-3 bg-white/20 backdrop-blur-sm rounded-xl"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Users className="w-6 h-6 text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">
                      Local Ranking Insights
                    </h3>
                    <p className="text-sm text-white/80 mt-0.5">
                      How you are performing against your competitors
                    </p>
                  </div>
                </div>

                {/* Key Findings - White text */}
                <motion.div
                  className="mb-6 relative z-10"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  <p className="text-md leading-relaxed text-white">
                    {gbpData.competitor_analysis.key_findings}{" "}
                    <span className="text-brand-400">
                      Beat the average and stay ahead of competitors. Alloro
                      helps you implement and track what matters.
                    </span>
                  </p>
                </motion.div>

                {/* Top Action Items - White Cards */}
                <div className="relative z-10">
                  <span className="text-xs font-bold text-white/90 uppercase tracking-wider mb-3 block">
                    Top Recommendations
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {gbpData.top_action_items.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + idx * 0.1, duration: 0.4 }}
                        className="bg-white rounded-xl p-4 shadow-md hover:shadow-xl transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {idx + 1}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-gray-800 pt-0.5">
                            {item}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-[0.5px] bg-white/20 my-6 relative z-10" />

                {/* CTA Section */}
                <motion.div
                  className="text-right relative z-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.4 }}
                >
                  <p className="text-white text-sm mb-3">
                    Start Outranking Competitors
                  </p>
                  <motion.a
                    href="https://app.getalloro.com/signup"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => handleSignupClick(e, "dashboard_rank_cta")}
                    className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-lg"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <UserPlus className="w-5 h-5" />
                    Create Your Free Account
                    <ArrowRight className="w-5 h-5" />
                  </motion.a>
                </motion.div>
              </motion.div>
            )}
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

              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="p-2.5 bg-brand-100 rounded-xl"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <MapPin className="w-5 h-5 text-brand-500" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Google Business Profile Analysis
                  </h3>
                </div>
                <motion.button
                  onClick={() => {
                    setSelectedPillarCategory(null);
                    setSelectedDataType("gbp");
                    setModalOpen(true);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  See Key Insights
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-1 relative z-10">
                {[...gbpData.pillars]
                  .sort((a, b) => Number(a.score) - Number(b.score))
                  .map((pillar, idx) => (
                    <div key={idx}>
                      <HorizontalProgressBar
                        score={Number(pillar.score)}
                        label={pillar.category}
                        actionItems={pillar.action_items || []}
                        onViewMore={() => {
                          setSelectedPillarCategory(pillar.category);
                          setSelectedDataType("gbp");
                          setModalOpen(true);
                        }}
                        delay={0.6 + idx * 0.12}
                        whyThisMatters={WHY_THIS_MATTERS[pillar.category]}
                      />
                    </div>
                  ))}
              </div>

              {/* Divider */}
              <div className="h-[0.5px] bg-gray-200 my-6 relative z-10" />

              {/* CTA Section */}
              <motion.div
                className="text-right relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.4 }}
              >
                <p className="text-gray-600 text-sm mb-3">
                  Optimize Your Google Business Profile
                </p>
                <motion.a
                  href="https://app.getalloro.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleSignupClick(e, "dashboard_gbp_cta")}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-lg"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <UserPlus className="w-5 h-5" />
                  Create Your Free Account
                  <ArrowRight className="w-5 h-5" />
                </motion.a>
              </motion.div>
            </motion.div>
            {/* Website Performance Metrics — only when a website was analyzed.
                When the user opted "no website yet" we show a minimal
                placeholder card with a CTA to create an account + website. */}
            {!hasWebsiteData && (
              <motion.div
                className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-300 p-6 md:p-8 mb-8 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg md:text-xl font-bold text-gray-700 mb-2">
                  No Website Yet?
                </h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
                  Create your free Alloro account and we'll help you launch
                  a high-performing website built for your practice.
                </p>
                <motion.a
                  href="https://app.getalloro.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) =>
                    handleSignupClick(e, "dashboard_no_website_cta")
                  }
                  className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <UserPlus className="w-4 h-4" />
                  Create Free Account &amp; Build Your Website
                  <ArrowRight className="w-4 h-4" />
                </motion.a>
              </motion.div>
            )}
            {hasWebsiteData && (
            <motion.div
              className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 mb-8 overflow-hidden relative pt-10"
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

              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
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
                <motion.button
                  onClick={() => {
                    setSelectedPillarCategory(null);
                    setSelectedDataType("website");
                    setModalOpen(true);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  See Key Insights
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-1 relative z-10">
                {[...websiteData.pillars]
                  .sort((a, b) => Number(a.score) - Number(b.score))
                  .map((pillar, idx) => (
                    <div key={idx}>
                      <HorizontalProgressBar
                        score={Number(pillar.score)}
                        label={pillar.category}
                        actionItems={pillar.action_items || []}
                        onViewMore={() => {
                          setSelectedPillarCategory(pillar.category);
                          setSelectedDataType("website");
                          setModalOpen(true);
                        }}
                        delay={0.7 + idx * 0.12}
                        whyThisMatters={WHY_THIS_MATTERS[pillar.category]}
                      />
                    </div>
                  ))}
              </div>

              {/* Divider */}
              <div className="h-[0.5px] bg-gray-200 my-6 relative z-10" />

              {/* CTA Section */}
              <motion.div
                className="text-right relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.4 }}
              >
                <p className="text-gray-600 text-sm mb-3">
                  Improve Your Website Performance
                </p>
                <motion.a
                  href="https://app.getalloro.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleSignupClick(e, "dashboard_website_cta")}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-lg"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <UserPlus className="w-5 h-5" />
                  Create Your Free Account
                  <ArrowRight className="w-5 h-5" />
                </motion.a>
              </motion.div>
            </motion.div>
            )}

            {/* Blurred Reconstructed Alloro Dashboard - Paywall */}
            <div className="relative">
              {/* Blurred Content — static mockup matching the real Alloro
                  client dashboard (DashboardOverview.tsx) layout, colors,
                  and typography. Scaled down to fit this card. */}
              {/*
                Outer `overflow-hidden` clips the blur halo so the dark
                sidebar's color can't bleed past the mockup's rounded edges
                onto the beige surround. Scale-[0.97] adds a subtle inset so
                the clip feels intentional rather than flush.
              */}
              <div className="blur-[2px] select-none pointer-events-none rounded-3xl overflow-hidden scale-[0.97] origin-top">
                {/* App shell — matches the real Alloro app: dark navy sidebar
                    + beige main content with the Practice Hub layout. */}
                <div className="rounded-3xl border border-black/10 overflow-hidden mb-6 flex bg-beige">
                  {/* Sidebar — dark navy like the real app */}
                  <div className="hidden md:flex w-48 shrink-0 flex-col bg-[#1a2433] text-white p-3 gap-1">
                    {/* Brand */}
                    <div className="flex items-center justify-between px-2 pt-1 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-brand-500" />
                        <div>
                          <div className="font-heading text-sm font-bold text-white leading-none">
                            Alloro
                          </div>
                          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">
                            Intelligence
                          </div>
                        </div>
                      </div>
                      <div className="w-4 h-4 rounded bg-white/10" />
                    </div>

                    {/* NAVIGATION section */}
                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 px-2 mb-1 mt-2">
                      Navigation
                    </div>
                    {[
                      { label: "Practice Hub", active: true },
                      { label: "Referrals Hub" },
                      { label: "Local Rankings" },
                      { label: "Websites" },
                    ].map((n, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${
                          n.active
                            ? "bg-brand-500/20 text-brand-300"
                            : "text-white/60"
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-sm ${
                            n.active ? "bg-brand-400" : "bg-white/20"
                          }`}
                        />
                        <span className="text-[10px] font-semibold">
                          {n.label}
                        </span>
                      </div>
                    ))}

                    {/* DISCOVERY section */}
                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 px-2 mb-1 mt-3">
                      Discovery
                    </div>
                    {[
                      { label: "To-Do List" },
                      { label: "Notifications" },
                    ].map((n, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-white/60"
                      >
                        <div className="w-3 h-3 rounded-sm bg-white/20" />
                        <span className="text-[10px] font-semibold">
                          {n.label}
                        </span>
                      </div>
                    ))}

                    {/* LOCATION section */}
                    <div className="mt-auto pt-3">
                      <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 px-2 mb-1">
                        Location
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/5 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-400" />
                        <span className="text-[10px] font-semibold text-white">
                          Gainesville
                        </span>
                        <div className="ml-auto w-2 h-2 rounded bg-white/30" />
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
                        <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-brand-400" />
                        </div>
                        <span className="text-[10px] text-white/70">
                          One Endodontics
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Main content — beige */}
                  <div className="flex-1 bg-beige min-w-0 flex flex-col">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-5 md:px-6 py-3 border-b border-black/5">
                      <div className="flex items-center gap-2">
                        {/* Mobile: hamburger + logo + bell */}
                        <div className="md:hidden flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <div className="w-4 h-0.5 bg-gray-700" />
                            <div className="w-4 h-0.5 bg-gray-700" />
                            <div className="w-4 h-0.5 bg-gray-700" />
                          </div>
                          <div className="w-6 h-6 rounded-md bg-brand-500" />
                        </div>
                        <div className="hidden md:block">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                            Practice Hub
                          </div>
                          <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-gray-400 mt-0.5">
                            Visioning of your practice
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="md:hidden w-4 h-4 rounded-full border border-gray-400" />
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="hidden md:inline text-[9px] font-bold uppercase tracking-wider text-green-600">
                            Live Updates On
                          </span>
                          <span className="md:hidden text-[10px] font-bold text-green-600">
                            ON
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 md:p-6">
                      {/* Tag row */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-500">
                          · Latest Update · Apr 15
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] px-2.5 py-1 rounded-full bg-green-500/10 text-green-600">
                          · Growth Looks Good
                        </span>
                      </div>

                      {/* Greeting */}
                      <h3 className="font-heading text-2xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2">
                        Good Morning, Saif.
                      </h3>
                      <p className="text-xs md:text-sm text-gray-500 mb-5 leading-snug">
                        Welcome to your practice dashboard. We're loading your
                        latest insights.
                      </p>

                      {/* Rankings hero card */}
                      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 mb-5">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-gray-900 text-white">
                              Rankings
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                              Gainesville, VA
                            </span>
                          </div>
                          <p className="font-heading text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                            You're ranked{" "}
                            <span className="text-brand-500">#1 of 3</span>{" "}
                            locally.
                          </p>
                        </div>
                        <div className="md:border-l md:border-black/5 md:pl-5 flex items-center gap-3">
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
                              Visibility Score
                            </div>
                            <div className="text-4xl md:text-5xl font-black font-heading tracking-tighter text-gray-900 leading-none">
                              98
                            </div>
                          </div>
                          <div className="bg-brand-500 text-white text-[10px] font-bold px-3 py-2 rounded-full flex items-center gap-1">
                            See Why →
                          </div>
                        </div>
                      </div>

                      {/* KPI tiles row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        {[
                          { label: "New Patients", val: "142", trend: "+18%" },
                          { label: "Reviews", val: "4.8", trend: "+0.2" },
                          { label: "GBP Views", val: "12.4k", trend: "+24%" },
                          { label: "Call Clicks", val: "847", trend: "+9%" },
                        ].map((k, i) => (
                          <div
                            key={i}
                            className="bg-white rounded-2xl border border-black/5 shadow-sm p-4"
                          >
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">
                              {k.label}
                            </div>
                            <div className="flex items-baseline justify-between">
                              <span className="font-heading text-2xl md:text-3xl font-black tracking-tighter text-gray-900 leading-none">
                                {k.val}
                              </span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-green-100 text-green-700">
                                {k.trend}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Chart + Sparkline row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                        {/* Bar chart — Patient Acquisition */}
                        <div className="md:col-span-2 bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                                Patient Acquisition
                              </div>
                              <div className="font-heading text-base font-bold text-gray-900 mt-0.5">
                                Trending up · 12 weeks
                              </div>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-green-100 text-green-700">
                              +32%
                            </span>
                          </div>
                          <div className="h-24 flex items-end justify-between gap-1.5">
                            {[38, 52, 44, 60, 58, 72, 68, 80, 76, 88, 94, 102].map(
                              (h, i) => (
                                <div
                                  key={i}
                                  className="flex-1 bg-gradient-to-t from-brand-500 to-brand-300 rounded-sm"
                                  style={{ height: `${h}%` }}
                                />
                              )
                            )}
                          </div>
                          <div className="flex justify-between text-[8px] text-gray-400 font-semibold uppercase tracking-wider mt-2">
                            <span>W1</span>
                            <span>W4</span>
                            <span>W8</span>
                            <span>W12</span>
                          </div>
                        </div>

                        {/* Donut — Review Sentiment */}
                        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">
                            Sentiment
                          </div>
                          <div className="relative flex items-center justify-center h-24">
                            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                              <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#e5e7eb" strokeWidth="3" />
                              <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#22c55e" strokeWidth="3" strokeDasharray="88, 100" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="font-heading text-2xl font-black tracking-tighter text-gray-900 leading-none">
                                88%
                              </span>
                              <span className="text-[9px] font-semibold text-gray-400 mt-0.5">
                                Positive
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Data table — Top Referral Sources */}
                      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 mb-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                            Top Referral Sources
                          </div>
                          <span className="text-[9px] font-semibold text-gray-400">
                            Last 30 days
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { src: "Google Search", val: 412, pct: 64 },
                            { src: "Direct", val: 182, pct: 28 },
                            { src: "Instagram", val: 74, pct: 12 },
                            { src: "Facebook", val: 38, pct: 6 },
                          ].map((row, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 text-xs"
                            >
                              <span className="w-24 text-gray-700 font-semibold shrink-0">
                                {row.src}
                              </span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand-500 rounded-full"
                                  style={{ width: `${row.pct}%` }}
                                />
                              </div>
                              <span className="w-10 text-right font-black text-gray-900">
                                {row.val}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom row — 2 widgets */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">
                            Competitor Gap
                          </div>
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="font-heading text-3xl font-black tracking-tighter text-gray-900 leading-none">
                              −$24k
                            </span>
                            <span className="text-[10px] font-bold text-red-600">
                              monthly loss
                            </span>
                          </div>
                          <div className="h-12 flex items-end gap-1">
                            {[30, 45, 38, 55, 48, 62, 58, 70, 65, 78, 82, 90].map(
                              (h, i) => (
                                <div
                                  key={i}
                                  className="flex-1 bg-gradient-to-t from-red-500/60 to-red-300/60 rounded-sm"
                                  style={{ height: `${h}%` }}
                                />
                              )
                            )}
                          </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">
                            Appointments Booked
                          </div>
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="font-heading text-3xl font-black tracking-tighter text-gray-900 leading-none">
                              287
                            </span>
                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
                              +14%
                            </span>
                          </div>
                          <svg viewBox="0 0 100 40" className="w-full h-10">
                            <polyline
                              fill="none"
                              stroke="#d66853"
                              strokeWidth="2"
                              points="0,32 10,28 20,30 30,22 40,24 50,16 60,18 70,10 80,12 90,6 100,8"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-6 hidden">
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

                {/* Intentionally: nothing below the app-shell mockup. The
                    old "Detailed Website Analysis" + "30-Day Action Plan"
                    text blocks were replaced by statistical widgets inside
                    the app-shell main column above, which is why the sidebar
                    now fills the full backdrop height. */}
              </div>

              {/* Paywall Overlay — evenly translucent so the sidebar under
                  the backdrop doesn't get a ghost-fade bleed on its right
                  edge. */}
              <div className="absolute inset-0 flex items-start justify-center pt-16 bg-white/70 backdrop-blur-[2px]">
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
                      className="w-11 h-11 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-3"
                      animate={{
                        rotate: [0, -12, 12, -8, 8, -4, 4, 0],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        repeatDelay: 2,
                        ease: "easeInOut",
                      }}
                    >
                      <Lock className="w-5 h-5 text-white" />
                    </motion.div>
                    <h2 className="font-heading text-lg md:text-xl font-semibold mb-4 leading-snug">
                      You're one step away from
                      <br />
                      unlocking more patients.
                    </h2>

                    <ul className="text-left space-y-2 mb-5 max-w-xs mx-auto">
                      {[
                        {
                          icon: Globe,
                          tint: "bg-blue-500/15 text-blue-300",
                          text: "A website built to convert visitors into patients",
                        },
                        {
                          icon: TrendingUp,
                          tint: "bg-green-500/15 text-green-300",
                          text: "Stronger digital presence across Google + maps",
                        },
                        {
                          icon: Calendar,
                          tint: "bg-brand-500/20 text-brand-300",
                          text: "More booked appointments, every month",
                        },
                      ].map((b, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${b.tint}`}
                          >
                            <b.icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs text-gray-100 leading-snug">
                            {b.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <motion.a
                      href="https://app.getalloro.com/signup"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) =>
                        handleSignupClick(e, "dashboard_paywall_cta")
                      }
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-5 rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <UserPlus className="w-4 h-4" />
                      Create Your Free Account
                      <ArrowRight className="w-4 h-4" />
                    </motion.a>
                    <p className="text-[10px] text-gray-500 mt-2.5">
                      100% Free · Easy Onboarding
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Email Paywall Overlay - Only shown when email not submitted */}
          {!emailSubmitted && (
            <div className="absolute inset-0 z-50 flex items-start justify-center pt-32  backdrop-blur-md rounded-3xl">
              <EmailPaywallOverlay onEmailSubmit={handleEmailSubmit} />
            </div>
          )}

          {/* Floating CTA — MOBILE ONLY. Compact full-width bar pinned to
              the viewport edges (left-3/right-3) so it stays clear of the
              ancestor motion.div transforms that would break a centered
              fixed element. Desktop version lives in the Sidebar. */}
          {emailSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="fixed bottom-3 left-3 right-3 z-40 px-4 py-3 rounded-xl md:hidden flex flex-col items-center gap-2"
              style={{
                background: "rgba(255, 255, 255, 0.6)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                border: "1px solid rgba(15, 23, 42, 0.12)",
                boxShadow: "0 8px 28px rgba(0, 0, 0, 0.10)",
              }}
            >
              <p className="text-[13px] font-semibold text-gray-700 leading-snug text-center">
                Knowing isn't enough. Execution matters. Let{" "}
                <span className="text-brand-500">Alloro</span> help.
              </p>
              <a
                href="https://app.getalloro.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) =>
                  handleSignupClick(e, "dashboard_mobile_floating_cta")
                }
                className="block w-full text-center px-4 py-2.5 text-white font-bold rounded-full text-sm"
                style={{
                  backgroundColor: "#d66853",
                  boxShadow: "0 6px 18px rgba(214, 104, 83, 0.4)",
                }}
              >
                Create Your Free Account
              </a>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

DashboardStage.displayName = "DashboardStage";
