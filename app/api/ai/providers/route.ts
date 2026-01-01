import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AIProviderFactory } from "@/lib/ai";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allProviders = AIProviderFactory.getAllProviders();
    const defaultProvider = AIProviderFactory.getDefaultProvider();

    const providers = allProviders.map((name) => ({
      name,
      displayName: name === "openai" ? "OpenAI GPT-4" : "Google Gemini",
      description:
        name === "openai"
          ? "More precise, higher cost"
          : "Faster, lower cost",
      isAvailable: AIProviderFactory.isProviderAvailable(name),
      isDefault: name === defaultProvider,
      models: AIProviderFactory.getProviderModels(name),
      defaultModel: AIProviderFactory.getDefaultModel(name),
    }));

    return NextResponse.json({
      providers,
      defaultProvider,
    });
  } catch (error) {
    console.error("Error fetching providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch providers" },
      { status: 500 }
    );
  }
}
