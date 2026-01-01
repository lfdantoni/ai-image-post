import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { aiService } from "@/lib/ai";
import { AIProvider } from "@/types/ai-providers";

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  imageAnalysis: z.string().optional(),
  tone: z.enum(["artistic", "casual", "professional", "inspirational"]),
  length: z.enum(["short", "medium", "long"]),
  includeEmojis: z.boolean(),
  includeQuestion: z.boolean(),
  includeCTA: z.boolean(),
  language: z.string().min(2).max(5),
  provider: z.enum(["openai", "gemini"]).optional(),
});

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = parseInt(process.env.CAPTION_RATE_LIMIT_PER_MINUTE || "10");

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before generating another caption." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      prompt,
      tone,
      length,
      includeEmojis,
      includeQuestion,
      includeCTA,
      language,
      provider,
    } = parsed.data;

    const result = await aiService.generateCaption({
      prompt,
      tone,
      length,
      includeEmojis,
      includeQuestion,
      includeCTA,
      language,
      provider: provider as AIProvider | undefined,
    });

    return NextResponse.json({
      caption: result.data,
      metadata: {
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        usage: result.usage,
      },
    });
  } catch (error) {
    console.error("Error generating caption:", error);

    if (error instanceof Error && error.message.includes("API key")) {
      return NextResponse.json(
        { error: "AI provider configuration error. Please check your API keys." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate caption" },
      { status: 500 }
    );
  }
}
