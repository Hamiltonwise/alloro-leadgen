import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, MapPin, Loader2, ArrowRight, UserCheck, Star } from "lucide-react";
import { searchPlaces, getPlaceDetails } from "../../api/places";
import { validateReferralCode } from "../../api/checkup";
import { withTimeout, isConferenceMode } from "./conferenceFallback";
import type { PlaceSuggestion, PlaceDetails } from "../../api/places";
import { TailorText } from "../../components/TailorText";

/**
 * Specialty types Google Places may return in the types[] array.
 * Maps machine keys → human-readable display labels.
 */
const SPECIALTY_TYPE_MAP: Record<string, string> = {
  // Dental
  orthodontist: "orthodontist",
  endodontist: "endodontist",
  periodontist: "periodontist",
  prosthodontist: "prosthodontist",
  oral_surgeon: "oral surgeon",
  pediatric_dentist: "pediatric dentist",
  dentist: "dentist",
  dental_clinic: "dentist",
  // Healthcare
  chiropractor: "chiropractor",
  physiotherapist: "physical therapist",
  physical_therapist: "physical therapist",
  optometrist: "optometrist",
  optician: "optometrist",
  veterinary_care: "veterinarian",
  animal_hospital: "veterinarian",
  dermatologist: "dermatologist",
  plastic_surgeon: "plastic surgeon",
  // Med spa / aesthetics
  med_spa: "med spa",
  medical_spa: "med spa",
  // Professional services
  lawyer: "attorney",
  law_firm: "attorney",
  accounting: "accountant",
  tax_preparation_service: "accountant",
  financial_planner: "financial advisor",
  real_estate_agency: "real estate agent",
  real_estate_agent: "real estate agent",
  insurance_agency: "insurance agent",
  // Personal services
  barber_shop: "barber",
  beauty_salon: "salon",
  hair_salon: "salon",
  hair_care: "salon",
  spa: "spa",
  // Home services
  plumber: "plumber",
  electrician: "electrician",
  hvac_contractor: "HVAC contractor",
  roofing_contractor: "roofer",
  contractor: "contractor",
  locksmith: "locksmith",
  // Other
  gym: "gym",
  fitness_center: "gym",
  personal_trainer: "trainer",
  auto_repair: "auto shop",
  mechanic: "mechanic",
  restaurant: "restaurant",
  cafe: "cafe",
  bakery: "bakery",
};

/**
 * Keywords to detect specialty from a business name when types[] is too coarse.
 * Checked in order — first match wins.
 */
const NAME_SPECIALTY_PATTERNS: [RegExp, string][] = [
  // Dental
  [/orthodontic/i, "orthodontist"],
  [/endodontic/i, "endodontist"],
  [/periodontic/i, "periodontist"],
  [/prosthodontic/i, "prosthodontist"],
  [/oral\s*surg/i, "oral surgeon"],
  [/pediatric\s*dent/i, "pediatric dentist"],
  // Surgical sub-specialties (must be before generic matches)
  [/oculofacial|oculoplastic/i, "oculofacial surgeon"],
  [/plastic\s*surg/i, "plastic surgeon"],
  [/dermatolog/i, "dermatologist"],
  [/med\s*spa|medspa|medical\s*spa|aestheti/i, "med spa"],
  // Non-dental
  [/barber/i, "barber"],
  [/salon|beauty|hair/i, "salon"],
  [/chiropractic/i, "chiropractor"],
  [/physical\s*therap/i, "physical therapist"],
  [/veterinar|animal\s*hosp/i, "veterinarian"],
  [/optometr|optic/i, "optometrist"],
  [/law\s*(firm|office)|attorney/i, "attorney"],
  [/\bcpa\b|account/i, "accountant"],
  [/financial\s*(advis|plan)/i, "financial advisor"],
  [/real\s*estate/i, "real estate agent"],
  // Home + outdoor
  [/garden\s*design|landscape\s*design/i, "garden designer"],
  [/landscap/i, "landscaper"],
  [/plumb/i, "plumber"],
  [/electric/i, "electrician"],
  [/\bhvac\b/i, "HVAC contractor"],
  [/auto\s*(repair|body|shop)|mechanic/i, "auto shop"],
  [/fitness|gym|crossfit/i, "gym"],
  [/photograph/i, "photographer"],
  [/dog\s*groom|pet\s*groom/i, "pet groomer"],
];

/**
 * Derive a competitor term from PlaceDetails.
 *
 * Priority:
 * 1. Specialty keyword in business name ("Orthodontics" -> orthodontist)
 * 2. Granular specialty in types[] (orthodontist, endodontist, etc.)
 * 3. primaryTypeDisplayName if non-generic (e.g., "Hair Salon", "Chiropractor")
 * 4. Fallback: "competitor"
 *
 * Name-based detection runs first because Google Places types[] often returns
 * a generic parent type (e.g. "dentist") even for specialists whose name
 * clearly indicates a more specific specialty.
 */
export function competitorTerm(
  category: string,
  types: string[],
  name: string
): string {
  // 1. Parse business name for specialty keywords (most specific signal)
  for (const [pattern, label] of NAME_SPECIALTY_PATTERNS) {
    if (pattern.test(name)) return label;
  }

  // 2. Check types[] for a granular specialty
  for (const t of types) {
    const match = SPECIALTY_TYPE_MAP[t];
    if (match) return match;
  }

  // 3. Use primaryTypeDisplayName if it's not the generic "Dentist"
  if (category && category.toLowerCase() !== "dentist") {
    return category.toLowerCase();
  }

  // 4. Fallback
  return "business in your area";
}

const USER_QUESTION_PLACEHOLDERS = [
  "Where my clients come from",
  "Why my competitor ranks higher",
  "If my marketing is working",
];

export default function EntryScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || undefined;

  const urlPlaceId = searchParams.get("placeId") || undefined;
  const urlName = searchParams.get("name") || searchParams.get("q") || undefined;

  const [query, setQuery] = useState(urlName || "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelecting, setIsSelecting] = useState(!!urlPlaceId);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userQuestion, _setUserQuestion] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_placeholderIndex, setPlaceholderIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Persist conference mode from URL param to localStorage immediately on mount.
  // This ensures billing suppression works even if the user navigates away and back.
  useEffect(() => { isConferenceMode(); }, []);

  // Grab user's approximate location for autocomplete biasing via backend.
  // No browser geolocation prompt. IP-based only. Silent, private, no permission popup.
  useEffect(() => {
    fetch("/api/checkup/geo", { signal: AbortSignal.timeout(3000) })
      .then(r => r.json())
      .then(data => {
        if (data.lat && data.lng) {
          setUserLocation({ lat: data.lat, lng: data.lng });
        }
      })
      .catch(() => {});
  }, []);

  // Auto-select place from URL params (homepage CTA flow)
  useEffect(() => {
    if (!urlPlaceId) return;
    let cancelled = false;
    setIsSelecting(true);
    withTimeout(getPlaceDetails(urlPlaceId), 8000)
      .then((res) => {
        if (cancelled) return;
        if (res && res.success) {
          setSelectedPlace(res.place);
          setQuery(res.place.name);
        }
      })
      .catch(() => { if (!cancelled) setSearchError(true); })
      .finally(() => { if (!cancelled) setIsSelecting(false); });
    return () => { cancelled = true; };
  }, [urlPlaceId]);

  // Validate referral code on mount
  useEffect(() => {
    if (!refCode || refCode.length !== 8) return;
    withTimeout(validateReferralCode(refCode), 3000).then((res) => {
      if (res && res.valid && res.referrerName) {
        setReferrerName(res.referrerName);
      }
    });
  }, [refCode]);

  // Rotate placeholder examples for the "one question" input
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % USER_QUESTION_PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef(crypto.randomUUID());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedPlace(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setSuggestions([]);
      setNoResults(false);
      return;
    }

    setIsSearching(true);
    setSearchError(false);
    setNoResults(false);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await withTimeout(
          searchPlaces(value, sessionTokenRef.current, userLocation ?? undefined),
          5000
        );
        if (res && res.success) {
          setSuggestions(res.suggestions);
          setNoResults(res.suggestions.length === 0);
        } else if (!res) {
          setSearchError(true);
        }
      } catch {
        setSearchError(true);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleSelect = useCallback(
    async (suggestion: PlaceSuggestion) => {
      setIsSelecting(true);
      setSuggestions([]);
      setQuery(suggestion.mainText);

      try {
        const res = await withTimeout(
          getPlaceDetails(suggestion.placeId, sessionTokenRef.current),
          5000
        );
        if (res && res.success) {
          setSelectedPlace(res.place);
          // Reset session token after a complete session
          sessionTokenRef.current = crypto.randomUUID();
        } else if (!res) {
          setSearchError(true);
        }
      } catch {
        // Let user retry
      } finally {
        setIsSelecting(false);
      }
    },
    []
  );

  const handleContinue = () => {
    if (!selectedPlace) return;
    navigate("/checkup/scanning", { state: { place: selectedPlace, refCode, intent, userQuestion: userQuestion.trim() || undefined } });
  };

  return (
    <div className="w-full max-w-[500px] mt-2 sm:mt-6">

      {/* Referral banner */}
      {referrerName && (
        <div className="anim-fade-up flex items-center justify-center gap-2 mb-6 text-sm text-[#1A1D23] bg-[#D56753]/6 border border-[#D56753]/15 rounded-xl px-4 py-2.5">
          <UserCheck className="w-4 h-4 text-[#D56753] shrink-0" />
          <span>Referred by <strong>{referrerName}</strong></span>
        </div>
      )}

      {/* Live badge */}
      <div className="anim-fade-up flex justify-center mb-7" style={{ animationDelay: '0ms' }}>
        <span className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[#D56753]/20 bg-white/80 text-[11px] font-bold tracking-[0.18em] text-[#D56753] uppercase shadow-[0_2px_12px_rgba(214,104,83,0.08)]">
          <span className="relative w-1.5 h-1.5 shrink-0">
            <span className="absolute inset-0 rounded-full bg-[#D56753]" />
            <span className="live-dot absolute inset-0 rounded-full bg-[#D56753]" />
          </span>
          Free · 60 Seconds
        </span>
      </div>

      {/* Headline */}
      <div className="anim-fade-up text-center mb-10" style={{ animationDelay: '80ms' }}>
        <TailorText
          editKey="checkup.entry.headline"
          defaultText="Let's see what your business has been saying."
          as="h1"
          className="font-heading text-[34px] sm:text-[42px] font-semibold text-[#1A1D23] tracking-tight leading-[1.1] mb-5"
        />
        <p className="text-[15px] text-[#1A1D23]/45 leading-relaxed max-w-sm mx-auto">
          {selectedPlace
            ? `We'll read your market in ${selectedPlace.city || "your area"} and tell you what we find. Honest.`
            : "Type your business name. We'll tell you something specific and true."}
        </p>
      </div>

      {/* Search input */}
      <div className="anim-fade-up relative" style={{ animationDelay: '160ms' }}>
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#1A1D23]/25 pointer-events-none transition-colors duration-200 group-focus-within:text-[#D56753]" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search your business name…"
            autoComplete="off"
            className="w-full h-[60px] pl-14 pr-14 rounded-2xl bg-white border-2 border-[#1A1D23]/8 text-base font-medium text-[#1A1D23] placeholder:text-[#1A1D23]/25 shadow-[0_4px_24px_rgba(26,29,35,0.06)] transition-all duration-200 focus:outline-none focus:border-[#D56753]/35 focus:shadow-[0_4px_32px_rgba(214,104,83,0.12)]"
          />
          {isSearching && (
            <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#D56753] animate-spin" />
          )}
        </div>

        {/* Feedback states */}
        {searchError && !isSearching && (
          <p className="text-xs text-[#D56753] mt-2.5 ml-1.5 font-medium">
            Couldn't search right now — check your connection and try again.
          </p>
        )}
        {noResults && !isSearching && !searchError && query.trim().length >= 3 && (
          <p className="text-xs text-[#1A1D23]/40 mt-2.5 ml-1.5">
            No businesses found. Try a different name or add your city.
          </p>
        )}

        {/* Autocomplete dropdown */}
        {suggestions.length > 0 && !selectedPlace && (
          <ul className="absolute z-30 top-full mt-2 w-full bg-white border-2 border-[#1A1D23]/6 rounded-2xl shadow-[0_16px_48px_rgba(26,29,35,0.12)] overflow-hidden max-h-[60vh] overflow-y-auto anim-slide-down">
            {suggestions.map((s, i) => (
              <li key={s.placeId} className="border-b border-[#1A1D23]/4 last:border-0">
                <button
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-[#FDFCF9] transition-colors duration-150"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="w-7 h-7 rounded-lg bg-[#D56753]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#D56753]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1D23] break-words leading-snug">{s.mainText}</p>
                    <p className="text-xs text-[#1A1D23]/40 break-words mt-0.5">{s.secondaryText}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Intent chips */}
      {!selectedPlace && !isSelecting && (
        <div className="anim-fade-up mt-5 flex flex-wrap gap-2 justify-center" style={{ animationDelay: '240ms' }}>
          {["Who's beating me?", "What's my online score?", "How do I rank higher?"].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setIntent(label);
                searchInputRef.current?.focus();
              }}
              className={`text-[12px] px-3.5 py-1.5 rounded-full border transition-all duration-200 ${
                intent === label
                  ? "border-[#D56753] bg-[#D56753]/8 text-[#D56753] font-bold shadow-[0_2px_8px_rgba(214,104,83,0.15)]"
                  : "border-[#1A1D23]/10 bg-white/60 text-[#1A1D23]/50 hover:border-[#D56753]/30 hover:text-[#D56753] hover:bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Loading spinner */}
      {isSelecting && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#D56753]/20 border-t-[#D56753] animate-spin" />
          <p className="text-xs text-[#1A1D23]/35 font-medium tracking-wide">Fetching your profile…</p>
        </div>
      )}

      {/* Confirm card */}
      {selectedPlace && !isSelecting && (
        <div className="anim-scale-in mt-6" style={{ animationDelay: '0ms' }}>
          <div className="relative bg-white rounded-2xl shadow-[0_8px_40px_rgba(26,29,35,0.08)] overflow-hidden border border-[#1A1D23]/6">
            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#D56753] to-[#e57c6a]" />

            <div className="pl-7 pr-6 pt-6 pb-5">
              {/* Business info */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D56753]/12 to-[#D56753]/5 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 text-[#D56753]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-[#1A1D23] leading-tight">{selectedPlace.name}</p>
                  <p className="text-sm text-[#1A1D23]/45 mt-1 leading-snug">{selectedPlace.formattedAddress}</p>
                  <div className="flex items-center gap-2.5 mt-3">
                    {selectedPlace.category && (
                      <span className="inline-block text-[11px] font-bold text-[#D56753] bg-[#D56753]/8 rounded-full px-2.5 py-0.5 tracking-wide uppercase">
                        {competitorTerm(selectedPlace.category, selectedPlace.types || [], selectedPlace.name)}
                      </span>
                    )}
                    {selectedPlace.rating != null && (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1A1D23]/50">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {selectedPlace.rating}
                        {selectedPlace.reviewCount > 0 && (
                          <span className="font-normal text-[#1A1D23]/30">({selectedPlace.reviewCount})</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-4 border-t border-[#1A1D23]/6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlace(null);
                    setQuery("");
                    setSuggestions([]);
                  }}
                  className="text-xs text-[#1A1D23]/30 hover:text-[#1A1D23]/55 transition-colors font-medium"
                >
                  ← Search again
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#D56753] text-white text-sm font-bold px-6 py-3 hover:bg-[#bf4b36] active:scale-[0.97] transition-all duration-150 shadow-[0_4px_16px_rgba(214,104,83,0.35)]"
                >
                  <TailorText editKey="checkup.entry.cta" defaultText="Run My Checkup" as="span" />
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trust signals */}
      <div className="anim-fade-up mt-10 flex items-center justify-center gap-0" style={{ animationDelay: '320ms' }}>
        {["Free", "60 seconds", "See your score instantly"].map((text, i) => (
          <span key={text} className="flex items-center">
            {i > 0 && <span className="w-px h-3 bg-[#1A1D23]/12 mx-3.5" />}
            <span className="text-[11px] font-medium text-[#1A1D23]/28 tracking-wide">{text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
