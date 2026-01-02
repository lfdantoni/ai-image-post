"use client";

import { useState, useCallback } from "react";
import { useSwipeable } from "react-swipeable";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthenticatedImage } from "@/components/gallery/AuthenticatedImage";

interface CarouselSlide {
  id: string;
  imageUrl: string;
}

interface CarouselPreviewProps {
  slides: CarouselSlide[];
  username: string;
  avatarUrl?: string;
  caption?: string;
  hashtags?: string[];
  likesCount?: number;
  aspectRatio?: "portrait" | "square" | "landscape";
  onSlideChange?: (index: number) => void;
  onAddSlide?: () => void;
  onRemoveSlide?: (id: string) => void;
  onReorderSlides?: (newOrder: string[]) => void;
  maxSlides?: number;
  className?: string;
}

interface SortableThumbnailProps {
  slide: CarouselSlide;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onRemove?: () => void;
}

function SortableThumbnail({
  slide,
  index,
  isActive,
  onClick,
  onRemove,
}: SortableThumbnailProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative w-14 h-14 shrink-0 rounded overflow-hidden cursor-grab active:cursor-grabbing",
        isActive && "ring-2 ring-blue-500",
        isDragging && "z-10 opacity-80"
      )}
      {...attributes}
      {...listeners}
    >
      <div onClick={onClick} className="w-full h-full">
        <AuthenticatedImage
          src={slide.imageUrl}
          alt={`Slide ${index + 1}`}
          fill
          className="object-cover"
        />
      </div>
      {isActive && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] px-1 rounded">
          {index + 1}
        </div>
      )}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

const aspectRatioStyles = {
  portrait: "aspect-[4/5]",
  square: "aspect-square",
  landscape: "aspect-[1.91/1]",
};

export function CarouselPreview({
  slides,
  username,
  avatarUrl,
  caption = "",
  hashtags = [],
  likesCount = 0,
  aspectRatio = "portrait",
  onSlideChange,
  onAddSlide,
  onRemoveSlide,
  onReorderSlides,
  maxSlides = 20,
  className,
}: CarouselPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);

  const formattedLikes = (likesCount || 0).toLocaleString();
  const hashtagsText = hashtags.length > 0 ? hashtags.map((h) => `#${h}`).join(" ") : "";

  const displayCaption = caption || "";
  const shouldTruncateCaption = displayCaption.length > 100 && !showFullCaption;
  const truncatedCaption = shouldTruncateCaption
    ? displayCaption.slice(0, 100) + "..."
    : displayCaption;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const goToSlide = useCallback(
    (index: number) => {
      const newIndex = Math.max(0, Math.min(index, slides.length - 1));
      setCurrentIndex(newIndex);
      onSlideChange?.(newIndex);
    },
    [slides.length, onSlideChange]
  );

  const goToPrevious = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const handlers = useSwipeable({
    onSwipedLeft: goToNext,
    onSwipedRight: goToPrevious,
    trackMouse: true,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = slides.findIndex((s) => s.id === active.id);
      const newIndex = slides.findIndex((s) => s.id === over.id);
      const newOrder = arrayMove(slides, oldIndex, newIndex);
      onReorderSlides?.(newOrder.map((s) => s.id));

      if (currentIndex === oldIndex) {
        setCurrentIndex(newIndex);
      } else if (currentIndex > oldIndex && currentIndex <= newIndex) {
        setCurrentIndex(currentIndex - 1);
      } else if (currentIndex < oldIndex && currentIndex >= newIndex) {
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  const canAddMore = slides.length < maxSlides;

  if (slides.length === 0) {
    return (
      <div className={cn("bg-white border border-[#dbdbdb] rounded-lg p-8 text-center", className)}>
        <p className="text-[#8e8e8e] mb-4">No slides added yet</p>
        {onAddSlide && (
          <button
            onClick={onAddSlide}
            className="px-4 py-2 bg-[#0095f6] text-white rounded-lg text-sm font-medium hover:bg-[#1877f2]"
          >
            Add first slide
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white border border-[#dbdbdb] rounded-lg overflow-hidden max-w-[375px] mx-auto",
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

      {/* Carousel */}
      <div className="relative" {...handlers}>
        <div className={cn("relative bg-black overflow-hidden", aspectRatioStyles[aspectRatio])}>
          <div
            className="absolute inset-0 flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {slides.map((slide, index) => (
              <div key={slide.id} className="relative w-full h-full shrink-0">
                <AuthenticatedImage
                  src={slide.imageUrl}
                  alt={`Slide ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          {/* Navigation arrows */}
          {currentIndex > 0 && (
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white"
            >
              <ChevronLeft className="w-5 h-5 text-[#262626]" />
            </button>
          )}
          {currentIndex < slides.length - 1 && (
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white"
            >
              <ChevronRight className="w-5 h-5 text-[#262626]" />
            </button>
          )}

          {/* Slide counter */}
          <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {currentIndex + 1}/{slides.length}
          </div>
        </div>

        {/* Dots indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                index === currentIndex ? "bg-[#0095f6]" : "bg-white/50"
              )}
            />
          ))}
        </div>
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

        {/* Carousel dots in action bar */}
        <div className="flex gap-1">
          {slides.slice(0, 5).map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                index === currentIndex ? "bg-[#0095f6]" : "bg-[#a8a8a8]"
              )}
            />
          ))}
          {slides.length > 5 && (
            <span className="text-[10px] text-[#8e8e8e] ml-1">+{slides.length - 5}</span>
          )}
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

      {/* Thumbnail strip with drag & drop */}
      <div className="p-3 border-t border-[#dbdbdb]">
        <p className="text-xs text-[#8e8e8e] mb-2">
          Slides ({slides.length}/{maxSlides})
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={slides.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-2 overflow-x-auto pb-2">
              {slides.map((slide, index) => (
                <SortableThumbnail
                  key={slide.id}
                  slide={slide}
                  index={index}
                  isActive={index === currentIndex}
                  onClick={() => goToSlide(index)}
                  onRemove={onRemoveSlide ? () => onRemoveSlide(slide.id) : undefined}
                />
              ))}
              {canAddMore && onAddSlide && (
                <button
                  onClick={onAddSlide}
                  className="w-14 h-14 shrink-0 rounded border-2 border-dashed border-[#dbdbdb] flex items-center justify-center hover:border-[#0095f6] hover:text-[#0095f6] text-[#8e8e8e] transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
