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
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/instagram/status", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch Instagram status");
      }

      const newState: InstagramConnectionState = {
        isConnected: !!data.connected,
        isLoading: false,
        error: null,
        account: data.account
          ? {
              username: data.account.username,
              profilePicture: data.account.profilePictureUrl,
              accountType: data.account.accountType,
              facebookPage: data.account.facebookPage,
              tokenExpiresAt: new Date(data.token?.expiresAt || Date.now()),
              connectedAt: new Date(data.stats?.connectedAt || Date.now()),
            }
          : null,
        rateLimit: data.rateLimit
          ? {
              used: data.rateLimit.postsToday,
              remaining: data.rateLimit.postsRemaining,
              resetsAt: new Date(data.rateLimit.resetsAt),
            }
          : null,
        permissions: data.permissions || [],
        hasPublishPermission: (data.permissions || []).includes("instagram_content_publish") || !!data.connected,
      };

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
    await fetchStatus();
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
      await fetchStatus();
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
  // Cache is removed
}
