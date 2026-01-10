"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageGrid } from "@/components/gallery/ImageGrid";
import { ImageFilters } from "@/components/gallery/ImageFilters";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import type { ImageData, PaginationInfo } from "@/types";

function GalleryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectionMode = searchParams.get("select") === "true";
  const maxSelection = parseInt(searchParams.get("maxSelection") || "20");
  const returnTo = searchParams.get("returnTo") || "/create-post";

  const [images, setImages] = useState<ImageData[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [aiModel, setAIModel] = useState("");
  const [sortBy, setSortBy] = useState("createdAt-desc");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const [sortField, sortOrder] = useMemo(() => {
    const [field, order] = sortBy.split("-");
    return [field, order] as [string, "asc" | "desc"];
  }, [sortBy]);

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "20");
        if (search) params.set("search", search);
        if (aiModel) params.set("aiModel", aiModel);
        params.set("sortBy", sortField);
        params.set("sortOrder", sortOrder);

        const response = await fetch(`/api/images?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setImages(data.images);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error("Error fetching images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchImages, 300);
    return () => clearTimeout(debounce);
  }, [search, aiModel, sortField, sortOrder]);

  const loadMore = async () => {
    if (!pagination?.hasMore) return;

    try {
      const params = new URLSearchParams();
      params.set("page", (pagination.page + 1).toString());
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (aiModel) params.set("aiModel", aiModel);
      params.set("sortBy", sortField);
      params.set("sortOrder", sortOrder);

      const response = await fetch(`/api/images?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setImages((prev) => [...prev, ...data.images]);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error loading more images:", error);
    }
  };

  const handleImageSelect = (imageId: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(imageId)) {
        return prev.filter((id) => id !== imageId);
      }
      if (prev.length >= maxSelection) {
        return prev;
      }
      return [...prev, imageId];
    });
  };

  const handleConfirmSelection = () => {
    if (selectedImages.length > 0) {
      router.push(`${returnTo}?images=${selectedImages.join(",")}`);
    }
  };

  const handleCancelSelection = () => {
    router.push(returnTo);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Selection mode header */}
      {selectionMode && (
        <div className="sticky top-16 z-30 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <h2 className="font-medium text-blue-900">
              Selecciona imágenes para tu post
            </h2>
            <p className="text-sm text-blue-700">
              {selectedImages.length} de {maxSelection} seleccionadas
              {selectedImages.length > 1 && " (se creará un carrusel)"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancelSelection}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleConfirmSelection} disabled={selectedImages.length === 0}>
              <Check className="w-4 h-4 mr-1" />
              Confirmar ({selectedImages.length})
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Link
          href={selectionMode ? returnTo : "/dashboard"}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {selectionMode ? "Seleccionar Imágenes" : "Galería"}
        </h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <ImageFilters
            search={search}
            onSearchChange={setSearch}
            aiModel={aiModel}
            onAIModelChange={setAIModel}
            sortBy={sortBy}
            onSortByChange={setSortBy}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {pagination?.total || 0} {pagination?.total === 1 ? "imagen" : "imágenes"}
        </p>
      </div>

      <ImageGrid
        images={images}
        isLoading={isLoading}
        selectionMode={selectionMode}
        selectedImages={selectedImages}
        onImageSelect={handleImageSelect}
        maxSelection={maxSelection}
      />

      {pagination?.hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={loadMore}>
            Cargar más
          </Button>
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GalleryContent />
    </Suspense>
  );
}
