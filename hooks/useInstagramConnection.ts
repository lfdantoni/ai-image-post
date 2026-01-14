"use client";

import { useState, useEffect, useCallback } from "react";

interface RateLimit {
  used: number;
  remaining: number;
  resetsAt: Date;
}

interface TokenInfo {
  expired: boolean;
  expiringSoon: boolean;
  expiresAt: Date;
  expiresInDays: number;
}

interface InstagramAccount {
  id: string;
  username: string;
  profilePicture: string | null;
  accountType: string;
  isDefault: boolean;
  facebookPage: {
    id: string;
    name: string;
  };
  token: TokenInfo;
  rateLimit: RateLimit | null;
  connectedAt: Date;
}

interface InstagramConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  accounts: InstagramAccount[];
  activeAccount: InstagramAccount | null;
  // Backward compatibility
  account: InstagramAccount | null;
  rateLimit: RateLimit | null;
  permissions: string[];
  hasPublishPermission: boolean;
}

interface UseInstagramConnectionReturn extends InstagramConnectionState {
  connect: () => void;
  disconnect: (accountId?: string) => Promise<void>;
  setActiveAccount: (accountId: string) => void;
  setDefaultAccount: (accountId: string) => Promise<boolean>;
  refreshStatus: () => Promise<void>;
  refreshToken: (accountId?: string) => Promise<boolean>;
}

function transformAccount(data: {
  id: string;
  username: string;
  profilePictureUrl: string | null;
  accountType: string;
  isDefault: boolean;
  facebookPage: { id: string; name: string };
  token: { expired: boolean; expiringSoon: boolean; expiresAt: string; expiresInDays: number };
  rateLimit: { postsToday: number; postsRemaining: number; resetsAt: string } | null;
  stats: { connectedAt: string };
}): InstagramAccount {
  return {
    id: data.id,
    username: data.username,
    profilePicture: data.profilePictureUrl,
    accountType: data.accountType,
    isDefault: data.isDefault,
    facebookPage: data.facebookPage,
    token: {
      expired: data.token.expired,
      expiringSoon: data.token.expiringSoon,
      expiresAt: new Date(data.token.expiresAt),
      expiresInDays: data.token.expiresInDays,
    },
    rateLimit: data.rateLimit
      ? {
          used: data.rateLimit.postsToday,
          remaining: data.rateLimit.postsRemaining,
          resetsAt: new Date(data.rateLimit.resetsAt),
        }
      : null,
    connectedAt: new Date(data.stats.connectedAt),
  };
}

export function useInstagramConnection(): UseInstagramConnectionReturn {
  const [state, setState] = useState<InstagramConnectionState>({
    isConnected: false,
    isLoading: true,
    error: null,
    accounts: [],
    activeAccount: null,
    account: null,
    rateLimit: null,
    permissions: [],
    hasPublishPermission: false,
  });

  const fetchStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/instagram/status", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch Instagram status");
      }

      // Transform accounts array
      const accounts: InstagramAccount[] = (data.accounts || []).map(transformAccount);
      const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0] || null;

      const newState: InstagramConnectionState = {
        isConnected: accounts.length > 0,
        isLoading: false,
        error: null,
        accounts,
        activeAccount: defaultAccount,
        // Backward compatibility
        account: defaultAccount,
        rateLimit: defaultAccount?.rateLimit || null,
        permissions: data.permissions || [],
        hasPublishPermission:
          (data.permissions || []).includes("instagram_content_publish") ||
          accounts.length > 0,
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

  const disconnect = useCallback(
    async (accountId?: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const url = accountId
          ? `/api/instagram/auth?accountId=${accountId}`
          : "/api/instagram/auth";

        const response = await fetch(url, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to disconnect Instagram");
        }

        // Refresh status to get updated accounts list
        await fetchStatus();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    },
    [fetchStatus]
  );

  const setActiveAccount = useCallback((accountId: string) => {
    setState((prev) => {
      const account = prev.accounts.find((a) => a.id === accountId);
      if (!account) return prev;

      return {
        ...prev,
        activeAccount: account,
        account: account,
        rateLimit: account.rateLimit,
      };
    });
  }, []);

  const setDefaultAccount = useCallback(
    async (accountId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/instagram/accounts/${accountId}/default`, {
          method: "PUT",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to set default account");
        }

        // Refresh status to get updated default
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
    },
    [fetchStatus]
  );

  const refreshStatus = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  const refreshToken = useCallback(
    async (accountId?: string): Promise<boolean> => {
      try {
        const response = await fetch("/api/instagram/auth/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accountId }),
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
    },
    [fetchStatus]
  );

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    ...state,
    connect,
    disconnect,
    setActiveAccount,
    setDefaultAccount,
    refreshStatus,
    refreshToken,
  };
}

// Utility function to clear the cache (useful for testing or after certain actions)
export function clearInstagramConnectionCache() {
  // Cache is removed
}
