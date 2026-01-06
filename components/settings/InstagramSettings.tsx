"use client";

import { useState, useEffect } from "react";
import {
  Instagram,
  ExternalLink,
  Check,
  Loader2,
  AlertTriangle,
  Calendar,
  Shield,
  TrendingUp,
  RefreshCw,
  LogOut,
  Link2,
  User,
  Clock,
  Info,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";

interface InstagramSettingsProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function InstagramSettings({ onConnectionChange }: InstagramSettingsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    isConnected,
    isLoading,
    error,
    account,
    rateLimit,
    permissions,
    hasPublishPermission,
    connect,
    disconnect,
    refreshStatus,
    refreshToken,
  } = useInstagramConnection();

  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for URL parameters on mount
  useEffect(() => {
    const success = searchParams.get("instagram_success");
    const errorParam = searchParams.get("instagram_error");

    if (success) {
      setSuccessMessage(decodeURIComponent(success));
      refreshStatus(); // Force status refresh
      // Clear URL params without reloading
      const newUrl = window.location.pathname;
      router.replace(newUrl);
    } else if (errorParam) {
      // hook should handle errors via API status but we can show this one too
      console.error("Instagram error from URL:", errorParam);
    }
  }, [searchParams, refreshStatus, router]);

  const handleConnect = () => {
    connect();
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    await disconnect();
    setIsDisconnecting(false);
    setShowDisconnectConfirm(false);
    onConnectionChange?.(false);
  };

  const handleRefreshToken = async () => {
    setIsRefreshingToken(true);
    const success = await refreshToken();
    setIsRefreshingToken(false);
    if (success) {
      onConnectionChange?.(true);
    }
  };

  // Calculate rate limit percentage
  const rateLimitPercentage = rateLimit
    ? Math.min((rateLimit.used / 25) * 100, 100)
    : 0;

  // Check if token is expiring soon (less than 7 days)
  const isTokenExpiringSoon =
    account?.tokenExpiresAt &&
    new Date(account.tokenExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Format time remaining
  const formatTimeRemaining = (date: Date) => {
    const diff = new Date(date).getTime() - Date.now();
    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} days`;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours} hours`;
  };

  return (
    <div className="space-y-6">
      {/* Success Message from URL */}
      {successMessage && (
        <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-700 animate-in fade-in slide-in-from-top-1">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{successMessage}</p>
        </div>
      )}

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
        ) : isConnected && account ? (
          <div className="space-y-4">
            {/* Connected Info */}
            <div className="flex items-center gap-3">
              {account.profilePicture ? (
                <img
                  src={account.profilePicture}
                  alt={account.username}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Instagram className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  @{account.username}
                  <Check className="w-4 h-4 text-green-500" />
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  {account.accountType.replace("_", " ")} Account
                </p>
              </div>
            </div>

            {/* Account Details */}
            <div className="space-y-2 py-2 px-3 bg-gray-50 rounded-lg">
              {account.facebookPage && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Link2 className="w-4 h-4" />
                  <span>Facebook Page: {account.facebookPage.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Connected: {formatDate(account.connectedAt)}</span>
              </div>
              <div className={cn(
                "flex items-center gap-2 text-sm",
                isTokenExpiringSoon ? "text-amber-600" : "text-gray-600"
              )}>
                <Clock className="w-4 h-4" />
                <span>
                  Token expires: {formatDate(account.tokenExpiresAt)}
                  {isTokenExpiringSoon && " (expiring soon!)"}
                </span>
              </div>
            </div>

            {/* Token Warning */}
            {isTokenExpiringSoon && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Token expiring soon</p>
                  <p className="text-amber-600">
                    Your access token will expire in {formatTimeRemaining(account.tokenExpiresAt)}.
                    Refresh it to maintain publishing access.
                  </p>
                </div>
              </div>
            )}

            {/* Profile Link & Actions */}
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://instagram.com/${account.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                View profile
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshToken}
                disabled={isRefreshingToken}
              >
                {isRefreshingToken ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh Token
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshStatus}
                disabled={isLoading}
              >
                Refresh Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisconnectConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Disconnect
              </Button>
            </div>

            {/* Error Message (for refresh or other actions) */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Instagram className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Not connected</p>
                <p className="text-sm text-gray-500">
                  Connect your Instagram Business or Creator account
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* Requirements Info */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Requirements:</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  Instagram Business or Creator account
                </li>
                <li className="flex items-center gap-2">
                  <Link2 className="w-3 h-3" />
                  Connected to a Facebook Page
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  Publishing permissions enabled
                </li>
              </ul>
              <a
                href="https://help.instagram.com/502981923235522"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
              >
                How to convert to Business account
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <Button onClick={handleConnect} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Instagram className="w-4 h-4 mr-2" />
              Connect Instagram
            </Button>
          </div>
        )}
      </div>

      {/* Publishing Stats (only if connected) */}
      {isConnected && rateLimit && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Publishing Statistics
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Posts today</span>
              <span className="text-gray-900 font-medium">
                {rateLimit.used} / 25
              </span>
            </div>

            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  rateLimitPercentage > 90
                    ? "bg-red-500"
                    : rateLimitPercentage > 70
                    ? "bg-amber-500"
                    : "bg-gradient-to-r from-purple-500 to-pink-500"
                )}
                style={{ width: `${rateLimitPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{rateLimit.remaining} remaining</span>
              <span>
                Resets: {new Date(rateLimit.resetsAt).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Permissions (only if connected) */}
      {isConnected && permissions.length > 0 && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Active Permissions
          </h3>

          <div className="space-y-2">
            {permissions.map((permission) => (
              <div
                key={permission}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <Check className="w-4 h-4 text-green-500" />
                <span>{permission}</span>
              </div>
            ))}
          </div>

          {!hasPublishPermission && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Missing <code className="bg-amber-100 px-1 rounded">instagram_content_publish</code> permission.
                You won&apos;t be able to publish posts until this permission is granted.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Disconnect Instagram?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This will remove the connection to your Instagram account. You won&apos;t
              be able to publish posts until you reconnect. Your published posts will
              remain on Instagram.
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
