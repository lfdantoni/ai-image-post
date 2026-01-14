"use client";

import { useState, useCallback } from "react";
import { clearInstagramConnectionCache } from "./useInstagramConnection";

export type PublishingStep =
  | "idle"
  | "validating"
  | "creating_container"
  | "uploading"
  | "processing"
  | "publishing"
  | "completed"
  | "error";

interface PublishingProgress {
  step: PublishingStep;
  progress: number; // 0-100
  message: string;
  containerStatus?: string;
}

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

interface UsePublishToInstagramReturn {
  isPublishing: boolean;
  progress: PublishingProgress;
  error: PublishError | null;
  result: PublishedResult | null;
  publish: (postId: string, accountId?: string) => Promise<PublishedResult | null>;
  reset: () => void;
}

const STEP_MESSAGES: Record<PublishingStep, string> = {
  idle: "Ready to publish",
  validating: "Validating content...",
  creating_container: "Creating media container...",
  uploading: "Uploading to Instagram...",
  processing: "Processing media...",
  publishing: "Publishing to feed...",
  completed: "Published successfully!",
  error: "Publishing failed",
};

const STEP_PROGRESS: Record<PublishingStep, number> = {
  idle: 0,
  validating: 10,
  creating_container: 25,
  uploading: 40,
  processing: 60,
  publishing: 80,
  completed: 100,
  error: 0,
};

export function usePublishToInstagram(): UsePublishToInstagramReturn {
  const [isPublishing, setIsPublishing] = useState(false);
  const [progress, setProgress] = useState<PublishingProgress>({
    step: "idle",
    progress: 0,
    message: STEP_MESSAGES.idle,
  });
  const [error, setError] = useState<PublishError | null>(null);
  const [result, setResult] = useState<PublishedResult | null>(null);

  const updateProgress = useCallback((step: PublishingStep, containerStatus?: string) => {
    setProgress({
      step,
      progress: STEP_PROGRESS[step],
      message: STEP_MESSAGES[step],
      containerStatus,
    });
  }, []);

  const publish = useCallback(
    async (postId: string, accountId?: string): Promise<PublishedResult | null> => {
      setIsPublishing(true);
      setError(null);
      setResult(null);
      updateProgress("validating");

      try {
        // Start the publishing process
        const response = await fetch("/api/instagram/publish", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ postId, accountId }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Extract error information from the object returned by the API
          const errorData = data.error || {};
          
          const publishError: PublishError = {
            code: errorData.code || data.code || "PUBLISH_ERROR",
            message: typeof errorData === 'string' 
              ? errorData 
              : (errorData.message || data.message || "Failed to publish to Instagram"),
            details: data.details || errorData.details,
            needsReconnect: data.needsReconnect || errorData.needsReconnect,
          };

          // If reconnection is needed, clear the cache
          if (publishError.needsReconnect) {
            clearInstagramConnectionCache();
          }

          setError(publishError);
          updateProgress("error");
          setIsPublishing(false);
          return null;
        }

        // Update progress based on response
        if (data.containerStatus) {
          updateProgress("processing", data.containerStatus);
        }

        // Success!
        const publishedResult: PublishedResult = {
          publishedPostId: data.publishedPostId,
          instagramMediaId: data.instagramMediaId,
          permalink: data.permalink,
          publishedAt: new Date(data.publishedAt),
        };

        setResult(publishedResult);
        updateProgress("completed");

        // Clear Instagram connection cache to refresh rate limit info
        clearInstagramConnectionCache();

        setIsPublishing(false);
        return publishedResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError({
          code: "NETWORK_ERROR",
          message: errorMessage,
        });
        updateProgress("error");
        setIsPublishing(false);
        return null;
      }
    },
    [updateProgress]
  );

  const reset = useCallback(() => {
    setIsPublishing(false);
    setProgress({
      step: "idle",
      progress: 0,
      message: STEP_MESSAGES.idle,
    });
    setError(null);
    setResult(null);
  }, []);

  return {
    isPublishing,
    progress,
    error,
    result,
    publish,
    reset,
  };
}
