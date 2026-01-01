import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { BaseAIProvider } from "./base-provider";
import {
  AIProvider,
  CaptionGenerationParams,
  HashtagGenerationParams,
  Hashtag,
  TokenUsage,
} from "@/types/ai-providers";

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GEMINI_API_KEY environment variable is not set");
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

export class GeminiProvider extends BaseAIProvider {
  readonly name: AIProvider = "gemini";
  readonly model: string;
  private generativeModel: GenerativeModel | null = null;

  constructor(model?: string) {
    super();
    this.model = model || process.env.GEMINI_MODEL || "gemini-1.5-flash";
  }

  private getModel(): GenerativeModel {
    if (!this.generativeModel) {
      const client = getGeminiClient();
      this.generativeModel = client.getGenerativeModel({ model: this.model });
    }
    return this.generativeModel;
  }

  async generateCaption(
    params: CaptionGenerationParams
  ): Promise<{ caption: string; usage: TokenUsage }> {
    const model = this.getModel();
    const systemPrompt = this.buildCaptionSystemPrompt(params);

    // Gemini combines system and user prompts
    const fullPrompt = `${systemPrompt}\n\n---\n\nImage description:\n${params.prompt}\n\nGenerate the caption now:`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.8,
      },
    });

    const response = result.response;
    const caption = response.text().trim();

    // Gemini provides usage metadata
    const usageMetadata = response.usageMetadata;
    const usage: TokenUsage = {
      inputTokens: usageMetadata?.promptTokenCount || 0,
      outputTokens: usageMetadata?.candidatesTokenCount || 0,
      totalTokens: usageMetadata?.totalTokenCount || 0,
    };

    return { caption, usage };
  }

  async generateHashtags(
    params: HashtagGenerationParams
  ): Promise<{ hashtags: Hashtag[]; usage: TokenUsage }> {
    const model = this.getModel();
    const prompt = this.buildHashtagPrompt(params);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const response = result.response;
    const content = response.text();

    const usageMetadata = response.usageMetadata;
    const usage: TokenUsage = {
      inputTokens: usageMetadata?.promptTokenCount || 0,
      outputTokens: usageMetadata?.candidatesTokenCount || 0,
      totalTokens: usageMetadata?.totalTokenCount || 0,
    };

    try {
      const parsed = JSON.parse(content);
      const hashtags: Hashtag[] = (parsed.hashtags || []).map(
        (h: { tag: string; category: string; isBanned?: boolean }) => ({
          tag: h.tag.replace(/^#/, "").toLowerCase(),
          category: h.category as "trending" | "niche" | "branded",
          selected: true,
          isBanned: h.isBanned || false,
        })
      );
      return { hashtags, usage };
    } catch {
      console.error("Failed to parse hashtags response:", content);
      return { hashtags: [], usage };
    }
  }
}
