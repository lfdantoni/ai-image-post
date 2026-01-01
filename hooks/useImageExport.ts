"use client";

import { useState, useCallback, useRef } from "react";

export interface ExportOptions {
  quality: number;
  applySharpening: boolean;
  maxFileSize: number;
  includeMetadata: boolean;
  destination: "download" | "drive";
  driveFolderId?: string;
}

export interface BatchExportOptions {
  quality: number;
  applySharpening: boolean;
  namingPattern: "original" | "sequential" | "date-id";
  includeMetadata: boolean;
  includeIndex: boolean;
  destination: "zip" | "drive";
  driveFolderId?: string;
}

export interface ExportProgress {
  current: number;
  total: number;
  currentFile: string;
}

export interface ExportResult {
  success: boolean;
  file?: {
    name: string;
    data: string;
    size: number;
  };
  driveFile?: {
    id: string;
    name: string;
    webViewLink: string;
    size: number;
  };
  metadata?: object;
  error?: string;
}

export interface BatchExportResult {
  success: boolean;
  zipFile?: {
    name: string;
    data: string;
    size: number;
    fileCount: number;
  };
  folder?: {
    id: string;
    name: string;
    webViewLink: string;
  };
  files?: Array<{
    id: string;
    name: string;
    webViewLink: string;
  }>;
  error?: string;
}

interface UseImageExportReturn {
  // State
  isExporting: boolean;
  progress: ExportProgress | null;
  error: string | null;

  // Actions
  exportSingle: (imageId: string, options: ExportOptions) => Promise<ExportResult>;
  exportBatch: (imageIds: string[], options: BatchExportOptions) => Promise<BatchExportResult>;
  downloadFile: (data: string, filename: string, mimeType: string) => void;
  estimateFileSize: (imageId: string, quality: number) => Promise<{
    estimatedSize: number;
    estimatedSizeFormatted: string;
    withinLimit: boolean;
    optimalQuality: number;
  } | null>;
  cancel: () => void;
}

export function useImageExport(): UseImageExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const exportSingle = useCallback(async (
    imageId: string,
    options: ExportOptions
  ): Promise<ExportResult> => {
    setIsExporting(true);
    setError(null);
    setProgress({ current: 0, total: 1, currentFile: "Processing..." });

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/export/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, options }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Export failed");
      }

      setProgress({ current: 1, total: 1, currentFile: "Complete" });

      return {
        success: true,
        file: data.file,
        driveFile: data.driveFile,
        metadata: data.metadata,
      };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { success: false, error: "Export cancelled" };
      }
      const message = err instanceof Error ? err.message : "Export failed";
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsExporting(false);
      setProgress(null);
      abortControllerRef.current = null;
    }
  }, []);

  const exportBatch = useCallback(async (
    imageIds: string[],
    options: BatchExportOptions
  ): Promise<BatchExportResult> => {
    setIsExporting(true);
    setError(null);
    setProgress({ current: 0, total: imageIds.length, currentFile: "Starting..." });

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/export/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds, options }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Batch export failed");
      }

      setProgress({ current: imageIds.length, total: imageIds.length, currentFile: "Complete" });

      return {
        success: true,
        zipFile: data.zipFile,
        folder: data.folder,
        files: data.files,
      };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { success: false, error: "Export cancelled" };
      }
      const message = err instanceof Error ? err.message : "Batch export failed";
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsExporting(false);
      setProgress(null);
      abortControllerRef.current = null;
    }
  }, []);

  const downloadFile = useCallback((data: string, filename: string, mimeType: string) => {
    // Convert base64 to blob
    const byteCharacters = atob(data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const estimateFileSize = useCallback(async (
    imageId: string,
    quality: number
  ) => {
    try {
      const response = await fetch("/api/export/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, quality }),
      });

      if (!response.ok) {
        return null;
      }

      return response.json();
    } catch {
      return null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    isExporting,
    progress,
    error,
    exportSingle,
    exportBatch,
    downloadFile,
    estimateFileSize,
    cancel,
  };
}
