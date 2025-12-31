"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ImageGrid } from "@/components/gallery/ImageGrid";
import { ImageFilters } from "@/components/gallery/ImageFilters";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import type { ImageData, PaginationInfo } from "@/types";

export default function GalleryPage() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [aiModel, setAIModel] = useState("");
  const [sortBy, setSortBy] = useState("createdAt-desc");

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Galería</h1>
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

      <ImageGrid images={images} isLoading={isLoading} />

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
