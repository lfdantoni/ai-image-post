"use client";

import { useState, useEffect } from "react";
import {
  Instagram,
  ExternalLink,
  Copy,
  Check,
  Heart,
  MessageCircle,
  Eye,
  Bookmark,
  TrendingUp,
  RefreshCw,
  Loader2,
  Calendar,
  Download,
  Link as LinkIcon,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import copyToClipboard from "copy-to-clipboard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AuthenticatedImage } from "@/components/gallery/AuthenticatedImage";
import { InstagramPostPreview } from "@/components/preview/InstagramPostPreview";
import { CarouselPreview } from "@/components/preview/CarouselPreview";
import { usePublishedPosts } from "@/hooks/usePublishedPosts";

interface PublishedPostDetailProps {
  postId: string;
  onClose?: () => void;
}

export function PublishedPostDetail({ postId, onClose }: PublishedPostDetailProps) {
  const { getPost, syncPost, isSyncing } = usePublishedPosts();
  const [post, setPost] = useState<Awaited<ReturnType<typeof getPost>>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [viewMode, setViewMode] = useState<"feed" | "carousel">("feed");

  useEffect(() => {
    const loadPost = async () => {
      setIsLoading(true);
      setError(null);
      const loadedPost = await getPost(postId);
      if (loadedPost) {
        setPost(loadedPost);
      } else {
        setError("Failed to load post details");
      }
      setIsLoading(false);
    };

    loadPost();
  }, [postId, getPost]);

  const handleCopyUrl = () => {
    if (post?.permalink) {
      copyToClipboard(post.permalink);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleCopyCaption = () => {
    if (post?.caption) {
      const hashtagsText = post.hashtags.length > 0
        ? "\n\n" + post.hashtags.map((h) => `#${h}`).join(" ")
        : "";
      copyToClipboard(post.caption + hashtagsText);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    }
  };

  const handleSync = async () => {
    const success = await syncPost(postId);
    if (success) {
      // Reload the post to get updated metrics
      const updatedPost = await getPost(postId);
      if (updatedPost) {
        setPost(updatedPost);
      }
    }
  };

  const formatNumber = (num: number | null): string => {
    if (num === null) return "-";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Instagram className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500">{error || "Post not found"}</p>
        {onClose && (
          <Button variant="outline" onClick={onClose} className="mt-4">
            Go back
          </Button>
        )}
      </div>
    );
  }

  const isCarousel = post.mediaType === "CAROUSEL_ALBUM" || post.mediaType === "CAROUSEL";

  return (
    <div className="space-y-6">
      {/* Published Status Banner */}
      <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">Published on Instagram</p>
              <p className="text-sm text-green-600">
                {format(new Date(post.publishedAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Open in Instagram
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
              className="gap-2"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy URL
                </>
              )}
            </Button>
          </div>
        </div>

        {/* URL Display */}
        <div className="mt-3 flex items-center gap-2 p-2 bg-white/60 rounded-lg">
          <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-600 truncate">{post.permalink}</span>
        </div>
      </Card>

      {/* Metrics Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            Post Metrics
          </h3>
          <div className="flex items-center gap-2">
            {post.metrics.updatedAt && (
              <span className="text-xs text-gray-500">
                Updated {formatDistanceToNow(new Date(post.metrics.updatedAt), { addSuffix: true, locale: es })}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{formatNumber(post.metrics.likes)}</p>
            <p className="text-xs text-gray-500">Likes</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <MessageCircle className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{formatNumber(post.metrics.comments)}</p>
            <p className="text-xs text-gray-500">Comments</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <Eye className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{formatNumber(post.metrics.reach)}</p>
            <p className="text-xs text-gray-500">Reach</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{formatNumber(post.metrics.impressions)}</p>
            <p className="text-xs text-gray-500">Impressions</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Bookmark className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{formatNumber(post.metrics.saved)}</p>
            <p className="text-xs text-gray-500">Saved</p>
          </div>
        </div>
      </Card>

      {/* Content Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            {isCarousel && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "feed" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("feed")}
                >
                  Feed
                </Button>
                <Button
                  variant={viewMode === "carousel" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("carousel")}
                >
                  Carousel
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            {post.thumbnail && (
              viewMode === "feed" || !isCarousel ? (
                <InstagramPostPreview
                  imageUrl={post.thumbnail.thumbnailUrl || post.thumbnail.url || ""}
                  username={post.instagramUsername || "your_username"}
                  caption={post.caption || ""}
                  hashtags={post.hashtags}
                  likesCount={post.metrics.likes}
                  aspectRatio="portrait"
                />
              ) : (
                <CarouselPreview
                  slides={[{ id: post.id, imageUrl: post.thumbnail.thumbnailUrl || post.thumbnail.url || "" }]}
                  username={post.instagramUsername || "your_username"}
                  caption={post.caption || ""}
                  hashtags={post.hashtags}
                  likesCount={post.metrics.likes}
                  aspectRatio="portrait"
                />
              )
            )}
          </div>
        </Card>

        {/* Caption & Hashtags */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Published Caption</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCaption}
                disabled={!post.caption}
              >
                {copiedCaption ? (
                  <>
                    <Check className="w-4 h-4 mr-1 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              {post.caption ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.caption}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No caption</p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">
              Published Hashtags ({post.hashtags.length})
            </h3>
            {post.hashtags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {post.hashtags.map((hashtag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                  >
                    #{hashtag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No hashtags</p>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Post Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Media ID</span>
                <span className="text-gray-700 font-mono text-xs">{post.instagramMediaId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="text-gray-700">{post.mediaType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Published</span>
                <span className="text-gray-700">
                  {format(new Date(post.publishedAt), "dd/MM/yyyy HH:mm")}
                </span>
              </div>
              {post.instagramUsername && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Account</span>
                  <span className="text-gray-700">@{post.instagramUsername}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
