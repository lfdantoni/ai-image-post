"use client";

import { useState, useEffect, useCallback } from "react";

export interface DriveQuota {
  used: number;
  total: number;
  usedFormatted: string;
  totalFormatted: string;
}

export interface DriveSettings {
  autoSyncOnExport: boolean;
  backupOriginals: boolean;
  includeMetadataJson: boolean;
  folderOrganization: "date" | "project" | "flat";
}

interface DriveStatus {
  connected: boolean;
  email?: string;
  rootFolderId?: string;
  rootFolderLink?: string;
  connectedAt?: string;
  settings?: DriveSettings;
  quota?: DriveQuota;
  message?: string;
}

interface UseGoogleDriveReturn {
  // State
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  isDriveEnabled: boolean; // Whether Drive feature is enabled

  // Info
  email: string | null;
  quota: DriveQuota | null;
  rootFolderId: string | null;
  rootFolderLink: string | null;
  settings: DriveSettings | null;

  // Actions
  initialize: () => Promise<{ success: boolean; folderLink?: string; error?: string }>;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  updateSettings: (settings: Partial<DriveSettings>) => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useGoogleDrive(): UseGoogleDriveReturn {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0);
  const [isDriveEnabled, setIsDriveEnabled] = useState<boolean>(false); // Default to false until confirmed by API

  const fetchStatus = useCallback(async (force = false) => {
    // Use cache if available and not forced
    if (!force && lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/drive/status");
      console.log(`[useGoogleDrive] status API response: ${response.status} ${response.ok}`);
      
      if (!response.ok) {
        // If Drive is disabled (403), set status to not connected
        if (response.status === 403) {
          console.log("[useGoogleDrive] Drive is disabled (403)");
          setStatus({ connected: false });
          setError("Google Drive is disabled");
          setIsDriveEnabled(false);
          setLastFetched(Date.now());
          setIsLoading(false);
          return;
        }
        throw new Error("Failed to fetch Drive status");
      }

      // If we get here, Drive is enabled
      setIsDriveEnabled(true);
      const data: DriveStatus = await response.json();
      console.log("[useGoogleDrive] Drive is enabled, status:", data.connected);
      setStatus(data);
      setLastFetched(Date.now());

      if (!data.connected && data.message) {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
      setStatus({ connected: false });
    } finally {
      setIsLoading(false);
    }
  }, [lastFetched]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/drive/initialize", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if it's a 400 error (no Drive permissions)
        if (response.status === 400) {
          throw new Error(data.error || "No Drive permissions. Please sign out and sign in again to grant Drive permissions.");
        }
        throw new Error(data.error || "Failed to initialize Drive");
      }

      // Refresh status after initialization
      await fetchStatus(true);

      return { success: true, folderLink: data.folderLink };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to initialize";
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus]);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/drive/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disconnect");
      }

      setStatus({ connected: false });
      setLastFetched(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<DriveSettings>) => {
    setError(null);

    try {
      const response = await fetch("/api/drive/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update settings");
      }

      // Update local state
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              settings: data.settings,
            }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings");
    }
  }, []);

  return {
    isConnected: status?.connected || false,
    isLoading,
    error,
    isDriveEnabled,
    email: status?.email || null,
    quota: status?.quota || null,
    rootFolderId: status?.rootFolderId || null,
    rootFolderLink: status?.rootFolderLink || null,
    settings: status?.settings || null,
    initialize,
    disconnect,
    refreshStatus: () => fetchStatus(true),
    updateSettings,
  };
}
