"use client";

import { useState } from "react";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Grid, Image as ImageIcon, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthenticatedImage } from "@/components/gallery/AuthenticatedImage";

interface GridImage {
  id: string;
  thumbnailUrl: string;
  isPlanned?: boolean;
  isCarousel?: boolean;
}

interface InstagramGridPreviewProps {
  images: GridImage[];
  plannedImages: GridImage[];
  username: string;
  avatarUrl?: string;
  onReorder?: (newOrder: string[]) => void;
  className?: string;
}

interface SortableGridItemProps {
  image: GridImage;
  index: number;
}

function SortableGridItem({ image, index }: SortableGridItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative aspect-[3/4] bg-gray-100 cursor-grab active:cursor-grabbing",
        isDragging && "z-10 opacity-80",
        image.isPlanned && "border-2 border-dashed border-blue-400"
      )}
    >
      <AuthenticatedImage
        src={image.thumbnailUrl}
        alt={`Grid image ${index + 1}`}
        fill
        className="object-cover"
      />
      {image.isPlanned && (
        <div className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
          NEW
        </div>
      )}
      {image.isCarousel && (
        <div className="absolute top-1 right-1">
          <div className="bg-black/50 rounded p-0.5">
            <Grid className="w-3 h-3 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

export function InstagramGridPreview({
  images,
  plannedImages,
  username,
  avatarUrl,
  onReorder,
  className,
}: InstagramGridPreviewProps) {
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "tagged">("posts");

  const allImages = [...plannedImages, ...images];

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = allImages.findIndex((img) => img.id === active.id);
      const newIndex = allImages.findIndex((img) => img.id === over.id);
      const newOrder = arrayMove(allImages, oldIndex, newIndex);
      onReorder?.(newOrder.map((img) => img.id));
    }
  };

  const stats = {
    posts: allImages.length,
    followers: "1.2K",
    following: "234",
  };

  return (
    <div
      className={cn(
        "bg-white border border-[#dbdbdb] rounded-lg overflow-hidden max-w-[375px] mx-auto",
        "font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif]",
        className
      )}
    >
      {/* Profile Header */}
      <div className="p-4 border-b border-[#dbdbdb]">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#f09433] to-[#bc1888] p-[2px] shrink-0">
            <div className="w-full h-full rounded-full bg-white p-[1px]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-lg text-gray-500">
                    {username[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1">
            <h2 className="font-semibold text-[#262626] mb-2">{username}</h2>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <span className="font-semibold text-[#262626]">{stats.posts}</span>
                <span className="text-[#8e8e8e] ml-1">posts</span>
              </div>
              <div className="text-center">
                <span className="font-semibold text-[#262626]">{stats.followers}</span>
                <span className="text-[#8e8e8e] ml-1">followers</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#dbdbdb]">
        <button
          onClick={() => setActiveTab("posts")}
          className={cn(
            "flex-1 py-3 flex items-center justify-center gap-1 text-xs font-medium transition-colors",
            activeTab === "posts"
              ? "text-[#262626] border-b border-[#262626]"
              : "text-[#8e8e8e]"
          )}
        >
          <Grid className="w-4 h-4" />
          POSTS
        </button>
        <button
          onClick={() => setActiveTab("reels")}
          className={cn(
            "flex-1 py-3 flex items-center justify-center gap-1 text-xs font-medium transition-colors",
            activeTab === "reels"
              ? "text-[#262626] border-b border-[#262626]"
              : "text-[#8e8e8e]"
          )}
        >
          <ImageIcon className="w-4 h-4" />
          REELS
        </button>
        <button
          onClick={() => setActiveTab("tagged")}
          className={cn(
            "flex-1 py-3 flex items-center justify-center gap-1 text-xs font-medium transition-colors",
            activeTab === "tagged"
              ? "text-[#262626] border-b border-[#262626]"
              : "text-[#8e8e8e]"
          )}
        >
          <Tag className="w-4 h-4" />
          TAGGED
        </button>
      </div>

      {/* Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={allImages.map((img) => img.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-[2px]">
            {allImages.slice(0, 9).map((image, index) => (
              <SortableGridItem key={image.id} image={image} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Footer hint */}
      {plannedImages.length > 0 && (
        <div className="p-3 text-center text-xs text-[#8e8e8e] bg-gray-50">
          Drag to reorder planned posts
        </div>
      )}
    </div>
  );
}
