"use client";

import { cn } from "@/lib/utils";
import { AIProvider, ProviderInfo } from "@/types/ai-providers";
import { Sparkles, Zap, Check, AlertCircle } from "lucide-react";

interface AIProviderSelectorProps {
  selected: AIProvider;
  onChange: (provider: AIProvider) => void;
  providers: ProviderInfo[];
  showComparison?: boolean;
  disabled?: boolean;
  className?: string;
}

const providerIcons: Record<AIProvider, React.ReactNode> = {
  openai: <Sparkles className="w-4 h-4" />,
  gemini: <Zap className="w-4 h-4" />,
};

const providerColors: Record<AIProvider, { bg: string; border: string; text: string }> = {
  openai: {
    bg: "bg-emerald-50",
    border: "border-emerald-500",
    text: "text-emerald-700",
  },
  gemini: {
    bg: "bg-blue-50",
    border: "border-blue-500",
    text: "text-blue-700",
  },
};

export function AIProviderSelector({
  selected,
  onChange,
  providers,
  showComparison = true,
  disabled = false,
  className,
}: AIProviderSelectorProps) {
  if (providers.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-amber-600 text-sm", className)}>
        <AlertCircle className="w-4 h-4" />
        <span>No AI providers configured</span>
      </div>
    );
  }

  // If only one provider is available, show it as selected without options
  const availableProviders = providers.filter((p) => p.isAvailable);
  if (availableProviders.length === 1) {
    const provider = availableProviders[0];
    const colors = providerColors[provider.name];
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
            colors.bg,
            colors.border,
            colors.text
          )}
        >
          {providerIcons[provider.name]}
          <span className="text-sm font-medium">{provider.displayName}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        {providers.map((provider) => {
          const isSelected = selected === provider.name;
          const colors = providerColors[provider.name];
          const isDisabled = disabled || !provider.isAvailable;

          return (
            <button
              key={provider.name}
              onClick={() => !isDisabled && onChange(provider.name)}
              disabled={isDisabled}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all",
                "focus:outline-none focus:ring-2 focus:ring-offset-2",
                isSelected
                  ? `${colors.bg} ${colors.border} ${colors.text} focus:ring-${provider.name === "openai" ? "emerald" : "blue"}-500`
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className={cn("p-1 rounded", isSelected && colors.bg)}>
                {providerIcons[provider.name]}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{provider.displayName}</span>
                  {provider.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                      Default
                    </span>
                  )}
                  {!provider.isAvailable && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full">
                      Not configured
                    </span>
                  )}
                </div>
                {showComparison && (
                  <span className="text-xs text-gray-500">{provider.description}</span>
                )}
              </div>
              {isSelected && (
                <Check className={cn("w-4 h-4 ml-auto", colors.text)} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
