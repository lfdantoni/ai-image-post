"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Hash, TrendingUp, Target, Award, AlertTriangle, Plus, X, Save, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useGenerateHashtags } from "@/hooks/useGenerateHashtags";
import { useAIProviders } from "@/hooks/useAIProviders";
import { AIProviderSelector } from "./AIProviderSelector";
import { Hashtag, HashtagGroupData } from "@/types";
import { AIProvider } from "@/types/ai-providers";

interface HashtagGeneratorProps {
  prompt: string;
  currentHashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  maxHashtags?: number;
  className?: string;
}

const categoryColors = {
  trending: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
  niche: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  branded: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
};

const categoryIcons = {
  trending: TrendingUp,
  niche: Target,
  branded: Award,
};

interface HashtagChipProps {
  hashtag: Hashtag;
  onClick: () => void;
}

function HashtagChip({ hashtag, onClick }: HashtagChipProps) {
  const colors = categoryColors[hashtag.category];
  const Icon = categoryIcons[hashtag.category];

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all",
        hashtag.selected
          ? `${colors.bg} ${colors.text} ${colors.border} border`
          : "bg-gray-100 text-gray-500 border border-gray-200 opacity-60",
        hashtag.isBanned && "line-through opacity-50 bg-red-50 border-red-200 text-red-500"
      )}
    >
      <Icon className="w-3 h-3" />
      <span>#{hashtag.tag}</span>
      {hashtag.isBanned && <AlertTriangle className="w-3 h-3 text-red-500" />}
    </button>
  );
}

export function HashtagGenerator({
  prompt,
  currentHashtags,
  onHashtagsChange,
  maxHashtags = 30,
  className,
}: HashtagGeneratorProps) {
  const [customHashtag, setCustomHashtag] = useState("");
  const [categories, setCategories] = useState({
    trending: true,
    niche: true,
    branded: false,
  });
  const [count, setCount] = useState(15);
  const [savedGroups, setSavedGroups] = useState<HashtagGroupData[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("gemini");

  const {
    generateHashtags,
    isGenerating,
    error,
    suggestedHashtags,
    metadata,
    toggleHashtag,
    selectedHashtags,
  } = useGenerateHashtags();

  const { providers, defaultProvider, isLoading: isLoadingProviders } = useAIProviders();

  // Set default provider when loaded
  useEffect(() => {
    if (defaultProvider) {
      setSelectedProvider(defaultProvider);
    }
  }, [defaultProvider]);

  // Load saved hashtag groups
  const loadGroups = useCallback(async () => {
    setIsLoadingGroups(true);
    try {
      const response = await fetch("/api/hashtag-groups");
      if (response.ok) {
        const data = await response.json();
        setSavedGroups(data.groups || []);
      }
    } catch {
      // Silent fail for groups loading
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Track previous selectedHashtags to avoid infinite loops
  const prevSelectedRef = useRef<string[]>([]);

  // Update parent when selection changes (only if actually different)
  useEffect(() => {
    const prevSelected = prevSelectedRef.current;
    const currentSelected = selectedHashtags;

    // Compare arrays by content, not reference
    const hasChanged =
      prevSelected.length !== currentSelected.length ||
      prevSelected.some((tag, index) => tag !== currentSelected[index]);

    if (hasChanged) {
      prevSelectedRef.current = [...currentSelected];
      onHashtagsChange(currentSelected);
    }
  }, [selectedHashtags, onHashtagsChange]);

  const handleGenerate = async () => {
    try {
      await generateHashtags({
        prompt,
        count,
        categories,
        provider: selectedProvider,
      });
    } catch {
      // Error handled by hook
    }
  };

  const handleAddCustom = () => {
    const tag = customHashtag.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (tag && !currentHashtags.includes(tag)) {
      onHashtagsChange([...currentHashtags, tag]);
      setCustomHashtag("");
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    onHashtagsChange(currentHashtags.filter((h) => h !== tag));
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim() || selectedHashtags.length === 0) return;

    try {
      const response = await fetch("/api/hashtag-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          hashtags: selectedHashtags,
        }),
      });

      if (response.ok) {
        setShowSaveDialog(false);
        setGroupName("");
        loadGroups();
      }
    } catch {
      // Silent fail
    }
  };

  const handleLoadGroup = (group: HashtagGroupData) => {
    onHashtagsChange(group.hashtags);
  };

  const totalSelected = currentHashtags.length;
  const remainingSlots = maxHashtags - totalSelected;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Hashtags ({totalSelected}/{maxHashtags})
        </label>
        {totalSelected > 0 && (
          <button
            onClick={() => onHashtagsChange([])}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Custom hashtag input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={customHashtag}
            onChange={(e) => setCustomHashtag(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
            placeholder="Add custom hashtag..."
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleAddCustom}
          disabled={!customHashtag || remainingSlots <= 0}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Current hashtags */}
      {currentHashtags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentHashtags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
            >
              #{tag}
              <button
                onClick={() => handleRemoveHashtag(tag)}
                className="hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Generation controls */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Generate with AI</span>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt}
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Hash className="w-4 h-4 mr-1" />
            )}
            Generate
          </Button>
        </div>

        {/* Category toggles */}
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={categories.trending}
              onChange={(e) => setCategories({ ...categories, trending: e.target.checked })}
              className="rounded text-green-500 focus:ring-green-500"
            />
            <TrendingUp className="w-4 h-4 text-green-600" />
            Trending
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={categories.niche}
              onChange={(e) => setCategories({ ...categories, niche: e.target.checked })}
              className="rounded text-blue-500 focus:ring-blue-500"
            />
            <Target className="w-4 h-4 text-blue-600" />
            Niche
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={categories.branded}
              onChange={(e) => setCategories({ ...categories, branded: e.target.checked })}
              className="rounded text-purple-500 focus:ring-purple-500"
            />
            <Award className="w-4 h-4 text-purple-600" />
            Branded
          </label>
        </div>

        {/* Count slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Hashtag count</span>
            <span className="text-xs font-medium text-gray-700">{count}</span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Advanced options (Provider selector) */}
        <div className="border-t border-gray-200 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Advanced options
          </button>

          {showAdvanced && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-2">
                AI Provider
              </label>
              {isLoadingProviders ? (
                <div className="animate-pulse h-10 bg-gray-100 rounded-lg" />
              ) : (
                <AIProviderSelector
                  selected={selectedProvider}
                  onChange={setSelectedProvider}
                  providers={providers}
                  showComparison={false}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Suggested hashtags */}
      {suggestedHashtags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Suggestions</span>
              {metadata && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                  <Zap className="w-3 h-3" />
                  {metadata.provider === "gemini" ? "Gemini" : "OpenAI"} - {metadata.latencyMs}ms
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
                disabled={selectedHashtags.length === 0}
              >
                <Save className="w-3 h-3 mr-1" />
                Save group
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedHashtags.map((hashtag) => (
              <HashtagChip
                key={hashtag.tag}
                hashtag={hashtag}
                onClick={() => toggleHashtag(hashtag.tag)}
              />
            ))}
          </div>
          {suggestedHashtags.some((h) => h.isBanned) && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Crossed-out hashtags may be banned or shadowbanned on Instagram
            </p>
          )}
        </div>
      )}

      {/* Saved groups */}
      {savedGroups.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-gray-700">Saved groups</span>
          <div className="flex flex-wrap gap-2">
            {savedGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleLoadGroup(group)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 hover:bg-gray-50"
              >
                {group.name}
                <span className="ml-1 text-gray-400">({group.hashtags.length})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save group dialog */}
      {showSaveDialog && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Group name</label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., AI Art, Photography..."
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveGroup} disabled={!groupName.trim()}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
