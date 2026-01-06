"use client";

import { useState, useEffect, useCallback } from "react";

interface PostMetrics {
  likes: number;
  comments: number;
  reach: number | null;
  impressions: number | null;
  saved: number | null;
  updatedAt: Date | null;
}

interface PostThumbnail {
  url?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

interface PublishedPost {
  id: string;
  postId: string | null;
  instagramMediaId: string;
  permalink: string;
  mediaType: string;
  caption: string | null;
  hashtags: string[];
  thumbnail: PostThumbnail | null;
  metrics: PostMetrics;
  publishedAt: Date;
  createdAt: Date;
  instagramUsername: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

type SortBy = "publishedAt" | "likes" | "comments";
type SortOrder = "asc" | "desc";

interface FetchOptions {
  page?: number;
  limit?: number;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}

interface SyncResult {
  synced: number;
  failed: number;
  total: number;
  errors?: Array<{ postId: string; error: string }>;
}

interface UsePublishedPostsReturn {
  posts: PublishedPost[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationInfo | null;
  sortBy: SortBy;
  sortOrder: SortOrder;
  // Actions
  fetchPosts: (options?: FetchOptions) => Promise<void>;
  loadMore: () => Promise<void>;
  setSorting: (sortBy: SortBy, sortOrder?: SortOrder) => void;
  // Sync actions
  isSyncing: boolean;
  syncPost: (postId: string) => Promise<boolean>;
  syncAllPosts: (days?: number) => Promise<SyncResult | null>;
  // Single post
  getPost: (postId: string) => Promise<PublishedPost | null>;
}

export function usePublishedPosts(initialOptions?: FetchOptions): UsePublishedPostsReturn {
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>(initialOptions?.sortBy || "publishedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialOptions?.sortOrder || "desc");
  const [isSyncing, setIsSyncing] = useState(false);

  const transformPost = (data: Record<string, unknown>): PublishedPost => ({
    id: data.id as string,
    postId: data.postId as string | null,
    instagramMediaId: data.instagramMediaId as string,
    permalink: data.permalink as string,
    mediaType: data.mediaType as string,
    caption: data.caption as string | null,
    hashtags: (data.hashtags as string[]) || [],
    thumbnail: data.thumbnail as PostThumbnail | null,
    metrics: {
      likes: (data.metrics as Record<string, unknown>)?.likes as number || 0,
      comments: (data.metrics as Record<string, unknown>)?.comments as number || 0,
      reach: (data.metrics as Record<string, unknown>)?.reach as number | null,
      impressions: (data.metrics as Record<string, unknown>)?.impressions as number | null,
      saved: (data.metrics as Record<string, unknown>)?.saved as number | null,
      updatedAt: (data.metrics as Record<string, unknown>)?.updatedAt
        ? new Date((data.metrics as Record<string, unknown>).updatedAt as string)
        : null,
    },
    publishedAt: new Date(data.publishedAt as string),
    createdAt: new Date(data.createdAt as string),
    instagramUsername: data.instagramUsername as string | null,
  });

  const fetchPosts = useCallback(
    async (options?: FetchOptions) => {
      setIsLoading(true);
      setError(null);

      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const currentSortBy = options?.sortBy || sortBy;
      const currentSortOrder = options?.sortOrder || sortOrder;

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          sortBy: currentSortBy,
          sortOrder: currentSortOrder,
        });

        const response = await fetch(`/api/instagram/posts?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch posts");
        }

        const transformedPosts = (data.posts as Record<string, unknown>[]).map(transformPost);

        // If it's page 1, replace posts; otherwise append
        if (page === 1) {
          setPosts(transformedPosts);
        } else {
          setPosts((prev) => [...prev, ...transformedPosts]);
        }

        setPagination(data.pagination);

        // Update sort state if changed
        if (options?.sortBy && options.sortBy !== sortBy) {
          setSortBy(options.sortBy);
        }
        if (options?.sortOrder && options.sortOrder !== sortOrder) {
          setSortOrder(options.sortOrder);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [sortBy, sortOrder]
  );

  const loadMore = useCallback(async () => {
    if (!pagination?.hasMore || isLoading) return;

    await fetchPosts({
      page: pagination.page + 1,
      limit: pagination.limit,
      sortBy,
      sortOrder,
    });
  }, [pagination, isLoading, fetchPosts, sortBy, sortOrder]);

  const setSorting = useCallback(
    (newSortBy: SortBy, newSortOrder?: SortOrder) => {
      const order = newSortOrder || (newSortBy === sortBy && sortOrder === "desc" ? "asc" : "desc");
      setSortBy(newSortBy);
      setSortOrder(order);
      fetchPosts({ page: 1, sortBy: newSortBy, sortOrder: order });
    },
    [sortBy, sortOrder, fetchPosts]
  );

  const syncPost = useCallback(async (postId: string): Promise<boolean> => {
    setIsSyncing(true);

    try {
      const response = await fetch(`/api/instagram/posts/${postId}/sync`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync post");
      }

      // Update the post in the local state with new metrics
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                metrics: {
                  likes: data.metrics.likes,
                  comments: data.metrics.comments,
                  reach: data.metrics.reach,
                  impressions: data.metrics.impressions,
                  saved: data.metrics.saved,
                  updatedAt: new Date(data.metrics.updatedAt),
                },
              }
            : post
        )
      );

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const syncAllPosts = useCallback(
    async (days = 7): Promise<SyncResult | null> => {
      setIsSyncing(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          days: days.toString(),
        });

        const response = await fetch(`/api/instagram/posts/sync-all?${params}`, {
          method: "POST",
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.needsReconnect) {
            setError("Instagram access token has expired. Please reconnect your account.");
          } else {
            throw new Error(data.error || "Failed to sync posts");
          }
          return null;
        }

        // Refresh posts list to show updated metrics
        await fetchPosts({ page: 1, sortBy, sortOrder });

        return {
          synced: data.synced,
          failed: data.failed,
          total: data.total,
          errors: data.errors,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [fetchPosts, sortBy, sortOrder]
  );

  const getPost = useCallback(async (postId: string): Promise<PublishedPost | null> => {
    try {
      const response = await fetch(`/api/instagram/posts/${postId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch post");
      }

      return {
        id: data.id,
        postId: data.postId,
        instagramMediaId: data.instagramMediaId,
        permalink: data.permalink,
        mediaType: data.mediaType,
        caption: data.caption,
        hashtags: data.hashtags || [],
        thumbnail: data.images?.[0] || null,
        metrics: {
          likes: data.metrics.likes,
          comments: data.metrics.comments,
          reach: data.metrics.reach,
          impressions: data.metrics.impressions,
          saved: data.metrics.saved,
          updatedAt: data.metrics.updatedAt ? new Date(data.metrics.updatedAt) : null,
        },
        publishedAt: new Date(data.publishedAt),
        createdAt: new Date(data.createdAt),
        instagramUsername: data.account?.username || null,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      return null;
    }
  }, []);

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts({
      page: initialOptions?.page || 1,
      limit: initialOptions?.limit || 20,
      sortBy: initialOptions?.sortBy || "publishedAt",
      sortOrder: initialOptions?.sortOrder || "desc",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    posts,
    isLoading,
    error,
    pagination,
    sortBy,
    sortOrder,
    fetchPosts,
    loadMore,
    setSorting,
    isSyncing,
    syncPost,
    syncAllPosts,
    getPost,
  };
}
