import React, { memo, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Star, Users, Loader2 } from "lucide-react";
import { BusinessProfile, Competitor } from "../../types";

/**
 * Competitor Map Stage - Displays competitors on a map
 * Shows deduplication of nearby competitors, progressive reveal with stagger animation
 * IMPORTANT: This component is memoized for performance optimization
 */
export const CompetitorMapStage = memo(
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
            4,
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
        "competitors",
      );

      // Clear any existing timeouts
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];

      setShowingCompetitors([]);

      // Create new timeouts
      uniqueCompetitors.forEach((_, i) => {
        const timeout = setTimeout(
          () => {
            setShowingCompetitors((prev) => {
              if (prev.includes(i)) return prev;
              console.log("Revealing competitor", i);
              return [...prev, i];
            });
          },
          300 + i * 300,
        ); // Faster reveal: 300ms stagger
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
      ),
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
  },
);

CompetitorMapStage.displayName = "CompetitorMapStage";
