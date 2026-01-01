"use client";

import { useState, useEffect } from "react";
import {
  Cloud,
  CloudOff,
  ExternalLink,
  Check,
  Loader2,
  HardDrive,
  FolderSync,
  FileJson,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useGoogleDrive, DriveSettings as DriveSettingsType } from "@/hooks/useGoogleDrive";

interface DriveSettingsProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function DriveSettings({ onConnectionChange }: DriveSettingsProps) {
  const {
    isConnected,
    isLoading,
    error,
    isDriveEnabled,
    email,
    quota,
    rootFolderId,
    rootFolderLink,
    settings,
    initialize,
    disconnect,
    refreshStatus,
    updateSettings,
  } = useGoogleDrive();

  const [isInitializing, setIsInitializing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const handleInitialize = async () => {
    setIsInitializing(true);
    const result = await initialize();
    setIsInitializing(false);

    if (result.success) {
      onConnectionChange?.(true);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    await disconnect();
    setIsDisconnecting(false);
    setShowDisconnectConfirm(false);
    onConnectionChange?.(false);
  };

  const handleSettingChange = async (key: keyof DriveSettingsType, value: boolean | string) => {
    await updateSettings({ [key]: value });
  };

  // Calculate quota percentage
  const quotaPercentage = quota && quota.total > 0
    ? Math.min((quota.used / quota.total) * 100, 100)
    : 0;

  // Don't render if Drive is disabled
  if (!isDriveEnabled) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          Connection Status
        </h3>

        {isLoading ? (
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Checking connection...</span>
          </div>
        ) : isConnected ? (
          <div className="space-y-4">
            {/* Connected Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  Connected
                  <Check className="w-4 h-4 text-green-500" />
                </p>
                <p className="text-sm text-gray-500">{email}</p>
              </div>
            </div>

            {/* Folder Link */}
            {rootFolderLink && (
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <HardDrive className="w-4 h-4" />
                  <span>/Mi Drive/AIImagePost</span>
                </div>
                <a
                  href={rootFolderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                >
                  Open in Drive
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Storage Quota */}
            {quota && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Storage used</span>
                  <span className="text-gray-900">
                    {quota.usedFormatted} of {quota.totalFormatted}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      quotaPercentage > 90 ? "bg-red-500" :
                      quotaPercentage > 70 ? "bg-amber-500" : "bg-blue-500"
                    )}
                    style={{ width: `${quotaPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisconnectConfirm(true)}
              >
                <CloudOff className="w-4 h-4 mr-1" />
                Disconnect
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshStatus}
                disabled={isLoading}
              >
                Refresh
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <CloudOff className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Not connected</p>
                <p className="text-sm text-gray-500">
                  Connect your Google Drive to export images
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <Button onClick={handleInitialize} disabled={isInitializing}>
              {isInitializing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 mr-2" />
                  Connect Google Drive
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500">
              This will create an "AIImagePost" folder in your Google Drive
            </p>
          </div>
        )}
      </div>

      {/* Sync Settings (only if connected) */}
      {isConnected && settings && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            Sync Settings
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <FolderSync className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  Auto-sync when exporting
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSyncOnExport}
                onChange={(e) => handleSettingChange("autoSyncOnExport", e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  Backup original images
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.backupOriginals}
                onChange={(e) => handleSettingChange("backupOriginals", e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  Include metadata JSON
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.includeMetadataJson}
                onChange={(e) => handleSettingChange("includeMetadataJson", e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
            </label>

            <div className="pt-2 border-t border-gray-100">
              <label className="block text-sm text-gray-700 mb-2">
                Folder organization
              </label>
              <select
                value={settings.folderOrganization}
                onChange={(e) => handleSettingChange("folderOrganization", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">By date (2025-01, 2025-02, ...)</option>
                <option value="project">By project</option>
                <option value="flat">Single folder</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Disconnect Google Drive?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This will remove the connection to your Drive. Your files in Drive
              will remain intact, but you won&apos;t be able to export directly to
              Drive until you reconnect.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDisconnectConfirm(false)}
                disabled={isDisconnecting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  "Disconnect"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
