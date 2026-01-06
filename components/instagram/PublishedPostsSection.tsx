"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Instagram,
  RefreshCw,
  Loader2,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PublishedPostCard } from "./PublishedPostCard";
import { usePublishedPosts } from "@/hooks/usePublishedPosts";

interface PublishedPostsSectionProps {
  limit?: number;
  showViewAll?: boolean;
  onViewDetails?: (postId: string) => void;
  className?: string;
}

export function PublishedPostsSection({
  limit = 6,
  showViewAll = true,
  onViewDetails,
  className,
}: PublishedPostsSectionProps) {
  const router = useRouter();
  const {
    posts,
    isLoading,
    error,
    pagination,
    isSyncing,
    syncPost,
    syncAllPosts,
  } = usePublishedPosts({ limit });

  const [syncResult, setSyncResult] = useState<{
    synced: number;
    failed: number;
  } | null>(null);

  const handleSyncAll = async () => {
    setSyncResult(null);
    const result = await syncAllPosts(7); // Sync posts from last 7 days
    if (result) {
      setSyncResult({ synced: result.synced, failed: result.failed });
      // Clear result after 5 seconds
      setTimeout(() => setSyncResult(null), 5000);
    }
  };

  const handleViewDetails = (postId: string) => {
    if (onViewDetails) {
      onViewDetails(postId);
    } else {
      router.push(`/create-post?publishedPostId=${postId}`);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Instagram className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-medium text-gray-900">
              Published on Instagram
            </h2>
          </div>
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Instagram className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-medium text-gray-900">
              Published on Instagram
            </h2>
          </div>
          <div className="flex items-center gap-2 text-amber-600 py-4">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className={className}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Instagram className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-medium text-gray-900">
              Published on Instagram
            </h2>
          </div>
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <Instagram className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">
              No posts published yet. Create a post and publish it to Instagram!
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-medium text-gray-900">
              Published on Instagram
            </h2>
            {pagination && (
              <span className="text-sm text-gray-500">
                ({pagination.total})
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                Sync All
              </>
            )}
          </Button>
        </div>

        {/* Sync Result Message */}
        {syncResult && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg flex items-center gap-2 text-sm text-green-700">
            <TrendingUp className="w-4 h-4" />
            <span>
              Synced {syncResult.synced} posts
              {syncResult.failed > 0 && ` (${syncResult.failed} failed)`}
            </span>
          </div>
        )}

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.slice(0, limit).map((post) => (
            <PublishedPostCard
              key={post.id}
              id={post.id}
              postId={post.postId}
              permalink={post.permalink}
              mediaType={post.mediaType}
              caption={post.caption}
              hashtags={post.hashtags}
              thumbnail={post.thumbnail}
              metrics={post.metrics}
              publishedAt={post.publishedAt}
              instagramUsername={post.instagramUsername}
              onSync={syncPost}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>

        {/* View All Link */}
        {showViewAll && pagination && pagination.total > limit && (
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => router.push("/published-posts")}
              className="text-gray-600 hover:text-gray-900"
            >
              View all {pagination.total} posts
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
