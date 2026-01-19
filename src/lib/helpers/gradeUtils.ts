/**
 * Grade utility functions and color mappings
 */

/**
 * Get color variant based on letter grade
 */
export const getGradeColor = (
  grade: string
): "green" | "blue" | "yellow" | "orange" | "red" => {
  const upperGrade = grade.toUpperCase();
  if (upperGrade.startsWith("A")) return "green";
  if (upperGrade.startsWith("B")) return "blue";
  if (upperGrade.startsWith("C")) return "yellow";
  if (upperGrade.startsWith("D")) return "orange";
  return "red";
};

export const gradeColorMap = {
  A: "green",
  B: "blue",
  C: "yellow",
  D: "orange",
  F: "red",
} as const;
