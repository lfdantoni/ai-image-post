"use client";

import { useState, useCallback } from "react";
import type { UploadMetadata } from "@/types";

interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: Blob, metadata: UploadMetadata): Promise<UploadResult | null> => {
      setIsUploading(true);
      setError(null);
      setProgress({ loaded: 0, total: 100, percentage: 0 });

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("metadata", JSON.stringify(metadata));

        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (!prev || prev.percentage >= 90) return prev;
            return {
              ...prev,
              percentage: prev.percentage + 10,
              loaded: (prev.percentage + 10) * 10,
            };
          });
        }, 200);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Error al subir imagen");
        }

        setProgress({ loaded: 100, total: 100, percentage: 100 });

        const data = await response.json();
        return data.image;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        setError(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    upload,
    isUploading,
    progress,
    error,
    reset,
  };
}
