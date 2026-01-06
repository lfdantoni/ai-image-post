"use client";

import { useState } from "react";
import {
  Instagram,
  ExternalLink,
  Heart,
  MessageCircle,
  Eye,
  Bookmark,
  RefreshCw,
  Loader2,
  Images,
  MoreHorizontal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AuthenticatedImage } from "@/components/gallery/AuthenticatedImage";

interface PublishedPostMetrics {
  likes: number;
  comments: number;
  reach: number | null;
  impressions: number | null;
  saved: number | null;
  updatedAt: Date | null;
}

interface PublishedPostCardProps {
  id: string;
  postId: string | null;
  permalink: string;
  mediaType: string;
  caption: string | null;
  hashtags: string[];
  thumbnail: {
    url?: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
  } | null;
  metrics: PublishedPostMetrics;
  publishedAt: Date;
  instagramUsername: string | null;
  onSync?: (postId: string) => Promise<boolean>;
  onViewDetails?: (postId: string) => void;
  className?: string;
}

export function PublishedPostCard({
  id,
  postId,
  permalink,
  mediaType,
  caption,
  hashtags,
  thumbnail,
  metrics,
  publishedAt,
  instagramUsername,
  onSync,
  onViewDetails,
  className,
}: PublishedPostCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSync) return;
    setIsSyncing(true);
    await onSync(id);
    setIsSyncing(false);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const isCarousel = mediaType === "CAROUSEL_ALBUM" || mediaType === "CAROUSEL";

  return (
    <div
      className={cn(
        "border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors bg-white",
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-gray-100">
        {thumbnail?.thumbnailUrl || thumbnail?.url ? (
          <AuthenticatedImage
            src={thumbnail.thumbnailUrl || thumbnail.url || ""}
            alt={caption || "Published post"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Instagram className="w-8 h-8 text-gray-300" />
          </div>
        )}

        {/* Carousel indicator */}
        {isCarousel && (
          <div className="absolute top-2 right-2 bg-black/60 rounded-md px-1.5 py-0.5 flex items-center gap-1">
            <Images className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Published badge */}
        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
          <Instagram className="w-3 h-3" />
          Published
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Metrics */}
        <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-red-500" />
            {formatNumber(metrics.likes)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            {formatNumber(metrics.comments)}
          </span>
          {metrics.reach !== null && (
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4 text-purple-500" />
              {formatNumber(metrics.reach)}
            </span>
          )}
          {metrics.saved !== null && metrics.saved > 0 && (
            <span className="flex items-center gap-1">
              <Bookmark className="w-4 h-4 text-amber-500" />
              {formatNumber(metrics.saved)}
            </span>
          )}
        </div>

        {/* Caption preview */}
        {caption && (
          <p className="text-sm text-gray-700 line-clamp-2 mb-2">{caption}</p>
        )}

        {/* Date and username */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>
            {formatDistanceToNow(new Date(publishedAt), {
              addSuffix: true,
              locale: es,
            })}
          </span>
          {instagramUsername && (
            <span className="flex items-center gap-1">
              <Instagram className="w-3 h-3" />
              @{instagramUsername}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails?.(id)}
          >
            View details
          </Button>
          <a
            href={permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
          {onSync && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="flex-shrink-0"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {/* Last sync info */}
        {metrics.updatedAt && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            Metrics synced{" "}
            {formatDistanceToNow(new Date(metrics.updatedAt), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        )}
      </div>
    </div>
  );
}
