"use client";

import { useState } from "react";
import {
  Instagram,
  Check,
  ExternalLink,
  Copy,
  X,
  Plus,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import copyToClipboard from "copy-to-clipboard";

interface PublishedResult {
  publishedPostId: string;
  instagramMediaId: string;
  permalink: string;
  publishedAt: Date;
}

interface PublishError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  needsReconnect?: boolean;
}

interface PublishSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  result: PublishedResult | null;
  error: PublishError | null;
}

export function PublishSuccessModal({
  isOpen,
  onClose,
  onCreateNew,
  result,
  error,
}: PublishSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    if (result?.permalink) {
      copyToClipboard(result.permalink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Publishing Failed
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="text-center mb-6">
              <p className="text-gray-900 font-medium mb-2">
                {error.message}
              </p>
              {error.code && (
                <p className="text-sm text-gray-500">
                  Error code: {error.code}
                </p>
              )}
            </div>

            {error.needsReconnect && (
              <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700 mb-4">
                Your Instagram connection has expired. Please go to Settings to
                reconnect your account.
              </div>
            )}

            {error.details && (
              <details className="text-sm text-gray-500">
                <summary className="cursor-pointer hover:text-gray-700">
                  Technical details
                </summary>
                <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              </details>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {error.needsReconnect && (
              <Button
                onClick={() => (window.location.href = "/settings")}
                className="gap-2"
              >
                Go to Settings
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            Published Successfully!
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-500" />
            </div>
          </div>

          {/* Message */}
          <div className="text-center mb-6">
            <p className="text-gray-600">
              Your post is now live on Instagram
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Published at{" "}
              {new Date(result.publishedAt).toLocaleString("es-ES", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          {/* Link Box */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <Instagram className="w-4 h-4 text-pink-500" />
              <span className="font-medium">Post URL</span>
            </div>

            <div className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
              <span className="flex-1 text-sm text-gray-600 truncate">
                {result.permalink}
              </span>
            </div>

            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className="flex-1 gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy URL
                  </>
                )}
              </Button>
              <a
                href={result.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Instagram
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={onCreateNew}
            className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Plus className="w-4 h-4" />
            Create new post
          </Button>
        </div>
      </div>
    </div>
  );
}
