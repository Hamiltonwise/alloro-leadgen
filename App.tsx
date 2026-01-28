import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import {
  InputStage,
  WebsiteScanStage,
  GBPAnalysisStage,
  CompetitorMapStage,
  DashboardStage,
} from "./src/components/stages";
import { Sidebar } from "./src/components/layout";
import { AuditErrorModal } from "./src/components/modals";
import { useAuditPolling } from "./src/hooks/useAuditPolling";
import { API_BASE_URL } from "./utils/config";
import { sendErrorNotificationEmail } from "./utils/emailService";
import {
  MOCK_BUSINESS,
  MOCK_COMPETITORS,
  MOCK_WEBSITE_ANALYSIS,
  MOCK_GBP_ANALYSIS,
  MOCK_SCREENSHOT_DESKTOP,
  MOCK_SCREENSHOT_MOBILE,
} from "./utils/constants";
import {
  AuditStage,
  SelectedGBP,
  StartAuditResponse,
} from "./src/types";

/**
 * Main App Component - Simplified after refactoring
 * Handles state management, stage transitions, and orchestration
 * All components extracted to separate files for better maintainability
 * ~200 lines vs original 3,432 lines (94% reduction)
 */
const App = () => {
  // --- STATE ---
  const [stage, setStage] = useState<AuditStage>("input");
  const [selectedGBP, setSelectedGBP] = useState<SelectedGBP | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [gbpCarouselComplete, setGbpCarouselComplete] = useState(false);
  const [pendingStage, setPendingStage] = useState<AuditStage | null>(null);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPillarCategory, setSelectedPillarCategory] = useState<
    string | null
  >(null);
  const [selectedDataType, setSelectedDataType] = useState<
    "website" | "gbp" | null
  >(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // --- HOOKS ---
  const {
    data: auditData,
    error: auditError,
    isPolling,
    derivedStage,
    progress,
  } = useAuditPolling(auditId);

  // Track if autostart has been triggered to prevent double-execution (use ref for synchronous check)
  const autostartTriggeredRef = useRef(false);

  // --- HANDLERS (defined before effects that use them) ---
  const handleAutoStart = async (domain: string, practiceSearchString: string) => {
    // Immediately transition to scanning stage
    setStage("scanning_website");

    try {
      const response = await fetch(`${API_BASE_URL}/audit/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain.startsWith("http") ? domain : `https://${domain}`,
          practice_search_string: practiceSearchString,
        }),
      });

      const result: StartAuditResponse = await response.json();
      if (result.success) {
        setAuditId(result.audit_id);
        // Don't update URL here - wait until after email wall to avoid re-triggering
      } else {
        console.error("Failed to start audit:", result.error);
        // Reset to input stage on failure
        setStage("input");
      }
    } catch (error) {
      console.error("Audit start error:", error);
      setStage("input");
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    // Prevent double-execution using ref (synchronous, survives StrictMode double-render)
    if (autostartTriggeredRef.current) return;

    const params = new URLSearchParams(window.location.search);

    // Check for existing audit_id (returning user or direct link)
    const auditIdParam = params.get("audit_id");
    if (auditIdParam) {
      setAuditId(auditIdParam);
      // Assume email is submitted if accessing via direct link
      setEmailSubmitted(true);
      return; // Exit early, don't check autostart
    }

    // Check for autostart with base64 encoded data (from homepage redirect)
    const autostart = params.get("autostart");
    const encodedData = params.get("data");

    if (autostart === "true" && encodedData) {
      // Mark as triggered IMMEDIATELY using ref (synchronous, before any async work)
      autostartTriggeredRef.current = true;

      // Clear URL params IMMEDIATELY to prevent any re-reads
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("autostart");
      cleanUrl.searchParams.delete("data");
      window.history.replaceState({}, "", cleanUrl.toString());

      try {
        // Decode base64 data
        const decodedString = atob(decodeURIComponent(encodedData));
        const data = JSON.parse(decodedString) as {
          domain: string;
          practice_search_string: string;
        };

        // Validate required fields and auto-start
        if (data.domain && data.practice_search_string) {
          handleAutoStart(data.domain, data.practice_search_string);
        }
      } catch (error) {
        console.error("Failed to parse autostart data:", error);
        // Fall through to normal input stage
      }
    }
  }, []); // Empty dependency - only run on mount

  useEffect(() => {
    // Sync stage with polling data
    if (!auditId || derivedStage === "input") {
      return;
    }

    // If we're on GBP stage and trying to move forward but carousel isn't done
    if (
      stage === "analyzing_gbp" &&
      derivedStage !== "analyzing_gbp" &&
      !gbpCarouselComplete
    ) {
      setPendingStage(derivedStage);
    } else if (derivedStage !== stage) {
      // Only update if stage actually changed
      setStage(derivedStage);
      // Reset carousel state when entering GBP stage
      if (derivedStage === "analyzing_gbp") {
        setGbpCarouselComplete(false);
        setPendingStage(null);
      }
    }
  }, [derivedStage, auditId, stage, gbpCarouselComplete, pendingStage]);

  // Handle carousel completion
  useEffect(() => {
    if (
      gbpCarouselComplete &&
      pendingStage &&
      pendingStage !== "analyzing_gbp"
    ) {
      setStage(pendingStage);
      setPendingStage(null);
    }
  }, [gbpCarouselComplete, pendingStage]);

  // Show error modal when audit polling returns an error
  useEffect(() => {
    if (auditError && auditId) {
      setShowErrorModal(true);
    }
  }, [auditError, auditId]);

  // --- HANDLERS ---
  const handleSelectGBP = useCallback((gbp: SelectedGBP) => {
    setSelectedGBP(gbp);
  }, []);

  const handleClearGBP = useCallback(() => {
    setSelectedGBP(null);
  }, []);

  const handleGbpCarouselComplete = useCallback(() => {
    setGbpCarouselComplete(true);
  }, []);

  // Handle retry from error modal
  const handleErrorRetry = useCallback(async () => {
    setShowErrorModal(false);
    setAuditId(null);
    // Re-trigger audit with same selectedGBP data
    if (selectedGBP) {
      // Reset stage and start new audit
      setStage("scanning_website");
      try {
        const response = await fetch(`${API_BASE_URL}/audit/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: selectedGBP.websiteUri || `https://${selectedGBP.domain}`,
            practice_search_string: selectedGBP.practiceSearchString,
          }),
        });

        const result: StartAuditResponse = await response.json();
        if (result.success) {
          setAuditId(result.audit_id);
        } else {
          console.error("Failed to start audit:", result.error);
          setStage("input");
        }
      } catch (error) {
        console.error("Audit start error:", error);
        setStage("input");
      }
    } else {
      setStage("input");
    }
  }, [selectedGBP]);

  // Handle email submission from error modal
  const handleErrorEmailSubmit = useCallback(
    async (email: string) => {
      await sendErrorNotificationEmail({
        userEmail: email,
        auditId: auditId!,
        errorMessage: auditError,
        practiceInfo: selectedGBP?.practiceSearchString,
      });
    },
    [auditId, auditError, selectedGBP]
  );

  const startAudit = async (gbp: SelectedGBP) => {
    try {
      const response = await fetch(`${API_BASE_URL}/audit/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: gbp.websiteUri || `https://${gbp.domain}`,
          practice_search_string: gbp.practiceSearchString,
        }),
      });

      const result: StartAuditResponse = await response.json();
      if (result.success) {
        setAuditId(result.audit_id);
        setStage("scanning_website");
      } else {
        console.error("Failed to start audit:", result.error);
      }
    } catch (error) {
      console.error("Audit start error:", error);
    }
  };

  const handleDashboardAction = useCallback(
    (
      action:
        | "scroll-overall"
        | "scroll-rank"
        | "scroll-gbp"
        | "scroll-website"
        | "open-insights-gbp"
        | "open-insights-website"
        | "schedule-call",
    ) => {
      const scrollWithOffset = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
          const container = element.closest(".overflow-y-auto");
          if (container) {
            const topPos = element.offsetTop;
            container.scrollTo({ top: topPos - 80, behavior: "smooth" });
          } else {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      };

      switch (action) {
        case "scroll-overall":
          scrollWithOffset("scroll-overall");
          break;
        case "scroll-rank":
          scrollWithOffset("scroll-rank");
          break;
        case "scroll-gbp":
          scrollWithOffset("scroll-gbp");
          break;
        case "scroll-website":
          scrollWithOffset("scroll-website");
          break;
        case "open-insights-gbp":
          setSelectedDataType("gbp");
          setSelectedPillarCategory(null);
          setModalOpen(true);
          break;
        case "open-insights-website":
          setSelectedDataType("website");
          setSelectedPillarCategory(null);
          setModalOpen(true);
          break;
        case "schedule-call":
          window.open("https://calendar.app.google/yJsmRsEnBSfDTVyz8", "_blank");
          break;
      }
    },
    [],
  );

  // --- MEMOIZED DATA ---
  const businessData = useMemo(
    () => auditData?.self_gbp || MOCK_BUSINESS,
    [auditData?.self_gbp],
  );
  const competitorData = useMemo(
    () => auditData?.competitors || MOCK_COMPETITORS,
    [auditData?.competitors],
  );
  const websiteData = useMemo(
    () => auditData?.website_analysis || MOCK_WEBSITE_ANALYSIS,
    [auditData?.website_analysis],
  );
  const gbpData = useMemo(
    () => auditData?.gbp_analysis || MOCK_GBP_ANALYSIS,
    [auditData?.gbp_analysis],
  );
  const screenshotUrl = useMemo(
    () => auditData?.screenshots?.desktop_url || MOCK_SCREENSHOT_DESKTOP,
    [auditData?.screenshots?.desktop_url],
  );

  // Show loading overlay when audit_id is present but data hasn't arrived yet
  const showInitialLoading = auditId && !auditData && stage !== "input";

  // --- RENDER ---
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
            <Sidebar
              stage={stage}
              progress={progress}
              setStage={setStage}
              onDashboardAction={handleDashboardAction}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 relative h-full overflow-hidden bg-slate-50">
        {showInitialLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-50"
          >
            <div className="flex flex-col items-center gap-4 bg-white px-8 py-6 rounded-2xl shadow-xl border border-gray-200">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              <span className="text-lg font-semibold text-gray-700">
                Loading your report...
              </span>
            </div>
          </motion.div>
        )}

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
                competitors={competitorData}
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
                websiteData={websiteData}
                gbpData={gbpData}
                screenshotUrl={screenshotUrl}
                auditId={auditId}
                emailSubmitted={emailSubmitted}
                onEmailSubmitted={() => {
                  setEmailSubmitted(true);
                  // Clean URL params and set audit_id after email wall
                  if (auditId) {
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.delete("autostart");
                    newUrl.searchParams.delete("data");
                    newUrl.searchParams.set("audit_id", auditId);
                    window.history.replaceState({}, "", newUrl.toString());
                  }
                }}
                modalOpen={modalOpen}
                setModalOpen={setModalOpen}
                selectedPillarCategory={selectedPillarCategory}
                setSelectedPillarCategory={setSelectedPillarCategory}
                selectedDataType={selectedDataType}
                setSelectedDataType={setSelectedDataType}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Error Modal - Shows when audit fails */}
      <AnimatePresence>
        {showErrorModal && (
          <AuditErrorModal
            isOpen={showErrorModal}
            errorMessage={auditError}
            onRetry={handleErrorRetry}
            onEmailSubmit={handleErrorEmailSubmit}
            onClose={() => setShowErrorModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
