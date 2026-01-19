import React, { memo, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  MapPin,
  Star,
  Globe,
} from "lucide-react";
import { BusinessProfile } from "../../types";
import { PhotosAnalysisSubStage } from "./PhotosAnalysisSubStage";

/**
 * GBP Analysis Stage - Carousel displaying business profile details
 * Cycles through 3 pages: Profile, Reviews, Photos
 * IMPORTANT: This component is memoized for performance optimization
 */
export const GBPAnalysisStage = memo(
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
              "Carousel cycle complete, stopping interval and calling onCarouselComplete",
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
              ),
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
  },
);
