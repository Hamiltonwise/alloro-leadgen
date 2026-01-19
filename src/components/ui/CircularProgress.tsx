import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  getColorFromScore,
  colorClasses,
  bgColorClasses,
  glowClasses,
} from "../../lib/helpers/scoreUtils";

/**
 * Circular Progress Bar Component with Enhanced Animation
 */
export const CircularProgress = ({
  score,
  size = 120,
  strokeWidth = 8,
  label,
  color = "brand",
  delay = 0,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  color?: "brand" | "green" | "yellow" | "red" | "blue";
  delay?: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  const getColor = (s: number) => {
    if (s >= 90) return "green";
    if (s >= 70) return "yellow";
    return "red";
  };

  const actualColor = color === "brand" ? getColor(score) : color;

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay, type: "spring", stiffness: 100 }}
    >
      <span className="mb-2 text-[10px] font-semibold text-gray-500 text-center uppercase tracking-wide">
        {label}
      </span>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Animated glow ring */}
        <motion.div
          className={`absolute inset-0 rounded-full ${
            actualColor === "green"
              ? "bg-green-400"
              : actualColor === "yellow"
                ? "bg-yellow-400"
                : actualColor === "red"
                  ? "bg-red-400"
                  : "bg-brand-400"
          }`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0, 0.2, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: delay + 0.5 }}
          style={{ filter: "blur(8px)" }}
        />
        <svg
          className={`transform -rotate-90 ${glowClasses[actualColor]} relative z-10`}
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            className={bgColorClasses[actualColor]}
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress circle with dash animation */}
          <motion.circle
            className={colorClasses[actualColor]}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1], delay }}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center z-20"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: delay + 0.8, type: "spring" }}
        >
          <motion.span
            className="text-xl font-black text-gray-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 1 }}
          >
            {score}%
          </motion.span>
        </motion.div>
      </div>
    </motion.div>
  );
};
