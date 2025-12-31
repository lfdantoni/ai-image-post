"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AuthenticatedImage } from "@/components/gallery/AuthenticatedImage";
import type { ImageData } from "@/types";

interface ImageCardProps {
  image: ImageData;
}

export function ImageCard({ image }: ImageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Link
      href={`/image/${image.id}`}
      className="group relative aspect-square rounded-lg overflow-hidden
               bg-gray-100 hover:shadow-lg transition-all duration-200"
    >
      <AuthenticatedImage
        src={image.thumbnailUrl || image.secureUrl}
        alt=""
        fill
        className={cn(
          "object-cover transition-all duration-300",
          "group-hover:scale-105",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setIsLoaded(true)}
      />

      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {image.aiModel && (
            <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm
                           rounded text-xs text-white font-medium">
              {image.aiModel}
              {image.aiModelVersion && ` ${image.aiModelVersion}`}
            </span>
          )}
          <p className="mt-1 text-xs text-white/80">
            {formatDistanceToNow(new Date(image.createdAt), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        </div>
      </div>
    </Link>
  );
}
