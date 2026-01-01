import OpenAI from "openai";
import { BaseAIProvider } from "./base-provider";
import {
  AIProvider,
  CaptionGenerationParams,
  HashtagGenerationParams,
  Hashtag,
  TokenUsage,
} from "@/types/ai-providers";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({
      apiKey,
      organization: process.env.OPENAI_ORG_ID,
    });
  }
  return openaiClient;
}

export class OpenAIProvider extends BaseAIProvider {
  readonly name: AIProvider = "openai";
  readonly model: string;

  constructor(model?: string) {
    super();
    this.model = model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  async generateCaption(
    params: CaptionGenerationParams
  ): Promise<{ caption: string; usage: TokenUsage }> {
    const client = getOpenAIClient();
    const systemPrompt = this.buildCaptionSystemPrompt(params);

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Create an Instagram caption for this image:\n\n${params.prompt}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.8,
    });

    const caption = response.choices[0]?.message?.content?.trim() || "";
    const usage: TokenUsage = {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };

    return { caption, usage };
  }

  async generateHashtags(
    params: HashtagGenerationParams
  ): Promise<{ hashtags: Hashtag[]; usage: TokenUsage }> {
    const client = getOpenAIClient();
    const prompt = this.buildHashtagPrompt(params);

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an Instagram hashtag expert. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const usage: TokenUsage = {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
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
