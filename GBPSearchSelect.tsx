import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Globe,
  Star,
  Loader2,
  X,
  ChevronDown,
  Building2,
} from "lucide-react";
import {
  SelectedGBP,
  PlacesSuggestion,
  PlacesAutocompleteResponse,
  PlacesDetailsResponse,
} from "./types";
import { API_BASE_URL } from "./utils/config";

interface GBPSearchSelectProps {
  onSelect: (gbp: SelectedGBP) => void;
  selectedGBP: SelectedGBP | null;
  onClear: () => void;
  placeholder?: string;
}

/**
 * Debounce hook for search input
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const GBPSearchSelect: React.FC<GBPSearchSelectProps> = ({
  onSelect,
  selectedGBP,
  onClear,
  placeholder = "Search for your business...",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<PlacesSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedInput = useDebounce(inputValue, 300);

  // Fetch autocomplete suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/places/autocomplete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: query }),
      });

      const data: PlacesAutocompleteResponse = await response.json();

      if (data.success) {
        setSuggestions(data.suggestions);
        setIsOpen(data.suggestions.length > 0);
      } else {
        setError(data.error || "Failed to fetch suggestions");
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Autocomplete error:", err);
      setError("Network error. Please try again.");
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch place details when a suggestion is selected
  const fetchPlaceDetails = useCallback(
    async (placeId: string) => {
      setIsLoadingDetails(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/places/${placeId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data: PlacesDetailsResponse = await response.json();

        if (data.success && data.place) {
          onSelect(data.place);
          setInputValue("");
          setSuggestions([]);
          setIsOpen(false);
        } else {
          setError(data.error || "Failed to get business details");
        }
      } catch (err) {
        console.error("Place details error:", err);
        setError("Network error. Please try again.");
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [onSelect]
  );

  // Trigger search when debounced input changes
  useEffect(() => {
    if (debouncedInput && !selectedGBP) {
      fetchSuggestions(debouncedInput);
    }
  }, [debouncedInput, selectedGBP, fetchSuggestions]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          fetchPlaceDetails(suggestions[highlightedIndex].placeId);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: PlacesSuggestion) => {
    fetchPlaceDetails(suggestion.placeId);
  };

  // If a GBP is selected, show the selected state
  if (selectedGBP) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full"
      >
        <div className="bg-white border-2 border-brand-500 rounded-2xl p-4 shadow-[0_20px_50px_rgba(214,104,83,0.15)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2.5 bg-brand-100 rounded-xl flex-shrink-0">
                <Building2 className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">
                  {selectedGBP.name}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  {selectedGBP.formattedAddress}
                </p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {selectedGBP.rating && (
                    <span className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                      {selectedGBP.rating} ({selectedGBP.reviewCount} reviews)
                    </span>
                  )}
                  {selectedGBP.domain && (
                    <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                      <Globe className="w-3 h-3" />
                      {selectedGBP.domain}
                    </span>
                  )}
                  {selectedGBP.category && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {selectedGBP.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClear}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Clear selection"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative shadow-[0_20px_50px_rgba(214,104,83,0.15)] rounded-2xl transition-all duration-300 hover:shadow-[0_20px_60px_rgba(214,104,83,0.25)]">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none z-10">
          {isLoading || isLoadingDetails ? (
            <Loader2 className="h-5 w-5 text-brand-500 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (e.target.value.length >= 2) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className="block w-full pl-14 pr-12 py-5 text-lg rounded-2xl border-2 border-gray-200 bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all outline-none font-medium placeholder:text-gray-400"
          placeholder={placeholder}
          autoComplete="off"
        />
        {inputValue && (
          <button
            onClick={() => {
              setInputValue("");
              setSuggestions([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-5 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Dropdown - positioned above the input */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full bottom-full mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            <ul className="max-h-80 overflow-y-auto py-2">
              {suggestions.map((suggestion, index) => (
                <li key={suggestion.placeId}>
                  <button
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
                      highlightedIndex === index
                        ? "bg-brand-50"
                        : "hover:bg-gray-50"
                    }`}
                    disabled={isLoadingDetails}
                  >
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 ${
                        highlightedIndex === index
                          ? "bg-brand-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <MapPin
                        className={`w-4 h-4 ${
                          highlightedIndex === index
                            ? "text-brand-600"
                            : "text-gray-500"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold truncate ${
                          highlightedIndex === index
                            ? "text-brand-700"
                            : "text-gray-900"
                        }`}
                      >
                        {suggestion.mainText}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {suggestion.secondaryText}
                      </p>
                    </div>
                    {isLoadingDetails && highlightedIndex === index && (
                      <Loader2 className="w-4 h-4 text-brand-500 animate-spin flex-shrink-0 mt-1" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-red-500 flex items-center gap-1"
        >
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          {error}
        </motion.p>
      )}

      {/* Helper text */}
      {!isOpen && inputValue.length > 0 && inputValue.length < 2 && (
        <p className="mt-2 text-sm text-gray-400">
          Type at least 2 characters to search...
        </p>
      )}
    </div>
  );
};

export default GBPSearchSelect;
