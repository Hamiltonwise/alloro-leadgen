/**
 * Score utility functions and color mappings
 */

/**
 * Parse score values that might be string or number
 */
export const parseScoreValue = (
  value: string | number | undefined
): number => {
  if (typeof value === "number") return Math.round(value);
  if (typeof value === "string") return Math.round(parseFloat(value));
  return 0;
};

/**
 * Get color based on score threshold (green >= 90, yellow >= 70, red < 70)
 */
export const getColorFromScore = (
  score: number
): "green" | "yellow" | "red" => {
  if (score >= 90) return "green";
  if (score >= 70) return "yellow";
  return "red";
};

/**
 * Color class mappings for Tailwind
 */
export const colorClasses = {
  brand: "text-brand-500",
  green: "text-green-500",
  yellow: "text-yellow-500",
  red: "text-red-500",
  blue: "text-blue-500",
} as const;

export const bgColorClasses = {
  brand: "text-brand-100",
  green: "text-green-100",
  yellow: "text-yellow-100",
  red: "text-red-100",
  blue: "text-blue-100",
} as const;

export const glowClasses = {
  brand: "drop-shadow-[0_0_12px_rgba(214,104,83,0.6)]",
  green: "drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]",
  yellow: "drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]",
  red: "drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]",
  blue: "drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]",
} as const;
