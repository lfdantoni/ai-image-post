"use client";

import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthenticatedImage } from "@/components/gallery/AuthenticatedImage";

interface InstagramPostPreviewProps {
  imageUrl: string;
  username: string;
  avatarUrl?: string;
  caption?: string;
  hashtags?: string[];
  likesCount?: number;
  aspectRatio: "portrait" | "square" | "landscape";
  className?: string;
}

const aspectRatioStyles = {
  portrait: "aspect-[4/5]",
  square: "aspect-square",
  landscape: "aspect-[1.91/1]",
};

export function InstagramPostPreview({
  imageUrl,
  username,
  avatarUrl,
  caption = "",
  hashtags = [],
  likesCount = 0,
  aspectRatio = "portrait",
  className,
}: InstagramPostPreviewProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);

  const formattedLikes = likesCount.toLocaleString();
  const hashtagsText = hashtags.length > 0 ? hashtags.map((h) => `#${h}`).join(" ") : "";

  const displayCaption = caption || "";
  const shouldTruncateCaption = displayCaption.length > 100 && !showFullCaption;
  const truncatedCaption = shouldTruncateCaption
    ? displayCaption.slice(0, 100) + "..."
    : displayCaption;

  return (
    <div
      className={cn(
        "bg-white border border-[#dbdbdb] rounded-lg overflow-hidden max-w-[375px] mx-auto shadow-sm",
        "font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#dbdbdb]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#f09433] to-[#bc1888] p-[2px]">
            <div className="w-full h-full rounded-full bg-white p-[1px]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xs text-gray-500">
                    {username[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <span className="text-sm font-semibold text-[#262626]">{username}</span>
        </div>
        <button className="p-1 hover:bg-gray-100 rounded-full">
          <MoreHorizontal className="w-5 h-5 text-[#262626]" />
        </button>
      </div>

      {/* Image */}
      <div className={cn("relative bg-black", aspectRatioStyles[aspectRatio])}>
        <AuthenticatedImage
          src={imageUrl}
          alt="Post preview"
          fill
          className="object-cover"
        />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className="hover:opacity-60 transition-opacity"
          >
            <Heart
              className={cn(
                "w-6 h-6 transition-colors",
                isLiked ? "fill-[#ed4956] text-[#ed4956]" : "text-[#262626]"
              )}
            />
          </button>
          <button className="hover:opacity-60 transition-opacity">
            <MessageCircle className="w-6 h-6 text-[#262626]" />
          </button>
          <button className="hover:opacity-60 transition-opacity">
            <Send className="w-6 h-6 text-[#262626]" />
          </button>
        </div>
        <button
          onClick={() => setIsSaved(!isSaved)}
          className="hover:opacity-60 transition-opacity"
        >
          <Bookmark
            className={cn(
              "w-6 h-6 transition-colors",
              isSaved ? "fill-[#262626] text-[#262626]" : "text-[#262626]"
            )}
          />
        </button>
      </div>

      {/* Likes */}
      <div className="px-3 pb-1">
        <span className="text-sm font-semibold text-[#262626]">
          {formattedLikes} likes
        </span>
      </div>

      {/* Caption */}
      {(displayCaption || hashtagsText) && (
        <div className="px-3 pb-2">
          <div className="text-sm text-[#262626]">
            <span className="font-semibold mr-1">{username}</span>
            <span className="whitespace-pre-wrap">
              {truncatedCaption}
              {shouldTruncateCaption && (
                <button
                  onClick={() => setShowFullCaption(true)}
                  className="text-[#8e8e8e] ml-1"
                >
                  more
                </button>
              )}
            </span>
          </div>
          {hashtagsText && (
            <div className="mt-1">
              <span className="text-sm text-[#00376b]">{hashtagsText}</span>
            </div>
          )}
        </div>
      )}

      {/* Comments link */}
      <div className="px-3 pb-2">
        <button className="text-sm text-[#8e8e8e]">
          View all 50 comments
        </button>
      </div>

      {/* Timestamp */}
      <div className="px-3 pb-3">
        <span className="text-[10px] text-[#8e8e8e] uppercase">2 hours ago</span>
      </div>
    </div>
  );
}
