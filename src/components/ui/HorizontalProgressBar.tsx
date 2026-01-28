import React from "react";
import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { getColorFromScore } from "../../lib/helpers/scoreUtils";
import { WhyThisMattersTooltip } from "./WhyThisMattersTooltip";

/**
 * Horizontal Progress Bar Component with Action Items and Modal Trigger
 */
export const HorizontalProgressBar = ({
  score,
  label,
  actionItems = [],
  onViewMore,
  delay = 0,
  whyThisMatters,
}: {
  score: number;
  label: string;
  actionItems?: string[];
  onViewMore?: () => void;
  delay?: number;
  whyThisMatters?: string;
}) => {
  const colorMap = {
    green: {
      bg: "bg-green-500",
      light: "bg-green-100",
      text: "text-green-600",
    },
    yellow: {
      bg: "bg-yellow-500",
      light: "bg-yellow-100",
      text: "text-yellow-600",
    },
    red: {
      bg: "bg-red-500",
      light: "bg-red-100",
      text: "text-red-600",
    },
  };

  const colorKey = getColorFromScore(score);
  const colors = colorMap[colorKey];

  return (
    <motion.div
      className="mb-5"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay, type: "spring", stiffness: 80 }}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <div className="flex items-center gap-3">
          {whyThisMatters && (
            <WhyThisMattersTooltip
              description={whyThisMatters}
              variant="link"
            />
          )}
          <motion.span
            className={`text-sm font-bold ${colors.text}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.3, type: "spring" }}
          >
            {score}%
          </motion.span>
        </div>
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
      {actionItems.length > 0 && (
        <motion.div
          className="mt-2"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: delay + 0.6 }}
        >
          {/* First Action Item */}
          <div className="flex items-start gap-1.5">
            <Target className="w-3.5 h-3.5 text-brand-500 mt-[6px] flex-shrink-0" />
            <div className="flex-1">
              <span className="text-xs text-gray-700 leading-relaxed">
                {typeof actionItems[0] === 'string'
                  ? actionItems[0].replace(/^Executive Recommendation:\s*/i, "")
                  : String(actionItems[0] || "")}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
