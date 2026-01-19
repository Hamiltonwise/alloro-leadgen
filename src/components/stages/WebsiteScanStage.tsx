import React, { memo, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock } from "lucide-react";

/**
 * Website Scan Stage - Captures and analyzes website
 * Shows loading skeleton initially, then real screenshots once received
 * IMPORTANT: This component is memoized for performance optimization
 */
export const WebsiteScanStage = memo(
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
      "Initializing connection...",
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
      [],
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
      [],
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
  },
);
