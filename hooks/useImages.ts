"use client";

import { useState, useCallback, useEffect } from "react";
import type { ImageData, PaginationInfo } from "@/types";

interface UseImagesParams {
  page?: number;
  limit?: number;
  search?: string;
  aiModel?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface UseImagesReturn {
  images: ImageData[];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  loadMore: () => void;
}

export function useImages(params: UseImagesParams = {}): UseImagesReturn {
  const [images, setImages] = useState<ImageData[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(
    async (append = false) => {
      try {
        setIsLoading(true);
        setError(null);

        const searchParams = new URLSearchParams();
        if (params.page) searchParams.set("page", params.page.toString());
        if (params.limit) searchParams.set("limit", params.limit.toString());
        if (params.search) searchParams.set("search", params.search);
        if (params.aiModel) searchParams.set("aiModel", params.aiModel);
        if (params.sortBy) searchParams.set("sortBy", params.sortBy);
        if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

        const response = await fetch(`/api/images?${searchParams.toString()}`);

        if (!response.ok) {
          throw new Error("Error al cargar imágenes");
        }

        const data = await response.json();

        if (append) {
          setImages((prev) => [...prev, ...data.images]);
        } else {
          setImages(data.images);
        }
        setPagination(data.pagination);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [params.page, params.limit, params.search, params.aiModel, params.sortBy, params.sortOrder]
  );

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const refetch = useCallback(() => {
    fetchImages();
  }, [fetchImages]);

  const loadMore = useCallback(() => {
    if (pagination?.hasMore) {
      fetchImages(true);
    }
  }, [pagination?.hasMore, fetchImages]);

  return {
    images,
    pagination,
    isLoading,
    error,
    refetch,
    loadMore,
  };
}
