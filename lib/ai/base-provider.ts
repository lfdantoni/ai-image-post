import {
  AIProvider,
  CaptionGenerationParams,
  HashtagGenerationParams,
  Hashtag,
  TokenUsage,
} from "@/types/ai-providers";

export abstract class BaseAIProvider {
  abstract readonly name: AIProvider;
  abstract readonly model: string;

  abstract generateCaption(
    params: CaptionGenerationParams
  ): Promise<{ caption: string; usage: TokenUsage }>;

  abstract generateHashtags(
    params: HashtagGenerationParams
  ): Promise<{ hashtags: Hashtag[]; usage: TokenUsage }>;

  protected buildCaptionSystemPrompt(params: CaptionGenerationParams): string {
    const { tone, length, includeEmojis, includeQuestion, includeCTA, language } = params;
    const lengthRange = this.getLengthRange(length);

    let systemPrompt = `You are an expert Instagram caption writer. Create engaging captions that resonate with audiences.

Your task is to write an Instagram caption based on the provided image description/prompt.

Guidelines:
- Tone: ${this.getToneDescription(tone)}
- Length: ${lengthRange.min}-${lengthRange.max} characters
- Language: Write in ${language}
${includeEmojis ? "- Include relevant emojis naturally throughout the text" : "- Do NOT include any emojis"}
${includeQuestion ? "- End with an engaging question to encourage comments" : ""}
${includeCTA ? "- Include a subtle call-to-action (e.g., 'Link in bio', 'Save for later', 'Share with a friend')" : ""}

Important:
- Do NOT include hashtags in the caption
- Make it authentic and relatable
- Focus on storytelling and emotion
- Only return the caption text, nothing else`;

    return systemPrompt;
  }

  protected buildHashtagPrompt(params: HashtagGenerationParams): string {
    const { prompt, caption, count, categories } = params;

    const enabledCategories: string[] = [];
    if (categories.trending) enabledCategories.push("trending (popular, high-reach hashtags)");
    if (categories.niche) enabledCategories.push("niche (specific to the content, targeted audience)");
    if (categories.branded) enabledCategories.push("branded (unique, memorable hashtags for brand identity)");

    return `You are an Instagram hashtag expert. Generate ${count} relevant hashtags for an Instagram post.

Image description: ${prompt}
${caption ? `Caption: ${caption}` : ""}

Generate hashtags in these categories: ${enabledCategories.join(", ")}

Requirements:
- Return EXACTLY ${count} hashtags
- Mix the enabled categories appropriately
- Do NOT include the # symbol in the tags
- Avoid banned or shadowbanned Instagram hashtags
- Focus on hashtags with moderate to high engagement potential
- Output ONLY valid JSON in the requested format

Return the response as a JSON object with this exact structure:
{
  "hashtags": [
    { "tag": "hashtagname", "category": "trending|niche|branded", "isBanned": false }
  ]
}

Only return the JSON, no additional text or explanation.`;
  }

  protected getToneDescription(tone: string): string {
    const tones: Record<string, string> = {
      artistic: "Creative, poetic, and visually descriptive. Use metaphors and artistic language.",
      casual: "Friendly, conversational, and relatable. Like talking to a friend.",
      professional: "Polished, informative, and authoritative. Maintain credibility.",
      inspirational: "Motivating, uplifting, and thought-provoking. Encourage and inspire.",
    };
    return tones[tone] || tones.casual;
  }

  protected getLengthRange(length: string): { min: number; max: number } {
    const ranges: Record<string, { min: number; max: number }> = {
      short: { min: 50, max: 100 },
      medium: { min: 100, max: 300 },
      long: { min: 300, max: 500 },
    };
    return ranges[length] || ranges.medium;
  }
}
