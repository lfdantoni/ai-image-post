"use client";

import { useState } from "react";
import { Wand2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  negativePrompt?: string;
  onNegativePromptChange?: (value: string) => void;
  className?: string;
}

export function PromptInput({
  value,
  onChange,
  negativePrompt = "",
  onNegativePromptChange,
  className,
}: PromptInputProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Wand2 className="w-4 h-4" />
          Prompt usado
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe el prompt que usaste para generar esta imagen..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg
                   resize-none focus:outline-none focus:ring-2
                   focus:ring-primary/20 focus:border-primary
                   placeholder:text-gray-400"
        />
        <p className="mt-1 text-xs text-gray-400">{value.length} caracteres</p>
      </div>

      {onNegativePromptChange && (
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Opciones avanzadas
        </button>
      )}

      {showAdvanced && onNegativePromptChange && (
        <div className="animate-slide-up">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Negative Prompt (opcional)
          </label>
          <textarea
            value={negativePrompt}
            onChange={(e) => onNegativePromptChange(e.target.value)}
            placeholder="Elementos a evitar en la imagen..."
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     resize-none focus:outline-none focus:ring-2
                     focus:ring-primary/20 focus:border-primary
                     placeholder:text-gray-400 text-sm"
          />
        </div>
      )}
    </div>
  );
}
