import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth, getGoogleTokens } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ImageOptimizer, AspectRatioType } from "@/lib/image-optimizer";
import { createDriveService, isDriveEnabled } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

const exportSchema = z.object({
  imageId: z.string(),
  options: z.object({
    quality: z.number().min(60).max(100).default(90),
    applySharpening: z.boolean().default(true),
    maxFileSize: z.number().default(1600000),
    includeMetadata: z.boolean().default(true),
    destination: z.enum(["download", "drive"]),
    driveFolderId: z.string().optional(),
  }),
});

/**
 * POST /api/export/image
 * Export a single image optimized for Instagram
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { imageId, options } = exportSchema.parse(body);

    // Get image from database
    const image = await prisma.image.findFirst({
      where: { id: imageId, userId },
      include: {
        tags: true,
        postImages: {
          include: {
            post: {
              select: {
                caption: true,
                hashtags: true,
              },
            },
          },
        },
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Fetch original image from Cloudinary
    const imageResponse = await fetch(image.secureUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image from storage" },
        { status: 500 }
      );
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Optimize for Instagram
    const optimizedBuffer = await ImageOptimizer.optimizeForInstagram({
      input: imageBuffer,
      aspectRatio: image.aspectRatio as AspectRatioType,
      quality: options.quality,
      applySharpening: options.applySharpening,
      maxFileSize: options.maxFileSize,
    });

    // Get post data for caption/hashtags
    const post = image.postImages[0]?.post;

    // Build metadata
    const metadata = options.includeMetadata
      ? {
          version: "1.0",
          exportedAt: new Date().toISOString(),
          exportedBy: "AIImagePost",
          image: {
            originalName: `${image.publicId}.${image.format}`,
            exportedName: `${image.publicId}_optimized.jpg`,
            dimensions: ImageOptimizer.getDimensions(image.aspectRatio as AspectRatioType),
            aspectRatio: image.aspectRatio,
            format: "JPEG",
            quality: options.quality,
            fileSize: optimizedBuffer.length,
          },
          content: {
            caption: post?.caption || null,
            hashtags: post?.hashtags || [],
            hashtagsFormatted: post?.hashtags?.map((h) => `#${h}`).join(" ") || "",
          },
          aiGeneration: {
            prompt: image.prompt || null,
            negativePrompt: image.negativePrompt || null,
            model: image.aiModel || null,
            modelVersion: image.aiModelVersion || null,
            isAIGenerated: !!image.aiModel,
          },
          instagram: {
            disclosureRequired: !!image.aiModel,
            suggestedAltText: image.prompt ? `AI-generated: ${image.prompt.substring(0, 100)}` : null,
          },
        }
      : null;

    // Handle destination
    if (options.destination === "download") {
      // Log export
      await prisma.exportLog.create({
        data: {
          userId,
          imageId,
          destination: "download",
          options: options as object,
          fileSize: optimizedBuffer.length,
        },
      });

      return NextResponse.json({
        success: true,
        file: {
          name: `${image.publicId}_optimized.jpg`,
          mimeType: "image/jpeg",
          data: optimizedBuffer.toString("base64"),
          size: optimizedBuffer.length,
        },
        metadata,
      });
    }

    // Drive upload - check if Drive is enabled
    if (!isDriveEnabled()) {
      return NextResponse.json(
        { error: "Google Drive is disabled" },
        { status: 403 }
      );
    }

    const tokens = await getGoogleTokens(userId);
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json(
        { error: "Drive not connected. Please connect your Google Drive first." },
        { status: 400 }
      );
    }

    const driveService = createDriveService(userId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });

    if (!driveService) {
      return NextResponse.json(
        { error: "Failed to connect to Drive" },
        { status: 500 }
      );
    }

    // Get user's root folder
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { driveRootFolderId: true },
    });

    // If Drive is not initialized but user has tokens, initialize automatically
    if (!user?.driveRootFolderId) {
      try {
        // Ensure root folder exists
        const rootFolderId = await driveService.ensureRootFolder();

        // Get folder link
        const folderLink = await driveService.getFolderLink(rootFolderId);

        // Update user with root folder ID
        await prisma.user.update({
          where: { id: userId },
          data: {
            driveRootFolderId: rootFolderId,
            driveConnectedAt: new Date(),
            driveSettings: {
              autoSyncOnExport: true,
              backupOriginals: false,
              includeMetadataJson: true,
              folderOrganization: "date",
            },
          },
        });

        // Refresh user data
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: { driveRootFolderId: true },
        });
      } catch (error) {
        console.error("Error auto-initializing Drive:", error);
        return NextResponse.json(
          { error: "Failed to initialize Drive. Please try connecting Drive first." },
          { status: 500 }
        );
      }
    }

    if (!user?.driveRootFolderId) {
      return NextResponse.json(
        { error: "Drive not initialized. Please initialize Drive first." },
        { status: 400 }
      );
    }

    // Get or use specified folder
    const folderId = options.driveFolderId || (await driveService.getExportFolder(user.driveRootFolderId));

    // Upload image
    const fileName = `${image.publicId}_optimized.jpg`;
    const driveFile = await driveService.uploadFile({
      name: fileName,
      mimeType: "image/jpeg",
      content: optimizedBuffer,
      parentFolderId: folderId,
      description: image.prompt || undefined,
    });

    // Upload metadata if requested
    let metadataFile = null;
    if (metadata) {
      metadataFile = await driveService.uploadFile({
        name: `${image.publicId}_metadata.json`,
        mimeType: "application/json",
        content: Buffer.from(JSON.stringify(metadata, null, 2)),
        parentFolderId: folderId,
      });
    }

    // Update image record
    await prisma.image.update({
      where: { id: imageId },
      data: {
        driveFileId: driveFile.id,
        driveExportedAt: new Date(),
      },
    });

    // Log export
    await prisma.exportLog.create({
      data: {
        userId,
        imageId,
        destination: "drive",
        driveFileId: driveFile.id,
        driveFolderId: folderId,
        options: options as object,
        fileSize: optimizedBuffer.length,
      },
    });

    return NextResponse.json({
      success: true,
      driveFile: {
        id: driveFile.id,
        name: driveFile.name,
        webViewLink: driveFile.webViewLink,
        size: driveFile.size,
      },
      metadataFile: metadataFile
        ? {
            id: metadataFile.id,
            name: metadataFile.name,
            webViewLink: metadataFile.webViewLink,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error exporting image:", error);
    return NextResponse.json(
      { error: "Failed to export image" },
      { status: 500 }
    );
  }
}
