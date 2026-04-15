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
import { EmailNotifyFab } from "./src/components/EmailNotifyFab";
import { useAuditPolling } from "./src/hooks/useAuditPolling";
import { API_BASE_URL } from "./utils/config";
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
import { trackEvent, setCurrentStage } from "./src/lib/tracking";

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
  const [competitorMapDisplayed, setCompetitorMapDisplayed] = useState(false);
  const [pendingStage, setPendingStage] = useState<AuditStage | null>(null);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [mobileProgress, setMobileProgress] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPillarCategory, setSelectedPillarCategory] = useState<
    string | null
  >(null);
  const [selectedDataType, setSelectedDataType] = useState<
    "website" | "gbp" | null
  >(null);
  // FAB "Email me when ready" — appears at 1:20 elapsed OR immediately on
  // confirmed audit error. Replaces the old AuditErrorModal entirely.
  const [auditStartedAt, setAuditStartedAt] = useState<number | null>(null);
  const [fabVisible, setFabVisible] = useState(false);
  const [fabVariant, setFabVariant] = useState<"wait" | "error">("wait");
  // Set to true once the FAB submit lands. Causes the dashboard's email
  // paywall to skip — we already have the email, gating again is hostile.
  const [paywallSatisfied, setPaywallSatisfied] = useState(false);

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
        setCurrentStage("audit_started");
        setAuditStartedAt(Date.now());
        trackEvent("audit_started", {
          audit_id: result.audit_id,
          domain,
          practice_search_string: practiceSearchString,
        });
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
  // Fire `landed` tracking event once on app mount. Fire-and-forget; never blocks.
  useEffect(() => {
    setCurrentStage("landed");
    trackEvent("landed");
  }, []);

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

    // GBP gate: hold on analyzing_gbp until carousel completes.
    if (
      stage === "analyzing_gbp" &&
      derivedStage !== "analyzing_gbp" &&
      !gbpCarouselComplete
    ) {
      setPendingStage(derivedStage);
      return;
    }

    // Competitor-map gate: backend may race past competitor_map → dashboard
    // before the user has had time to see the map. Hold dashboard until the
    // map has been displayed for its minimum window. Also force-route through
    // competitor_map even if backend skipped past it (e.g. dashboard arrives
    // before the map ever became the derived stage).
    if (
      stage === "competitor_map" &&
      derivedStage === "dashboard" &&
      !competitorMapDisplayed
    ) {
      setPendingStage("dashboard");
      return;
    }
    if (
      stage === "analyzing_gbp" &&
      gbpCarouselComplete &&
      derivedStage === "dashboard"
    ) {
      // Hop through competitor_map first. Dashboard remains pending.
      setStage("competitor_map");
      setCompetitorMapDisplayed(false);
      setPendingStage("dashboard");
      return;
    }

    if (derivedStage !== stage) {
      setStage(derivedStage);
      if (derivedStage === "analyzing_gbp") {
        setGbpCarouselComplete(false);
        setPendingStage(null);
      }
      if (derivedStage === "competitor_map") {
        setCompetitorMapDisplayed(false);
        setPendingStage(null);
      }
    }
  }, [
    derivedStage,
    auditId,
    stage,
    gbpCarouselComplete,
    competitorMapDisplayed,
    pendingStage,
  ]);

  // Mobile progress bar — persists across audit sub-stages (scanning_website
  // → analyzing_gbp → competitor_map) by tracking start in a ref so stage
  // changes don't restart the fill. Non-linear piecewise curve so the bar
  // jumps quickly at first (lots is happening) then slows as it approaches
  // 95%, with each segment having a different rate for a "skipping but
  // always forward" feel. Snaps to 100% the moment stage === "dashboard".
  const progressStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (stage === "input") {
      progressStartRef.current = null;
      setMobileProgress(0);
      return;
    }
    if (stage === "dashboard") {
      progressStartRef.current = null;
      setMobileProgress(100);
      return;
    }
    if (progressStartRef.current === null) {
      progressStartRef.current = Date.now();
    }
    const computeProgress = (elapsedMs: number): number => {
      const s = elapsedMs / 1000;
      if (s < 8) return s * 3; // 0 → 24 fast
      if (s < 20) return 24 + (s - 8) * 2; // 24 → 48 moderate
      if (s < 40) return 48 + (s - 20) * 1.2; // 48 → 72 slower
      if (s < 90) return Math.min(95, 72 + (s - 40) * 0.46); // 72 → 95 crawl
      return 95;
    };
    const interval = setInterval(() => {
      const elapsed = Date.now() - (progressStartRef.current ?? Date.now());
      const pct = computeProgress(elapsed);
      setMobileProgress(pct);
      if (pct >= 95) clearInterval(interval);
    }, 400);
    return () => clearInterval(interval);
  }, [stage]);

  // Once competitor_map has been on screen long enough, allow advance.
  useEffect(() => {
    if (stage !== "competitor_map" || competitorMapDisplayed) return;
    const timer = setTimeout(() => setCompetitorMapDisplayed(true), 4500);
    return () => clearTimeout(timer);
  }, [stage, competitorMapDisplayed]);

  // Pending-stage handlers (after either GBP carousel or map display gate clears).
  useEffect(() => {
    if (
      gbpCarouselComplete &&
      pendingStage &&
      stage === "analyzing_gbp" &&
      pendingStage !== "analyzing_gbp"
    ) {
      // Always route through competitor_map first when leaving GBP.
      setStage(pendingStage === "dashboard" ? "competitor_map" : pendingStage);
      if (pendingStage === "dashboard") {
        setCompetitorMapDisplayed(false);
        // leave pendingStage = "dashboard" so the next effect picks it up
      } else {
        setPendingStage(null);
      }
    }
  }, [gbpCarouselComplete, pendingStage, stage]);

  useEffect(() => {
    if (
      competitorMapDisplayed &&
      pendingStage === "dashboard" &&
      stage === "competitor_map"
    ) {
      setStage("dashboard");
      setPendingStage(null);
    }
  }, [competitorMapDisplayed, pendingStage, stage]);

  // FAB visibility — replaces the old AuditErrorModal logic.
  // 1. When audit polling reports an error, show the FAB in `error` mode
  //    immediately (no 1:20 wait).
  // 2. When the audit completes (stage transitions to dashboard), hide
  //    the FAB.
  useEffect(() => {
    if (auditError && auditId) {
      setFabVariant("error");
      setFabVisible(true);
    }
  }, [auditError, auditId]);

  useEffect(() => {
    if (stage === "dashboard") {
      setFabVisible(false);
    }
  }, [stage]);

  // 1:20 (80s) timer — show the wait-variant FAB if the audit is still
  // processing. Cancelled if the audit completes first OR an error fires
  // (the error effect above takes over).
  useEffect(() => {
    if (!auditStartedAt || !auditId) return;
    if (stage === "dashboard") return;
    if (auditError) return;
    const timer = window.setTimeout(() => {
      setFabVariant("wait");
      setFabVisible(true);
    }, 80_000);
    return () => window.clearTimeout(timer);
  }, [auditStartedAt, auditId, stage, auditError]);

  // FAB submitted: hide and mark paywall satisfied so the dashboard skips
  // the in-tab email gate (we already have their email).
  const handleFabSubmitted = useCallback(() => {
    setFabVisible(false);
    setPaywallSatisfied(true);
    setEmailSubmitted(true);
  }, []);

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
    setFabVisible(false);
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
            domain: selectedGBP.websiteUri || (selectedGBP.domain ? `https://${selectedGBP.domain}` : ""),
            practice_search_string: selectedGBP.practiceSearchString,
          }),
        });

        const result: StartAuditResponse = await response.json();
        if (result.success) {
          setAuditId(result.audit_id);
          setCurrentStage("audit_started");
          trackEvent("audit_started", {
            audit_id: result.audit_id,
            domain: selectedGBP.domain,
            practice_search_string: selectedGBP.practiceSearchString,
          });
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

  const startAudit = async (gbp: SelectedGBP) => {
    try {
      const response = await fetch(`${API_BASE_URL}/audit/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: gbp.websiteUri || (gbp.domain ? `https://${gbp.domain}` : ""),
          practice_search_string: gbp.practiceSearchString,
        }),
      });

      const result: StartAuditResponse = await response.json();
      if (result.success) {
        setAuditId(result.audit_id);
        setCurrentStage("audit_started");
        setAuditStartedAt(Date.now());
        trackEvent("audit_started", {
          audit_id: result.audit_id,
          domain: gbp.domain,
          practice_search_string: gbp.practiceSearchString,
        });
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
  const hasWebsiteData = !!auditData?.website_analysis;
  // No mock fallback — pass real data when present, null otherwise.
  // DashboardStage greys out website-side UI when this is null.
  const websiteData = useMemo(
    () => auditData?.website_analysis ?? null,
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
    <div className="flex h-screen bg-beige font-sans text-slate-900 overflow-hidden selection:bg-brand-100 selection:text-brand-900">
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
      <main className="flex-1 relative h-full overflow-hidden bg-beige flex flex-col">
        {/* Audit header — sticky, visible on both mobile and desktop during
            active audit stages. Mobile shows Alloro logo + serif label above
            the progress bar; desktop skips the lockup (sidebar already has
            brand) and renders only the progress strip at the very top. */}
        {stage !== "input" && stage !== "dashboard" && (
          <header className="sticky top-0 shrink-0 bg-white border-b border-gray-200 z-30">
            <div className="md:hidden flex items-center gap-2 px-4 py-3">
              <img
                src="/logo.png"
                alt="Alloro"
                className="w-7 h-7 object-contain shrink-0"
              />
              <span className="font-heading text-lg font-bold text-gray-900 tracking-tight">
                Alloro
              </span>
            </div>
            <div className="h-2 md:h-1.5 w-full bg-gray-100 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-400 to-brand-600"
                animate={{ width: `${mobileProgress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </header>
        )}

        {/* Mobile-only top bar — ONLY on the report (dashboard) stage. White
            bg with logo+label LEFT and signup CTA on the far RIGHT. Hidden on
            md+ where the sidebar replaces it. Other stages (input, scanning,
            gbp, map) don't show this header. */}
        {stage === "dashboard" && (
          <header className="md:hidden shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between z-30">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/logo.png"
                alt="Alloro"
                className="w-7 h-7 object-contain shrink-0"
              />
              <span className="font-heading text-base font-semibold text-gray-900 tracking-tight">
                Alloro
              </span>
            </div>
            <a
              href="https://app.getalloro.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-brand-500 hover:bg-brand-600 text-white px-3.5 py-2 rounded-full text-xs font-bold shadow-sm shadow-brand-500/30 whitespace-nowrap shrink-0"
            >
              Create Free Account
            </a>
          </header>
        )}

        <div className="relative flex-1 overflow-hidden">
        {showInitialLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-beige"
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
                hasWebsiteData={hasWebsiteData}
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
        </div>
      </main>

      {/* "Email me when ready" FAB — replaces the old shake-on-error modal.
          Bottom-center floating button. Appears at 1:20 elapsed if the
          audit is still processing, or immediately on confirmed audit
          error. Hidden on dashboard. */}
      <EmailNotifyFab
        visible={fabVisible}
        variant={fabVariant}
        auditId={auditId}
        onSubmitted={handleFabSubmitted}
      />
    </div>
  );
};

export default App;
