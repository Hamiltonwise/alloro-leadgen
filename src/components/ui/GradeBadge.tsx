import React from "react";
import { getGradeColor } from "../../lib/helpers/gradeUtils";

/**
 * Grade Badge Component
 * Displays a letter grade with color-coded background
 */
export const GradeBadge = ({
  grade,
  size = "lg",
}: {
  grade: string;
  size?: "sm" | "lg";
}) => {
  const colorMap = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };

  const gradeColor = getGradeColor(grade);
  const bgColor = colorMap[gradeColor];

  return (
    <div
      className={`${bgColor} text-white font-black rounded-2xl flex items-center justify-center shadow-lg ${
        size === "lg" ? "w-24 h-24 text-5xl" : "w-12 h-12 text-2xl"
      }`}
    >
      {grade}
    </div>
  );
};
