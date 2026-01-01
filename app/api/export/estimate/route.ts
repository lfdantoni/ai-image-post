import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ImageOptimizer, AspectRatioType } from "@/lib/image-optimizer";

export const dynamic = "force-dynamic";

const estimateSchema = z.object({
  imageId: z.string(),
  quality: z.number().min(60).max(100).default(90),
});

/**
 * POST /api/export/estimate
 * Estimate file size for given quality
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageId, quality } = estimateSchema.parse(body);

    // Get image
    const image = await prisma.image.findFirst({
      where: { id: imageId, userId: session.user.id },
      select: { secureUrl: true, aspectRatio: true },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Fetch image
    const imageResponse = await fetch(image.secureUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 500 }
      );
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Estimate size
    const estimatedSize = await ImageOptimizer.estimateFileSize(
      imageBuffer,
      image.aspectRatio as AspectRatioType,
      quality
    );

    // Get optimal quality for 1.6MB
    const optimalQuality = await ImageOptimizer.calculateOptimalQuality(
      imageBuffer,
      image.aspectRatio as AspectRatioType,
      1600000
    );

    return NextResponse.json({
      estimatedSize,
      estimatedSizeFormatted: formatBytes(estimatedSize),
      withinLimit: estimatedSize <= 1600000,
      optimalQuality,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    console.error("Error estimating size:", error);
    return NextResponse.json(
      { error: "Failed to estimate size" },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
