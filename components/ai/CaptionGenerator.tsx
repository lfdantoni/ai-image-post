"use client";

import { useState, useEffect } from "react";
import copy from "copy-to-clipboard";
import { RefreshCw, Copy, Check, Palette, Smile, Briefcase, Sparkles, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useGenerateCaption } from "@/hooks/useGenerateCaption";
import { useAIProviders } from "@/hooks/useAIProviders";
import { AIProviderSelector } from "./AIProviderSelector";
import { CaptionTone, CaptionLength } from "@/types";
import { AIProvider } from "@/types/ai-providers";

interface CaptionGeneratorProps {
  prompt: string;
  imageUrl?: string;
  onCaptionGenerated: (caption: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const tones: { id: CaptionTone; label: string; icon: React.ReactNode }[] = [
  { id: "artistic", label: "Artistic", icon: <Palette className="w-5 h-5" /> },
  { id: "casual", label: "Casual", icon: <Smile className="w-5 h-5" /> },
  { id: "professional", label: "Professional", icon: <Briefcase className="w-5 h-5" /> },
  { id: "inspirational", label: "Inspirational", icon: <Sparkles className="w-5 h-5" /> },
];

const lengths: { id: CaptionLength; label: string; description: string }[] = [
  { id: "short", label: "Short", description: "1-2 lines" },
  { id: "medium", label: "Medium", description: "3-5 lines" },
  { id: "long", label: "Long", description: "Full paragraph" },
];

const languages = [
  { code: "es", label: "Spanish" },
  { code: "en", label: "English" },
  { code: "pt", label: "Portuguese" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
];

export function CaptionGenerator({
  prompt,
  onCaptionGenerated,
  onClose,
  isOpen,
}: CaptionGeneratorProps) {
  const [tone, setTone] = useState<CaptionTone>("artistic");
  const [length, setLength] = useState<CaptionLength>("medium");
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeQuestion, setIncludeQuestion] = useState(true);
  const [includeCTA, setIncludeCTA] = useState(false);
  const [language, setLanguage] = useState("es");
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("gemini");

  const { generateCaption, isGenerating, error, lastCaption, metadata, regenerate } = useGenerateCaption();
  const { providers, defaultProvider, isLoading: isLoadingProviders } = useAIProviders();

  // Set default provider when loaded
  useEffect(() => {
    if (defaultProvider) {
      setSelectedProvider(defaultProvider);
    }
  }, [defaultProvider]);

  const handleGenerate = async () => {
    try {
      await generateCaption({
        prompt,
        tone,
        length,
        includeEmojis,
        includeQuestion,
        includeCTA,
        language,
        provider: selectedProvider,
      });
    } catch {
      // Error is handled by the hook
    }
  };

  const handleRegenerate = async () => {
    try {
      await regenerate();
    } catch {
      // Error is handled by the hook
    }
  };

  const handleCopy = () => {
    if (lastCaption) {
      copy(lastCaption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUseCaption = () => {
    if (lastCaption) {
      onCaptionGenerated(lastCaption);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Caption with AI" size="lg">
      <div className="p-6 space-y-6">
        {/* Prompt context */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Based on your prompt:
          </label>
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 max-h-24 overflow-y-auto">
            {prompt || "No prompt provided"}
          </div>
        </div>

        {/* Tone selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Caption tone
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {tones.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                  tone === t.id
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                {t.icon}
                <span className="text-xs font-medium">{t.label}</span>
                {tone === t.id && (
                  <Check className="w-3 h-3 text-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Length selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Length
          </label>
          <div className="space-y-2">
            {lengths.map((l) => (
              <label
                key={l.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  length === l.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="radio"
                  name="length"
                  value={l.id}
                  checked={length === l.id}
                  onChange={() => setLength(l.id)}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">{l.label}</span>
                  <span className="text-sm text-gray-500 ml-2">({l.description})</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Additional options
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeEmojis}
                onChange={(e) => setIncludeEmojis(e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include relevant emojis</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeQuestion}
                onChange={(e) => setIncludeQuestion(e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Add engagement question</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCTA}
                onChange={(e) => setIncludeCTA(e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include call-to-action</span>
            </label>
          </div>
        </div>

        {/* Language selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Advanced options (Provider selector) */}
        <div className="border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Advanced options
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Provider
                </label>
                {isLoadingProviders ? (
                  <div className="animate-pulse h-12 bg-gray-100 rounded-lg" />
                ) : (
                  <AIProviderSelector
                    selected={selectedProvider}
                    onChange={setSelectedProvider}
                    providers={providers}
                    showComparison
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Generate button */}
        {!lastCaption && (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Caption
              </>
            )}
          </Button>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Generated caption */}
        {lastCaption && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Generated caption:
                </label>
                {metadata && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    <Zap className="w-3 h-3" />
                    {metadata.provider === "gemini" ? "Gemini" : "OpenAI"} ({metadata.model}) - {metadata.latencyMs}ms
                  </span>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap min-h-[100px]">
                {lastCaption}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="flex-1"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
                Regenerate
              </Button>
              <Button
                variant="outline"
                onClick={handleCopy}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleUseCaption} disabled={!lastCaption}>
          Use this caption
        </Button>
      </div>
    </Modal>
  );
}
