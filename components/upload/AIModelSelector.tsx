"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const AI_MODELS = [
  {
    id: "midjourney",
    name: "Midjourney",
    versions: ["niji 6", "v7", "v6", "v5.2", "v5.1", "v5"],
    icon: "",
  },
  {
    id: "dalle",
    name: "DALL-E",
    versions: ["3", "2"],
    icon: "",
  },
  {
    id: "stable-diffusion",
    name: "Stable Diffusion",
    versions: ["XL", "2.1", "1.5"],
    icon: "",
  },
  {
    id: "leonardo",
    name: "Leonardo.ai",
    versions: ["Phoenix", "Kino XL", "Vision XL"],
    icon: "",
  },
  {
    id: "ideogram",
    name: "Ideogram",
    versions: ["2.0", "1.0"],
    icon: "",
  },
  {
    id: "flux",
    name: "Flux",
    versions: ["Pro", "Dev", "Schnell"],
    icon: "",
  },
  {
    id: "other",
    name: "Otro",
    versions: [],
    icon: "",
  },
];

interface AIModelSelectorProps {
  model: string;
  version: string;
  onModelChange: (model: string) => void;
  onVersionChange: (version: string) => void;
  className?: string;
}

export function AIModelSelector({
  model,
  version,
  onModelChange,
  onVersionChange,
  className,
}: AIModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModel = AI_MODELS.find((m) => m.id === model);

  return (
    <div className={cn("space-y-3", className)}>
      <label className="block text-sm font-medium text-gray-700">
        Modelo de IA
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3
                   border border-gray-300 rounded-lg bg-white
                   hover:border-gray-400 focus:outline-none focus:ring-2
                   focus:ring-primary/20 focus:border-primary"
        >
          <span className="flex items-center gap-2">
            {selectedModel ? (
              <>
                <span>{selectedModel.icon}</span>
                <span>{selectedModel.name}</span>
              </>
            ) : (
              <span className="text-gray-400">Selecciona un modelo</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "w-5 h-5 text-gray-400 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200
                        rounded-lg shadow-lg max-h-60 overflow-auto">
            {AI_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onModelChange(m.id);
                  if (m.versions.length > 0) {
                    onVersionChange(m.versions[0]);
                  } else {
                    onVersionChange("");
                  }
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3",
                  "hover:bg-gray-50 transition-colors",
                  model === m.id && "bg-primary/5"
                )}
              >
                <span className="flex items-center gap-2">
                  <span>{m.icon}</span>
                  <span>{m.name}</span>
                </span>
                {model === m.id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedModel && selectedModel.versions.length > 0 && (
        <div>
          <label className="block text-sm text-gray-500 mb-2">Versión</label>
          <div className="flex flex-wrap gap-2">
            {selectedModel.versions.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onVersionChange(v)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full border transition-all",
                  version === v
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
