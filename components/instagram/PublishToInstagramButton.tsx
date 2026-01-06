"use client";

import { useState } from "react";
import { Instagram, Loader2, AlertTriangle, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";

interface PublishToInstagramButtonProps {
  postId: string;
  disabled?: boolean;
  onPublish: () => void;
  className?: string;
  variant?: "default" | "compact";
}

export function PublishToInstagramButton({
  postId,
  disabled = false,
  onPublish,
  className,
  variant = "default",
}: PublishToInstagramButtonProps) {
  const {
    isConnected,
    isLoading,
    account,
    rateLimit,
    hasPublishPermission,
  } = useInstagramConnection();

  // Check if can publish
  const canPublish = isConnected && hasPublishPermission && (rateLimit?.remaining ?? 25) > 0;
  const isRateLimited = rateLimit && rateLimit.remaining <= 0;

  if (isLoading) {
    return (
      <Button disabled className={cn("gap-2", className)}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  // Not connected - show connect prompt
  if (!isConnected) {
    if (variant === "compact") {
      return (
        <Link href="/settings">
          <Button variant="outline" className={cn("gap-2", className)}>
            <Instagram className="w-4 h-4" />
            Connect Instagram
          </Button>
        </Link>
      );
    }

    return (
      <div className={cn("p-4 bg-gray-50 rounded-lg border border-gray-200", className)}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Instagram className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900">
              Publish to Instagram
            </h4>
            <p className="text-sm text-gray-500 mt-0.5">
              Connect your Instagram Business or Creator account to publish directly.
            </p>
            <Link href="/settings">
              <Button size="sm" className="mt-3 gap-2">
                <Settings className="w-4 h-4" />
                Connect in Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Connected but rate limited
  if (isRateLimited) {
    return (
      <div className={cn("p-4 bg-amber-50 rounded-lg border border-amber-200", className)}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-800">
              Daily limit reached
            </h4>
            <p className="text-sm text-amber-600 mt-0.5">
              You&apos;ve published 25 posts today. The limit resets at{" "}
              {rateLimit && new Date(rateLimit.resetsAt).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Connected but missing publish permission
  if (!hasPublishPermission) {
    return (
      <div className={cn("p-4 bg-amber-50 rounded-lg border border-amber-200", className)}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-800">
              Missing publishing permission
            </h4>
            <p className="text-sm text-amber-600 mt-0.5">
              Your account is connected but doesn&apos;t have the publish permission.
              Please reconnect with full permissions.
            </p>
            <Link href="/settings">
              <Button size="sm" variant="outline" className="mt-2">
                Go to Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Ready to publish
  if (variant === "compact") {
    return (
      <Button
        onClick={onPublish}
        disabled={disabled || !canPublish}
        className={cn(
          "gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
          className
        )}
      >
        <Instagram className="w-4 h-4" />
        Publish
      </Button>
    );
  }

  return (
    <div className={cn("p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100", className)}>
      <div className="flex items-start gap-3">
        {account?.profilePicture ? (
          <img
            src={account.profilePicture}
            alt={account.username}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Instagram className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900">
            Publish to Instagram
          </h4>
          <p className="text-sm text-gray-500 mt-0.5">
            Post will be published to @{account?.username}
            {rateLimit && (
              <span className="text-gray-400">
                {" "}• {rateLimit.remaining}/25 posts remaining today
              </span>
            )}
          </p>
          <Button
            onClick={onPublish}
            disabled={disabled || !canPublish}
            size="sm"
            className="mt-3 gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Instagram className="w-4 h-4" />
            Publish now
          </Button>
        </div>
      </div>
    </div>
  );
}
