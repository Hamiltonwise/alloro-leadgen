import React from "react";
import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { WebsiteAnalysis, GBPAnalysis } from "../../types";

/**
 * Action Items Modal Component - Shows pillars grouped with key findings and action items
 */
export const ActionItemsModal = ({
  isOpen,
  onClose,
  pillarCategory,
  dataType,
  websiteData,
  gbpData,
  competitorAnalysis,
}: {
  isOpen: boolean;
  onClose: () => void;
  pillarCategory: string | null;
  dataType: "website" | "gbp" | null;
  websiteData: WebsiteAnalysis;
  gbpData: GBPAnalysis;
  competitorAnalysis: any | null;
}) => {
  if (!isOpen || !dataType) return null;

  // Get ALL pillars from the selected data type
  const pillars =
    dataType === "website" ? websiteData.pillars : gbpData.pillars;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-brand-500 to-brand-600 text-white p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold">
              {dataType === "gbp"
                ? "Google Business Profile Key Insights"
                : "Website Performance Key Insights"}
            </h2>
            <p className="text-sm text-white/80 mt-1">
              Detailed insights across {pillars.length} pillars
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content - Grouped by Pillar */}
        <div className="p-6 space-y-6">
          {pillars.map((pillar, pillarIdx) => (
            <motion.div
              key={pillarIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: pillarIdx * 0.1 }}
              className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-6 shadow-sm"
            >
              {/* Pillar Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {pillar.category}
                </h3>
                <span
                  className={`px-3 py-1 text-sm font-bold rounded-full ${
                    Number(pillar.score) >= 90
                      ? "bg-green-100 text-green-700"
                      : Number(pillar.score) >= 70
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {pillar.score}%
                </span>
              </div>

              {/* Key Finding - No card wrapper */}
              <div className="mb-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {pillar.key_finding}
                </p>
              </div>

              {/* Action Items (if any) */}
              {pillar.action_items && pillar.action_items.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-brand-500" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Action Items
                    </span>
                  </div>
                  <div className="space-y-2">
                    {pillar.action_items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
                      >
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">
                            {itemIdx + 1}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed pt-0.5">
                          {item.replace(/^Executive Recommendation:\s*/i, "")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* Close Button */}
          <motion.button
            onClick={onClose}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-4 rounded-lg transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Close
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
