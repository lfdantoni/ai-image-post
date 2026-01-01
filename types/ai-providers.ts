export type AIProvider = "openai" | "gemini";

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface CaptionGenerationParams {
  prompt: string;
  tone: "artistic" | "casual" | "professional" | "inspirational";
  length: "short" | "medium" | "long";
  includeEmojis: boolean;
  includeQuestion: boolean;
  includeCTA: boolean;
  language: string;
  provider?: AIProvider;
}

export interface HashtagGenerationParams {
  prompt: string;
  caption?: string;
  count: number;
  categories: {
    trending: boolean;
    niche: boolean;
    branded: boolean;
  };
  provider?: AIProvider;
}

export interface Hashtag {
  tag: string;
  category: "trending" | "niche" | "branded";
  selected: boolean;
  isBanned?: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AIGenerationResult<T> {
  data: T;
  provider: AIProvider;
  model: string;
  usage: TokenUsage;
  latencyMs: number;
}

export interface GenerationMetadata {
  provider: AIProvider;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderInfo {
  name: AIProvider;
  displayName: string;
  description: string;
  isAvailable: boolean;
  isDefault: boolean;
  models: string[];
  defaultModel: string;
}
