import { useState, useEffect, useCallback, useRef } from "react";
import { AuditStatusResponse, AuditStage } from "../types";
import { API_BASE_URL, POLL_INTERVAL } from "../../utils/config";

export function useAuditPolling(auditId: string | null) {
  const [data, setData] = useState<AuditStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!auditId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/audit/${auditId}/status`);
      const result: AuditStatusResponse = await response.json();

      if (result.success) {
        setData(result);
        setError(null);

        // Stop polling when complete or failed
        if (result.status === "completed" || result.status === "failed") {
          setIsPolling(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      } else {
        // Stop polling immediately on error
        setError(result.error_message || "Failed to fetch status");
        setIsPolling(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
      setError("Network error");
    }
  }, [auditId]);

  // Start polling
  const startPolling = useCallback(() => {
    if (!auditId) return;

    setIsPolling(true);
    fetchStatus(); // Immediate first fetch

    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL);
  }, [auditId, fetchStatus]);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Auto-start polling when auditId is set
  useEffect(() => {
    if (auditId && !isPolling) {
      startPolling();
    }
  }, [auditId]);

  // Derive UI stage from realtime_status
  const derivedStage: AuditStage = (() => {
    if (!data) return "input";

    switch (data.realtime_status) {
      case 0:
      case 1:
        return "scanning_website";
      case 2:
      case 3:
        return "analyzing_gbp";
      case 4:
        return "competitor_map";
      case 5:
        return "dashboard";
      default:
        return "input";
    }
  })();

  // Derive progress percentage (0-100)
  const progress = data ? Math.round((data.realtime_status / 5) * 100) : 0;

  return {
    data,
    error,
    isPolling,
    startPolling,
    stopPolling,
    derivedStage,
    progress,
  };
}

export default useAuditPolling;
