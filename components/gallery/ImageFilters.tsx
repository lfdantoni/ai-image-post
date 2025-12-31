"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface ImageFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  aiModel: string;
  onAIModelChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
}

const AI_MODEL_OPTIONS = [
  { value: "", label: "Todos los modelos" },
  { value: "midjourney", label: "Midjourney" },
  { value: "dalle", label: "DALL-E" },
  { value: "stable-diffusion", label: "Stable Diffusion" },
  { value: "leonardo", label: "Leonardo.ai" },
  { value: "ideogram", label: "Ideogram" },
  { value: "flux", label: "Flux" },
  { value: "other", label: "Otro" },
];

const SORT_OPTIONS = [
  { value: "createdAt-desc", label: "Más recientes" },
  { value: "createdAt-asc", label: "Más antiguos" },
];

export function ImageFilters({
  search,
  onSearchChange,
  aiModel,
  onAIModelChange,
  sortBy,
  onSortByChange,
}: ImageFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por prompt o tag..."
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      <div className="flex gap-4">
        <select
          value={aiModel}
          onChange={(e) => onAIModelChange(e.target.value)}
          className={cn(
            "px-4 py-2.5 border border-gray-300 rounded-lg",
            "text-gray-900 bg-white",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "transition-all duration-200"
          )}
        >
          {AI_MODEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className={cn(
            "px-4 py-2.5 border border-gray-300 rounded-lg",
            "text-gray-900 bg-white",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "transition-all duration-200"
          )}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
