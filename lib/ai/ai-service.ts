import {
  AIProvider,
  CaptionGenerationParams,
  HashtagGenerationParams,
  Hashtag,
  AIGenerationResult,
} from "@/types/ai-providers";
import { AIProviderFactory } from "./provider-factory";

export class AIService {
  private primaryProvider: AIProvider;
  private fallbackProvider: AIProvider | null;

  constructor(primary?: AIProvider, fallback?: AIProvider) {
    this.primaryProvider = primary || AIProviderFactory.getDefaultProvider();

    // Set fallback to the other provider if available
    if (fallback) {
      this.fallbackProvider = fallback;
    } else {
      const availableProviders = AIProviderFactory.getAvailableProviders();
      const otherProviders = availableProviders.filter((p) => p !== this.primaryProvider);
      this.fallbackProvider = otherProviders.length > 0 ? otherProviders[0] : null;
    }
  }

  async generateCaption(
    params: CaptionGenerationParams
  ): Promise<AIGenerationResult<string>> {
    const startTime = Date.now();
    const provider = params.provider || this.primaryProvider;

    try {
      const providerInstance = AIProviderFactory.getProvider(provider);
      const result = await providerInstance.generateCaption(params);

      return {
        data: result.caption,
        provider,
        model: providerInstance.model,
        usage: result.usage,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`Provider ${provider} failed:`, error);

      // Try fallback if available and different from current provider
      if (this.fallbackProvider && provider !== this.fallbackProvider) {
        console.warn(`Trying fallback provider: ${this.fallbackProvider}`);
        return this.generateCaption({
          ...params,
          provider: this.fallbackProvider,
        });
      }

      throw error;
    }
  }

  async generateHashtags(
    params: HashtagGenerationParams
  ): Promise<AIGenerationResult<Hashtag[]>> {
    const startTime = Date.now();
    const provider = params.provider || this.primaryProvider;

    try {
      const providerInstance = AIProviderFactory.getProvider(provider);
      const result = await providerInstance.generateHashtags(params);

      return {
        data: result.hashtags,
        provider,
        model: providerInstance.model,
        usage: result.usage,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`Provider ${provider} failed:`, error);

      // Try fallback if available and different from current provider
      if (this.fallbackProvider && provider !== this.fallbackProvider) {
        console.warn(`Trying fallback provider: ${this.fallbackProvider}`);
        return this.generateHashtags({
          ...params,
          provider: this.fallbackProvider,
        });
      }

      throw error;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
