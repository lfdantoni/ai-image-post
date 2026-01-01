"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Download,
  Cloud,
  Check,
  AlertTriangle,
  Loader2,
  Settings2,
  FileJson,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useImageExport, ExportOptions } from "@/hooks/useImageExport";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";

interface ExportModalProps {
  imageId: string;
  imageUrl: string;
  aspectRatio: string;
  currentCaption?: string;
  currentHashtags?: string[];
  onClose: () => void;
  onExportComplete?: (result: { success: boolean; driveFileUrl?: string }) => void;
  isOpen: boolean;
}

export function ExportModal({
  imageId,
  imageUrl,
  aspectRatio,
  currentCaption,
  currentHashtags,
  onClose,
  onExportComplete,
  isOpen,
}: ExportModalProps) {
  // State
  const [quality, setQuality] = useState(90);
  const [applySharpening, setApplySharpening] = useState(true);
  const [convertToSRGB, setConvertToSRGB] = useState(true);
  const [maxFileSize, setMaxFileSize] = useState(1600000);
  const [includeCaption, setIncludeCaption] = useState(true);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includePrompt, setIncludePrompt] = useState(false);
  const [destination, setDestination] = useState<"download" | "drive">("download");
  const [aiDisclosureChecked, setAiDisclosureChecked] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Hooks
  const { exportSingle, isExporting, downloadFile, estimateFileSize, error: exportError } = useImageExport();
  const { isConnected: isDriveConnected, rootFolderId, isLoading: isDriveLoading, isDriveEnabled, initialize: initializeDrive } = useGoogleDrive();

  // Ensure destination is "download" if Drive is disabled
  useEffect(() => {
    if (!isDriveEnabled && destination === "drive") {
      setDestination("download");
    }
  }, [isDriveEnabled, destination]);

  // Estimate file size when quality changes
  const updateEstimate = useCallback(async () => {
    setIsEstimating(true);
    const result = await estimateFileSize(imageId, quality);
    if (result) {
      setEstimatedSize(result.estimatedSize);
    }
    setIsEstimating(false);
  }, [imageId, quality, estimateFileSize]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(updateEstimate, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, quality, updateEstimate]);

  // Get dimensions text
  const getDimensionsText = () => {
    switch (aspectRatio) {
      case "portrait":
        return "1080 x 1350";
      case "square":
        return "1080 x 1080";
      case "landscape":
        return "1080 x 566";
      case "story":
        return "1080 x 1920";
      default:
        return "1080 x 1350";
    }
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Handle export
  const handleExport = async () => {
    const options: ExportOptions = {
      quality,
      applySharpening,
      maxFileSize,
      includeMetadata,
      destination,
    };

    const result = await exportSingle(imageId, options);

    if (result.success) {
      if (result.file) {
        // Download file
        downloadFile(result.file.data, result.file.name, "image/jpeg");
      }

      onExportComplete?.({
        success: true,
        driveFileUrl: result.driveFile?.webViewLink,
      });

      onClose();
    }
  };

  const sizeWithinLimit = estimatedSize ? estimatedSize <= maxFileSize : true;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Image" size="lg">
      <div className="p-6 space-y-6">
        {/* Preview and Config */}
        <div className="flex gap-6">
          {/* Image Preview */}
          <div className="flex-shrink-0">
            <div className="relative w-40 h-48 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={imageUrl}
                alt="Export preview"
                fill
                className="object-cover"
              />
            </div>
            <p className="text-xs text-center text-gray-500 mt-2">
              {getDimensionsText()} px
            </p>
          </div>

          {/* Export Settings */}
          <div className="flex-1 space-y-4">
            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Format
              </label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                JPEG optimized for Instagram
              </div>
            </div>

            {/* Quality Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Quality</label>
                <span className="text-sm font-medium text-gray-900">{quality}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Estimated Size */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Estimated size:</span>
              <span
                className={cn(
                  "font-medium",
                  isEstimating && "opacity-50",
                  estimatedSize && !sizeWithinLimit && "text-amber-600"
                )}
              >
                {isEstimating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : estimatedSize ? (
                  <>
                    {formatBytes(estimatedSize)}
                    {sizeWithinLimit ? (
                      <Check className="w-4 h-4 text-green-500 inline ml-1" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 inline ml-1" />
                    )}
                  </>
                ) : (
                  "-"
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Optimizations */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <Settings2 className="w-4 h-4 inline mr-1" />
            Optimizations
          </label>
          <div className="space-y-2 pl-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applySharpening}
                onChange={(e) => setApplySharpening(e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Apply sharpening for Instagram
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={convertToSRGB}
                onChange={(e) => setConvertToSRGB(e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Convert to sRGB</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={maxFileSize === 1600000}
                onChange={(e) => setMaxFileSize(e.target.checked ? 1600000 : 10000000)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Limit to 1.6MB (prevents IG recompression)
              </span>
            </label>
          </div>
        </div>

        {/* Include in Export */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <FileJson className="w-4 h-4 inline mr-1" />
            Include in export
          </label>
          <div className="space-y-2 pl-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCaption}
                onChange={(e) => setIncludeCaption(e.target.checked)}
                disabled={!currentCaption}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className={cn("text-sm", !currentCaption && "text-gray-400")}>
                Caption {!currentCaption && "(not set)"}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeHashtags}
                onChange={(e) => setIncludeHashtags(e.target.checked)}
                disabled={!currentHashtags?.length}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className={cn("text-sm", !currentHashtags?.length && "text-gray-400")}>
                Hashtags {!currentHashtags?.length && "(none)"}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Metadata JSON file</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includePrompt}
                onChange={(e) => setIncludePrompt(e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Original prompt (visible in metadata)
              </span>
            </label>
          </div>
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Destination</label>
          <div className="space-y-2">
            <label
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                destination === "download"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <input
                type="radio"
                name="destination"
                value="download"
                checked={destination === "download"}
                onChange={() => setDestination("download")}
                className="text-blue-500 focus:ring-blue-500"
              />
              <Download className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium">Download to device</span>
            </label>
            {/* Only show Drive option if Drive is enabled */}
            {isDriveEnabled && (
              <div className="space-y-2">
                <label
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    destination === "drive"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300",
                    !isDriveConnected && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <input
                    type="radio"
                    name="destination"
                    value="drive"
                    checked={destination === "drive"}
                    onChange={() => setDestination("drive")}
                    disabled={!isDriveConnected}
                    className="text-blue-500 focus:ring-blue-500"
                  />
                  <Cloud className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">Save to Google Drive</span>
                    {isDriveLoading ? (
                      <p className="text-xs text-gray-500">Checking connection...</p>
                    ) : isDriveConnected ? (
                      <p className="text-xs text-gray-500">
                        /AIImagePost/Exports/{new Date().toISOString().slice(0, 7)}/
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600">Not connected</p>
                    )}
                  </div>
                </label>
                {!isDriveConnected && !isDriveLoading && (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setDriveError(null);
                        const result = await initializeDrive();
                        if (!result.success && result.error) {
                          setDriveError(result.error);
                        }
                      }}
                      className="w-full"
                    >
                      <Cloud className="w-4 h-4 mr-2" />
                      Connect Google Drive
                    </Button>
                    {driveError && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-2">
                        <p className="font-medium">{driveError}</p>
                        <div className="bg-white/50 rounded p-2 mt-2 space-y-1">
                          <p className="font-semibold text-amber-900">Solution:</p>
                          <p className="text-amber-700">
                            Google is reusing your previous permissions. You need to revoke access first, then sign in again.
                          </p>
                          <ol className="list-decimal list-inside space-y-1 text-amber-700 ml-2 mt-1">
                            <li>
                              <a
                                href="https://myaccount.google.com/permissions"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline font-medium"
                              >
                                Click here to revoke app access
                              </a>
                            </li>
                            <li>Find "AIGram" or your app and click "Remove access"</li>
                            <li>Come back and sign out, then sign in again</li>
                          </ol>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <a
                            href="https://myaccount.google.com/permissions"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 rounded text-xs font-medium text-amber-900 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Revoke Access
                          </a>
                          <a
                            href="/api/auth/signout?callbackUrl=/login"
                            className="inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                          >
                            Sign Out
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* AI Disclosure */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-amber-800">AI Disclosure</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiDisclosureChecked}
                  onChange={(e) => setAiDisclosureChecked(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-amber-700">
                  I will mark this as "Made with AI" when publishing
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Error */}
        {exportError && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
            {exportError}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
        <Button variant="outline" onClick={onClose} disabled={isExporting}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          disabled={isExporting || !aiDisclosureChecked}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : destination === "download" ? (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download
            </>
          ) : (
            <>
              <Cloud className="w-4 h-4 mr-2" />
              Export to Drive
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}
