"use client";

import { useState, useCallback, useRef } from "react";
import { Hashtag, HashtagGeneratorParams, GenerationMetadata } from "@/types";

interface UseGenerateHashtagsReturn {
  generateHashtags: (params: HashtagGeneratorParams) => Promise<Hashtag[]>;
  isGenerating: boolean;
  error: string | null;
  suggestedHashtags: Hashtag[];
  metadata: GenerationMetadata | null;
  selectHashtag: (tag: string) => void;
  deselectHashtag: (tag: string) => void;
  toggleHashtag: (tag: string) => void;
  selectedHashtags: string[];
  clearSelection: () => void;
  reset: () => void;
}

export function useGenerateHashtags(): UseGenerateHashtagsReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedHashtags, setSuggestedHashtags] = useState<Hashtag[]>([]);
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateHashtags = useCallback(async (params: HashtagGeneratorParams): Promise<Hashtag[]> => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/hashtags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate hashtags");
      }

      const data = await response.json();
      const hashtagsWithSelection = data.hashtags.map((h: Hashtag) => ({
        ...h,
        selected: true,
      }));

      setSuggestedHashtags(hashtagsWithSelection);

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

      return hashtagsWithSelection;
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

  const selectHashtag = useCallback((tag: string) => {
    setSuggestedHashtags((prev) =>
      prev.map((h) => (h.tag === tag ? { ...h, selected: true } : h))
    );
  }, []);

  const deselectHashtag = useCallback((tag: string) => {
    setSuggestedHashtags((prev) =>
      prev.map((h) => (h.tag === tag ? { ...h, selected: false } : h))
    );
  }, []);

  const toggleHashtag = useCallback((tag: string) => {
    setSuggestedHashtags((prev) =>
      prev.map((h) => (h.tag === tag ? { ...h, selected: !h.selected } : h))
    );
  }, []);

  const selectedHashtags = suggestedHashtags
    .filter((h) => h.selected)
    .map((h) => h.tag);

  const clearSelection = useCallback(() => {
    setSuggestedHashtags((prev) =>
      prev.map((h) => ({ ...h, selected: false }))
    );
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
    setError(null);
    setSuggestedHashtags([]);
    setMetadata(null);
  }, []);

  return {
    generateHashtags,
    isGenerating,
    error,
    suggestedHashtags,
    metadata,
    selectHashtag,
    deselectHashtag,
    toggleHashtag,
    selectedHashtags,
    clearSelection,
    reset,
  };
}
