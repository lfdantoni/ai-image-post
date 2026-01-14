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
  Star,
  Plus,
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
    accounts,
    activeAccount,
    rateLimit,
    permissions,
    hasPublishPermission,
    connect,
    disconnect,
    setDefaultAccount,
    refreshStatus,
    refreshToken,
  } = useInstagramConnection();

  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  const [isRefreshingToken, setIsRefreshingToken] = useState<string | null>(null);
  const [isSettingDefault, setIsSettingDefault] = useState<string | null>(null);
  const [disconnectConfirm, setDisconnectConfirm] = useState<{
    accountId: string;
    username: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for URL parameters on mount
  useEffect(() => {
    const success = searchParams.get("instagram_success");
    const errorParam = searchParams.get("instagram_error");

    if (success) {
      setSuccessMessage(decodeURIComponent(success));
      refreshStatus();
      const newUrl = window.location.pathname;
      router.replace(newUrl);
    } else if (errorParam) {
      console.error("Instagram error from URL:", errorParam);
    }
  }, [searchParams, refreshStatus, router]);

  const handleConnect = () => {
    connect();
  };

  const handleDisconnect = async (accountId: string) => {
    setIsDisconnecting(accountId);
    await disconnect(accountId);
    setIsDisconnecting(null);
    setDisconnectConfirm(null);
    if (accounts.length <= 1) {
      onConnectionChange?.(false);
    }
  };

  const handleSetDefault = async (accountId: string) => {
    setIsSettingDefault(accountId);
    await setDefaultAccount(accountId);
    setIsSettingDefault(null);
  };

  const handleRefreshToken = async (accountId: string) => {
    setIsRefreshingToken(accountId);
    const success = await refreshToken(accountId);
    setIsRefreshingToken(null);
    if (success) {
      onConnectionChange?.(true);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

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

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700 animate-in fade-in slide-in-from-top-1">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Connection Status */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          Connected Accounts
        </h3>

        {isLoading ? (
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Checking connection...</span>
          </div>
        ) : isConnected && accounts.length > 0 ? (
          <div className="space-y-4">
            {/* Accounts List */}
            {accounts.map((account) => {
              const isTokenExpiringSoon = account.token.expiringSoon;
              const isThisRefreshing = isRefreshingToken === account.id;
              const isThisSettingDefault = isSettingDefault === account.id;

              return (
                <div
                  key={account.id}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    account.isDefault
                      ? "border-purple-200 bg-purple-50/50"
                      : "border-gray-200 bg-gray-50/50"
                  )}
                >
                  {/* Account Header */}
                  <div className="flex items-start justify-between">
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
                          {account.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                              <Star className="w-3 h-3" />
                              Default
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">
                          {account.accountType.replace("_", " ")} Account
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="mt-3 space-y-2 py-2 px-3 bg-white/50 rounded-lg">
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
                    <div
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        isTokenExpiringSoon ? "text-amber-600" : "text-gray-600"
                      )}
                    >
                      <Clock className="w-4 h-4" />
                      <span>
                        Token expires: {formatDate(account.token.expiresAt)}
                        {isTokenExpiringSoon && " (expiring soon!)"}
                      </span>
                    </div>
                    {account.rateLimit && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span>
                          Posts today: {account.rateLimit.used}/25 ({account.rateLimit.remaining} remaining)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Token Warning */}
                  {isTokenExpiringSoon && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p>
                        Token expiring in {formatTimeRemaining(account.token.expiresAt)}.
                        Refresh it to maintain publishing access.
                      </p>
                    </div>
                  )}

                  {/* Account Actions */}
                  <div className="mt-3 flex flex-wrap gap-2">
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

                  <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-gray-200/50">
                    {!account.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(account.id)}
                        disabled={isThisSettingDefault}
                      >
                        {isThisSettingDefault ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Setting...
                          </>
                        ) : (
                          <>
                            <Star className="w-4 h-4 mr-1" />
                            Set as Default
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshToken(account.id)}
                      disabled={isThisRefreshing}
                    >
                      {isThisRefreshing ? (
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
                      onClick={() =>
                        setDisconnectConfirm({
                          accountId: account.id,
                          username: account.username,
                        })
                      }
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Connect Another Account Button */}
            <Button
              variant="outline"
              onClick={handleConnect}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Connect Another Account
            </Button>
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

            <Button
              onClick={handleConnect}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Instagram className="w-4 h-4 mr-2" />
              Connect Instagram
            </Button>
          </div>
        )}
      </div>

      {/* Publishing Stats (only if connected) */}
      {isConnected && activeAccount?.rateLimit && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Publishing Statistics ({activeAccount.username})
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Posts today</span>
              <span className="text-gray-900 font-medium">
                {activeAccount.rateLimit.used} / 25
              </span>
            </div>

            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  (activeAccount.rateLimit.used / 25) * 100 > 90
                    ? "bg-red-500"
                    : (activeAccount.rateLimit.used / 25) * 100 > 70
                    ? "bg-amber-500"
                    : "bg-gradient-to-r from-purple-500 to-pink-500"
                )}
                style={{ width: `${Math.min((activeAccount.rateLimit.used / 25) * 100, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{activeAccount.rateLimit.remaining} remaining</span>
              <span>
                Resets: {new Date(activeAccount.rateLimit.resetsAt).toLocaleTimeString("es-ES", {
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
      {disconnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Disconnect @{disconnectConfirm.username}?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This will remove the connection to this Instagram account. You won&apos;t
              be able to publish posts to this account until you reconnect. Published
              posts will remain on Instagram.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDisconnectConfirm(null)}
                disabled={!!isDisconnecting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDisconnect(disconnectConfirm.accountId)}
                disabled={!!isDisconnecting}
              >
                {isDisconnecting === disconnectConfirm.accountId ? (
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
