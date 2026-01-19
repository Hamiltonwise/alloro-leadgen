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
} from "lucide-react";
import { CircularProgress, HorizontalProgressBar, GradeBadge } from "../ui";
import { ActionItemsModal } from "../modals";
import { EmailPaywallOverlay } from "../EmailPaywallOverlay";
import { cardVariants } from "../../lib/animations/variants";
import { parseScoreValue } from "../../lib/helpers/scoreUtils";
import { sendAuditReportEmail } from "../../../utils/emailService";
import {
  MOCK_BUSINESS,
  MOCK_COMPETITORS,
  MOCK_SCREENSHOT_DESKTOP,
  MOCK_SCREENSHOT_MOBILE,
} from "../../constants";
import { WebsiteAnalysis, GBPAnalysis, BusinessProfile, Competitor } from "../../types";

/**
 * Dashboard Stage - Final results and analysis display
 * Shows overall grades, performance metrics, and detailed analysis
 * Largest and most complex stage component (~1166 lines)
 */
export const DashboardStage = ({
  business,
  websiteData,
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
  websiteData: WebsiteAnalysis;
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

    // Mark email as submitted - parent component will handle this via callback
    onEmailSubmitted();

    // Update URL with audit_id for persistence
    const url = new URL(window.location.href);
    url.searchParams.set("audit_id", auditId);
    window.history.pushState({}, "", url.toString());
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-100 scroll-smooth">
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
          <motion.a
            href="https://calendar.app.google/yJsmRsEnBSfDTVyz8"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-brand-600 hover:bg-gray-100 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Phone className="w-4 h-4" />
            Schedule Strategy Call
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

        <span id="scroll-rank"></span>
        {/* Email Paywall Wrapper - Content below 3-column cards */}
        <div className="relative">
          {/* Content to be blurred when email not submitted */}
          <div
            className={
              emailSubmitted ? "" : "blur-md select-none pointer-events-none"
            }
          >
            {/* Local Ranking Insights Card - Orange Gradient with White Content */}
            {gbpData.competitor_analysis && (
              <motion.div
                className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl shadow-lg p-6 md:p-8 mb-8 overflow-hidden relative"
                custom={4}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
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
                    {gbpData.competitor_analysis.key_findings}
                  </p>
                </motion.div>

                {/* Top Action Items - White Cards */}
                <div className="relative z-10">
                  <span className="text-xs font-bold text-white/90 uppercase tracking-wider mb-3 block">
                    Top Recommendations
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {gbpData.competitor_analysis.top_action_items.map(
                      (item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 + idx * 0.1, duration: 0.4 }}
                          className="bg-white rounded-xl p-4 shadow-md hover:shadow-xl transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center">
                              <span className="text-xs font-bold text-white">
                                {idx + 1}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed text-gray-700 pt-0.5">
                              {item}
                            </p>
                          </div>
                        </motion.div>
                      ),
                    )}
                  </div>
                </div>
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
                  className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-md"
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
                      />
                    </div>
                  ))}
              </div>
            </motion.div>
            {/* Website Performance Metrics - Horizontal Progress Bars */}
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
                  className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-md"
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
                      Get help from Alloro team
                    </h2>
                    <p className="text-gray-400 mb-4 text-xs leading-relaxed">
                      Unlock full detailed analysis & personalized growth plan
                      by booking a free strategy call with our experts.
                    </p>
                    <motion.a
                      href="https://calendar.app.google/yJsmRsEnBSfDTVyz8"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-lg text-sm flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Phone className="w-4 h-4" />
                      Book Strategy Call
                    </motion.a>
                    <p className="text-[10px] text-gray-500 mt-3">
                      100% Free • No Credit Card Required
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Email Paywall Overlay - Only shown when email not submitted */}
          {!emailSubmitted && (
            <div className="absolute inset-0 z-50 flex items-start justify-center pt-32 bg-white/80 backdrop-blur-md rounded-3xl">
              <EmailPaywallOverlay onEmailSubmit={handleEmailSubmit} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

DashboardStage.displayName = "DashboardStage";
