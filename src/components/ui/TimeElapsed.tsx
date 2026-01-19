import React, { useState, useEffect } from "react";

/**
 * Time Elapsed Component for Sidebar
 * Displays elapsed time in MM:SS format
 */
export const TimeElapsed = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <span className="font-mono">
      {minutes}:{secs.toString().padStart(2, "0")}
    </span>
  );
};
