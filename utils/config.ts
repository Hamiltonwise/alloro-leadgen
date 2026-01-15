/**
 * Centralized configuration for API endpoints
 *
 * In production: Uses https://app.getalloro.com/api
 * In development (localhost): Falls back to http://localhost:3000/api
 */

// Determine if we're in production based on hostname
const isProduction =
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1";

// Production URL
const PRODUCTION_API_URL = "https://app.getalloro.com/api";

// Development URL (localhost fallback)
const DEVELOPMENT_API_URL = "http://localhost:3000/api";

/**
 * API Base URL
 * - Uses VITE_API_BASE_URL environment variable if set
 * - Falls back to production URL in production environment
 * - Falls back to localhost URL in development environment
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ||
  (isProduction ? PRODUCTION_API_URL : DEVELOPMENT_API_URL);

/**
 * Polling configuration
 */
export const POLL_INTERVAL = 2500; // 2.5 seconds
