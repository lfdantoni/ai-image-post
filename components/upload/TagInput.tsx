"use client";

import { useState, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
  maxTags?: number;
  className?: string;
}

export function TagInput({
  tags,
  onTagsChange,
  suggestions = [],
  maxTags = 10,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (
      normalizedTag &&
      !tags.includes(normalizedTag) &&
      tags.length < maxTags
    ) {
      onTagsChange([...tags, normalizedTag]);
      setInputValue("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(s.toLowerCase())
  );

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Tags (opcional)
      </label>

      <div
        className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg
                   focus-within:ring-2 focus-within:ring-primary/20
                   focus-within:border-primary min-h-[48px]"
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1
                     bg-primary/10 text-primary rounded-full text-sm"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-primary/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {tags.length < maxTags && (
          <div className="relative flex-1 min-w-[120px]">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={tags.length === 0 ? "Añadir tags..." : ""}
              className="w-full outline-none text-sm placeholder:text-gray-400"
            />

            {showSuggestions && filteredSuggestions.length > 0 && inputValue && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white
                            border border-gray-200 rounded-lg shadow-lg z-10">
                {filteredSuggestions.slice(0, 5).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addTag(suggestion)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50
                             flex items-center gap-2"
                  >
                    <Plus className="w-3 h-3 text-gray-400" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-1 text-xs text-gray-400">
        {tags.length}/{maxTags} tags - Presiona Enter o coma para añadir
      </p>
    </div>
  );
}
