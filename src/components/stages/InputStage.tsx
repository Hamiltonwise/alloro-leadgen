import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, Users } from "lucide-react";
import { SelectedGBP } from "../../types";
import { GBPSearchSelect } from "../GBPSearchSelect";

/**
 * Input Stage - Business Search
 * First stage of the audit flow where users search for their business on Google
 */
export const InputStage = ({
  onSearch,
  selectedGBP,
  onSelectGBP,
  onClearGBP,
}: {
  onSearch: (gbp: SelectedGBP) => void;
  selectedGBP: SelectedGBP | null;
  onSelectGBP: (gbp: SelectedGBP) => void;
  onClearGBP: () => void;
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGBP) onSearch(selectedGBP);
  };

  const canSubmit = selectedGBP !== null;

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-[1080px] mx-auto px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <motion.div
          className="mb-8 flex flex-col items-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <img
            src="/logo.png"
            alt="Alloro"
            className="w-16 h-16 object-contain mb-3"
          />
          <div className="flex items-center gap-2 px-4 py-1.5 bg-brand-50 rounded-full border border-brand-100">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-semibold text-brand-600">
              Alloro Practice Analyzer
            </span>
          </div>
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
          Is your practice <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-orange-400">
            losing to your competition?
          </span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 font-light">
          Alloro will analyze your practice's digital presence and reveal growth
          opportunities.
        </p>

        <form
          onSubmit={handleSubmit}
          className="w-full space-y-4 flex flex-col items-center"
        >
          {/* GBP Search Select Component */}
          <div className="max-w-[600px] w-full">
            <GBPSearchSelect
              onSelect={onSelectGBP}
              selectedGBP={selectedGBP}
              onClear={onClearGBP}
              placeholder="Search for your business on Google..."
            />
          </div>

          {/* Selected GBP Info & Submit Button */}
          {selectedGBP && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <button
                type="submit"
                disabled={!canSubmit}
                className="bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl px-10 py-4 font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-500/30 disabled:shadow-none flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Confirm and Start Audit
              </button>
            </motion.div>
          )}
        </form>

        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-500">
          <span className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
            <Sparkles className="w-4 h-4 text-brand-500" /> AI-Powered
          </span>
          <span className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
            <Zap className="w-4 h-4 text-yellow-500" /> Real-time Analysis
          </span>
          <span className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
            <Users className="w-4 h-4 text-blue-500" /> Competitor Intel
          </span>
        </div>
      </motion.div>
    </div>
  );
};
