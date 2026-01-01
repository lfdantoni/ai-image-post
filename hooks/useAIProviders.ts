"use client";

import { useState, useEffect, useCallback } from "react";
import { AIProvider, ProviderInfo } from "@/types/ai-providers";

interface UseAIProvidersReturn {
  providers: ProviderInfo[];
  defaultProvider: AIProvider;
  isLoading: boolean;
  error: string | null;
  availableProviders: ProviderInfo[];
  isProviderAvailable: (provider: AIProvider) => boolean;
  getProviderInfo: (provider: AIProvider) => ProviderInfo | undefined;
  refetch: () => Promise<void>;
}

export function useAIProviders(): UseAIProvidersReturn {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultProvider, setDefaultProvider] = useState<AIProvider>("gemini");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/providers");
      if (!response.ok) {
        throw new Error("Failed to fetch providers");
      }

      const data = await response.json();
      setProviders(data.providers || []);
      setDefaultProvider(data.defaultProvider || "gemini");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch providers";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const availableProviders = providers.filter((p) => p.isAvailable);

  const isProviderAvailable = useCallback(
    (provider: AIProvider) => {
      const info = providers.find((p) => p.name === provider);
      return info?.isAvailable || false;
    },
    [providers]
  );

  const getProviderInfo = useCallback(
    (provider: AIProvider) => {
      return providers.find((p) => p.name === provider);
    },
    [providers]
  );

  return {
    providers,
    defaultProvider,
    isLoading,
    error,
    availableProviders,
    isProviderAvailable,
    getProviderInfo,
    refetch: fetchProviders,
  };
}
