import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, Users, Globe, AlertCircle } from "lucide-react";
import { SelectedGBP } from "../../types";
import { GBPSearchSelect } from "../GBPSearchSelect";
import { trackEvent, setCurrentStage } from "../../lib/tracking";

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isLikelyValidUrl(input: string): boolean {
  if (!input.trim()) return false;
  try {
    const u = new URL(normalizeUrl(input));
    return /\./.test(u.hostname);
  } catch {
    return false;
  }
}

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
  const inputStartedFiredRef = useRef(false);
  const [websiteOverride, setWebsiteOverride] = useState("");
  const [websiteSkipped, setWebsiteSkipped] = useState(false);

  // Reset override when GBP changes / clears.
  React.useEffect(() => {
    setWebsiteOverride("");
    setWebsiteSkipped(false);
  }, [selectedGBP?.placeId]);

  const gbpHasWebsite = !!selectedGBP?.websiteUri;
  const overrideValid = isLikelyValidUrl(websiteOverride);
  const websiteResolved = gbpHasWebsite || overrideValid || websiteSkipped;

  const handleInputFocus = () => {
    if (inputStartedFiredRef.current) return;
    inputStartedFiredRef.current = true;
    setCurrentStage("input_started");
    trackEvent("input_started");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGBP || !websiteResolved) return;

    // Build an effective GBP record with the resolved website (or null if skipped).
    const effective: SelectedGBP = (() => {
      if (gbpHasWebsite) return selectedGBP;
      if (websiteSkipped) {
        return {
          ...selectedGBP,
          websiteUri: null,
          domain: "",
        };
      }
      const normalized = normalizeUrl(websiteOverride);
      return {
        ...selectedGBP,
        websiteUri: normalized,
        domain: normalized.replace(/^https?:\/\//i, "").replace(/\/$/, ""),
      };
    })();

    setCurrentStage("input_submitted");
    trackEvent("input_submitted", {
      domain: effective.domain,
      practice_search_string: effective.practiceSearchString,
    });
    onSearch(effective);
  };

  const canSubmit = selectedGBP !== null && websiteResolved;

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
        <h1 className="text-4xl md:text-6xl font-medium text-gray-900 mb-6 tracking-tight">
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
          <div className="max-w-[600px] w-full" onFocus={handleInputFocus}>
            <GBPSearchSelect
              onSelect={onSelectGBP}
              selectedGBP={selectedGBP}
              onClear={onClearGBP}
              placeholder="Search for your business on Google..."
            />
          </div>

          {/* No-website prompt — only when GBP has no websiteUri */}
          {selectedGBP && !gbpHasWebsite && !websiteSkipped && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[600px] bg-amber-50 border border-amber-200 rounded-xl p-4 text-left"
            >
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    No website found on this Google profile
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Add your website URL for a full audit, or skip — we'll
                    still analyze your GBP and competitors.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    inputMode="url"
                    value={websiteOverride}
                    onChange={(e) => setWebsiteOverride(e.target.value)}
                    placeholder="https://yourpractice.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border-2 border-amber-200 focus:border-brand-500 outline-none text-sm bg-white text-gray-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setWebsiteSkipped(true)}
                  className="px-4 py-2.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-sm font-semibold text-amber-800 whitespace-nowrap"
                >
                  No website yet
                </button>
              </div>
              {websiteOverride && !overrideValid && (
                <p className="text-xs text-red-600 mt-2">
                  Doesn't look like a valid URL.
                </p>
              )}
            </motion.div>
          )}

          {/* Selected GBP Info & Submit Button */}
          {selectedGBP && websiteResolved && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-2"
            >
              {!gbpHasWebsite && websiteSkipped && (
                <button
                  type="button"
                  onClick={() => setWebsiteSkipped(false)}
                  className="text-xs text-gray-500 underline hover:text-gray-700"
                >
                  Actually, I have a website
                </button>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl px-10 py-4 font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-500/30 disabled:shadow-none flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                {!gbpHasWebsite && websiteSkipped
                  ? "Audit My GBP (no website)"
                  : "Confirm and Start Audit"}
              </button>
            </motion.div>
          )}
        </form>

        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-500">
          <span className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
            <Sparkles className="w-4 h-4 text-brand-500" /> Deep AI Analysis
          </span>
          <span className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
            <Zap className="w-4 h-4 text-yellow-500" /> Live Market Scan
          </span>
          <span className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
            <Users className="w-4 h-4 text-blue-500" /> Beat Local Competitors
          </span>
        </div>
      </motion.div>
    </div>
  );
};
