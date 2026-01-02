import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
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

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

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
      this.generativeModel = client.getGenerativeModel({ 
        model: this.model,
        safetySettings: SAFETY_SETTINGS,
      });
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
        maxOutputTokens: 1500,
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
        maxOutputTokens: 2000,
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
      // Robust JSON extraction: handle markdown blocks and potential prefix/suffix text
      let jsonContent = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        jsonContent = jsonMatch[1].trim();
      } else {
        // Fallback: try to find the first '{' and last '}'
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonContent = content.substring(firstBrace, lastBrace + 1);
        }
      }

      const parsed = JSON.parse(jsonContent);
      const hashtags: Hashtag[] = (parsed.hashtags || []).map(
        (h: { tag: string; category: string; isBanned?: boolean }) => ({
          tag: h.tag.replace(/^#/, "").toLowerCase(),
          category: (h.category as string || "niche").toLowerCase() as "trending" | "niche" | "branded",
          selected: true,
          isBanned: h.isBanned || false,
        })
      );
      return { hashtags, usage };
    } catch (parseError) {
      console.error("Failed to parse hashtags response from Gemini:", parseError);
      console.error("Original content:", content);
      return { hashtags: [], usage };
    }
  }
}
