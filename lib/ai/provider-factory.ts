import { AIProvider } from "@/types/ai-providers";
import { BaseAIProvider } from "./base-provider";
import { OpenAIProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";

export class AIProviderFactory {
  private static instances: Map<AIProvider, BaseAIProvider> = new Map();

  static getProvider(provider?: AIProvider): BaseAIProvider {
    const selectedProvider = provider || this.getDefaultProvider();

    // Check if provider is available
    if (!this.isProviderAvailable(selectedProvider)) {
      // Try to find an available provider
      const availableProviders = this.getAvailableProviders();
      if (availableProviders.length === 0) {
        throw new Error("No AI providers are configured. Please set OPENAI_API_KEY or GOOGLE_GEMINI_API_KEY.");
      }
      // Use the first available provider as fallback
      const fallbackProvider = availableProviders[0];
      console.warn(`Provider ${selectedProvider} is not available, using ${fallbackProvider} instead.`);
      return this.getProvider(fallbackProvider);
    }

    // Return cached instance if exists
    if (this.instances.has(selectedProvider)) {
      return this.instances.get(selectedProvider)!;
    }

    // Create new instance
    let instance: BaseAIProvider;
    switch (selectedProvider) {
      case "openai":
        instance = new OpenAIProvider();
        break;
      case "gemini":
        instance = new GeminiProvider();
        break;
      default:
        throw new Error(`Unknown provider: ${selectedProvider}`);
    }

    // Cache and return
    this.instances.set(selectedProvider, instance);
    return instance;
  }

  static getDefaultProvider(): AIProvider {
    const defaultProvider = process.env.DEFAULT_AI_PROVIDER as AIProvider;
    if (defaultProvider && this.getAllProviders().includes(defaultProvider)) {
      return defaultProvider;
    }
    // Default to gemini if available, otherwise openai
    if (this.isProviderAvailable("gemini")) {
      return "gemini";
    }
    if (this.isProviderAvailable("openai")) {
      return "openai";
    }
    return "gemini"; // Return gemini as default even if not configured
  }

  static getAllProviders(): AIProvider[] {
    return ["openai", "gemini"];
  }

  static getAvailableProviders(): AIProvider[] {
    return this.getAllProviders().filter((p) => this.isProviderAvailable(p));
  }

  static isProviderAvailable(provider: AIProvider): boolean {
    switch (provider) {
      case "openai":
        return !!process.env.OPENAI_API_KEY;
      case "gemini":
        return !!process.env.GOOGLE_GEMINI_API_KEY;
      default:
        return false;
    }
  }

  static getProviderModels(provider: AIProvider): string[] {
    switch (provider) {
      case "openai":
        return ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"];
      case "gemini":
        return ["gemini-1.5-flash", "gemini-1.5-pro"];
      default:
        return [];
    }
  }

  static getDefaultModel(provider: AIProvider): string {
    switch (provider) {
      case "openai":
        return process.env.OPENAI_MODEL || "gpt-4o-mini";
      case "gemini":
        return process.env.GEMINI_MODEL || "gemini-1.5-flash";
      default:
        return "";
    }
  }
}
