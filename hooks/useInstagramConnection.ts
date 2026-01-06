"use client";

import { useState, useEffect, useCallback } from "react";

interface InstagramAccount {
  username: string;
  profilePicture: string | null;
  accountType: string;
  facebookPage: {
    id: string;
    name: string;
  };
  tokenExpiresAt: Date;
  connectedAt: Date;
}

interface RateLimit {
  used: number;
  remaining: number;
  resetsAt: Date;
}

interface InstagramConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  account: InstagramAccount | null;
  rateLimit: RateLimit | null;
  permissions: string[];
  hasPublishPermission: boolean;
}

interface UseInstagramConnectionReturn extends InstagramConnectionState {
  connect: () => void;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

let cachedStatus: InstagramConnectionState | null = null;
let cacheTimestamp = 0;

export function useInstagramConnection(): UseInstagramConnectionReturn {
  const [state, setState] = useState<InstagramConnectionState>({
    isConnected: false,
    isLoading: true,
    error: null,
    account: null,
    rateLimit: null,
    permissions: [],
    hasPublishPermission: false,
  });

  const fetchStatus = useCallback(async (skipCache = false) => {
    // Check cache first
    if (!skipCache && cachedStatus && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setState(cachedStatus);
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/instagram/status");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch Instagram status");
      }

      const newState: InstagramConnectionState = {
        isConnected: data.isConnected,
        isLoading: false,
        error: null,
        account: data.account
          ? {
              username: data.account.username,
              profilePicture: data.account.profilePicture,
              accountType: data.account.accountType,
              facebookPage: data.account.facebookPage,
              tokenExpiresAt: new Date(data.account.tokenExpiresAt),
              connectedAt: new Date(data.account.connectedAt),
            }
          : null,
        rateLimit: data.rateLimit
          ? {
              used: data.rateLimit.used,
              remaining: data.rateLimit.remaining,
              resetsAt: new Date(data.rateLimit.resetsAt),
            }
          : null,
        permissions: data.permissions || [],
        hasPublishPermission: data.hasPublishPermission || false,
      };

      // Update cache
      cachedStatus = newState;
      cacheTimestamp = Date.now();

      setState(newState);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const connect = useCallback(() => {
    // Redirect to Instagram OAuth flow
    window.location.href = "/api/instagram/auth";
  }, []);

  const disconnect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/instagram/auth", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disconnect Instagram");
      }

      // Clear cache
      cachedStatus = null;
      cacheTimestamp = 0;

      setState({
        isConnected: false,
        isLoading: false,
        error: null,
        account: null,
        rateLimit: null,
        permissions: [],
        hasPublishPermission: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    await fetchStatus(true); // Skip cache
  }, [fetchStatus]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/instagram/auth/refresh", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to refresh token");
      }

      // Refresh status to get new token expiration
      await fetchStatus(true);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      return false;
    }
  }, [fetchStatus]);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    ...state,
    connect,
    disconnect,
    refreshStatus,
    refreshToken,
  };
}

// Utility function to clear the cache (useful for testing or after certain actions)
export function clearInstagramConnectionCache() {
  cachedStatus = null;
  cacheTimestamp = 0;
}
