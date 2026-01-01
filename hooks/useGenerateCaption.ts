"use client";

import { useState, useCallback, useRef } from "react";
import { CaptionGeneratorParams, GenerationMetadata } from "@/types";

interface UseGenerateCaptionReturn {
  generateCaption: (params: CaptionGeneratorParams) => Promise<string>;
  isGenerating: boolean;
  error: string | null;
  lastCaption: string | null;
  lastParams: CaptionGeneratorParams | null;
  metadata: GenerationMetadata | null;
  regenerate: () => Promise<string>;
  reset: () => void;
}

export function useGenerateCaption(): UseGenerateCaptionReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCaption, setLastCaption] = useState<string | null>(null);
  const [lastParams, setLastParams] = useState<CaptionGeneratorParams | null>(null);
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateCaption = useCallback(async (params: CaptionGeneratorParams): Promise<string> => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    setError(null);
    setLastParams(params);

    try {
      const response = await fetch("/api/ai/caption", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate caption");
      }

      const data = await response.json();
      setLastCaption(data.caption);

      // Store metadata from response
      if (data.metadata) {
        setMetadata({
          provider: data.metadata.provider,
          model: data.metadata.model,
          latencyMs: data.metadata.latencyMs,
          inputTokens: data.metadata.usage?.inputTokens || 0,
          outputTokens: data.metadata.usage?.outputTokens || 0,
        });
      }

      return data.caption;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }

      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const regenerate = useCallback(async (): Promise<string> => {
    if (!lastParams) {
      throw new Error("No previous generation parameters");
    }
    return generateCaption(lastParams);
  }, [generateCaption, lastParams]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
    setError(null);
    setLastCaption(null);
    setLastParams(null);
    setMetadata(null);
  }, []);

  return {
    generateCaption,
    isGenerating,
    error,
    lastCaption,
    lastParams,
    metadata,
    regenerate,
    reset,
  };
}
