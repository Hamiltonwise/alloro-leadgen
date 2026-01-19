import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Loader2, MapPin } from "lucide-react";
import { BusinessProfile } from "../../types";

interface CollageItem {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
  z: number;
}

/**
 * Photos Analysis Sub-Stage Component with delayed mini cards
 * Part of the GBPAnalysisStage carousel
 */
export const PhotosAnalysisSubStage = ({
  data,
  collageItems,
}: {
  data: BusinessProfile;
  collageItems: CollageItem[];
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

      {/* Loading indicator */}
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
