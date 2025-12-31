"use client";

import { INSTAGRAM_ASPECTS, AspectRatioKey } from "@/lib/instagram-formats";
import { cn } from "@/lib/utils";
import { Check, Star } from "lucide-react";

interface AspectRatioSelectorProps {
  selected: AspectRatioKey;
  onSelect: (aspect: AspectRatioKey) => void;
}

export function AspectRatioSelector({
  selected,
  onSelect,
}: AspectRatioSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {(Object.keys(INSTAGRAM_ASPECTS) as AspectRatioKey[]).map((key) => {
        const aspect = INSTAGRAM_ASPECTS[key];
        const isSelected = selected === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={cn(
              "relative flex flex-col items-center gap-1 p-3",
              "border-2 rounded-lg transition-all duration-200",
              {
                "border-primary bg-primary/5": isSelected,
                "border-gray-200 hover:border-gray-300": !isSelected,
              }
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded border-2 flex items-center justify-center",
                isSelected ? "border-primary" : "border-gray-400"
              )}
              style={{
                aspectRatio: aspect.value,
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            />

            <span
              className={cn(
                "text-xs font-medium",
                isSelected ? "text-primary" : "text-gray-600"
              )}
            >
              {aspect.label}
            </span>

            <span className="text-[10px] text-gray-400">
              {aspect.description}
            </span>

            {isSelected && (
              <div className="absolute -top-1 -right-1 p-0.5 bg-primary rounded-full">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}

            {aspect.recommended && (
              <div className="absolute -top-1 -left-1 p-0.5 bg-amber-400 rounded-full">
                <Star className="w-3 h-3 text-white fill-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
