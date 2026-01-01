"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Images, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthenticatedImage } from "@/components/gallery/AuthenticatedImage";
import type { ImageData } from "@/types";

interface ImageGridProps {
  images: ImageData[];
  isLoading?: boolean;
  selectionMode?: boolean;
  selectedImages?: string[];
  onImageSelect?: (imageId: string) => void;
  maxSelection?: number;
}

export function ImageGrid({
  images,
  isLoading,
  selectionMode = false,
  selectedImages = [],
  onImageSelect,
  maxSelection = 20,
}: ImageGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Images className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No hay imágenes</h3>
        <p className="mt-1 text-sm text-gray-500">
          Sube tu primera imagen para comenzar
        </p>
        <Link href="/upload" className="mt-4">
          <Button>Subir imagen</Button>
        </Link>
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent, imageId: string) => {
    if (selectionMode && onImageSelect) {
      e.preventDefault();
      const isSelected = selectedImages.includes(imageId);
      if (!isSelected && selectedImages.length >= maxSelection) {
        return; // Max selection reached
      }
      onImageSelect(imageId);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {images.map((image) => {
        const isSelected = selectedImages.includes(image.id);
        const selectionIndex = selectedImages.indexOf(image.id);
        const isDisabled = selectionMode && !isSelected && selectedImages.length >= maxSelection;

        const content = (
          <>
            <AuthenticatedImage
              src={image.thumbnailUrl || image.secureUrl}
              alt=""
              fill
              className={cn(
                "object-cover transition-all duration-300",
                "group-hover:scale-105",
                loadedImages.has(image.id) ? "opacity-100" : "opacity-0",
                isDisabled && "opacity-50"
              )}
              onLoad={() =>
                setLoadedImages((prev) => new Set([...Array.from(prev), image.id]))
              }
            />

            {!loadedImages.has(image.id) && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}

            {/* Selection indicator */}
            {selectionMode && (
              <div
                className={cn(
                  "absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "bg-white/80 border-gray-300"
                )}
              >
                {isSelected && (
                  selectedImages.length > 1 ? (
                    <span className="text-xs font-bold">{selectionIndex + 1}</span>
                  ) : (
                    <Check className="w-4 h-4" />
                  )
                )}
              </div>
            )}

            {/* Selection overlay */}
            {selectionMode && isSelected && (
              <div className="absolute inset-0 bg-blue-500/20 pointer-events-none" />
            )}

            <div className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-200",
              selectionMode ? "opacity-0" : "opacity-0 group-hover:opacity-100"
            )}>
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
          </>
        );

        if (selectionMode) {
          return (
            <button
              key={image.id}
              onClick={(e) => handleClick(e, image.id)}
              disabled={isDisabled}
              className={cn(
                "group relative aspect-square rounded-lg overflow-hidden bg-gray-100 transition-all duration-200 text-left",
                isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "hover:shadow-lg",
                isDisabled && "cursor-not-allowed"
              )}
            >
              {content}
            </button>
          );
        }

        return (
          <Link
            key={image.id}
            href={`/image/${image.id}`}
            className="group relative aspect-square rounded-lg overflow-hidden
                     bg-gray-100 hover:shadow-lg transition-all duration-200"
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
