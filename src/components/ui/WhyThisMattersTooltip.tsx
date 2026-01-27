import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle } from "lucide-react";

interface WhyThisMattersTooltipProps {
  description: string;
  variant: "icon" | "link";
}

export const WhyThisMattersTooltip: React.FC<WhyThisMattersTooltipProps> = ({
  description,
  variant,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => setIsVisible(false);
  const handleClick = () => setIsVisible(!isVisible);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      if (variant === "icon") {
        // Position below and to the left of the icon
        setTooltipPosition({
          top: rect.bottom + 8,
          left: rect.right - 256, // 256px is the tooltip width (w-64)
        });
      } else {
        // Position above and centered on the link
        setTooltipPosition({
          top: rect.top - 8,
          left: rect.left + rect.width / 2 - 128, // Center the 256px tooltip
        });
      }
    }
  }, [isVisible, variant]);

  const tooltip = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: variant === "icon" ? -5 : 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: variant === "icon" ? -5 : 5 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
            mass: 0.8,
          }}
          style={{
            position: "fixed",
            top: variant === "link" ? "auto" : tooltipPosition.top,
            bottom: variant === "link" ? `calc(100vh - ${tooltipPosition.top}px)` : "auto",
            left: tooltipPosition.left,
            zIndex: 9999,
          }}
          className="w-64 p-4 bg-white rounded-xl shadow-xl border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center">
              <HelpCircle className="w-3 h-3 text-brand-500" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">Why this matters</h4>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
          {/* Arrow pointer */}
          <div
            className={`absolute w-3 h-3 bg-white border-gray-100 transform rotate-45 ${
              variant === "icon"
                ? "-top-1.5 right-4 border-l border-t"
                : "-bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b"
            }`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {variant === "icon" ? (
        <button
          ref={triggerRef}
          type="button"
          className="w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm flex items-center justify-center hover:bg-white hover:shadow-md transition-all duration-200 cursor-pointer"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          aria-label="Why this matters"
        >
          <HelpCircle className="w-4 h-4 text-gray-500" />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          className="flex items-center gap-1 text-brand-500 hover:text-brand-600 transition-colors duration-200 cursor-pointer"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          aria-label="Why this matters"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="text-xs font-medium underline underline-offset-2">
            Why this matters
          </span>
        </button>
      )}
      {createPortal(tooltip, document.body)}
    </>
  );
};
