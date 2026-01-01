import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import archiver from "archiver";
import { auth, getGoogleTokens } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ImageOptimizer, AspectRatioType } from "@/lib/image-optimizer";
import { createDriveService, isDriveEnabled } from "@/lib/google-drive";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

const batchExportSchema = z.object({
  imageIds: z.array(z.string()).min(1).max(20),
  options: z.object({
    quality: z.number().min(60).max(100).default(90),
    applySharpening: z.boolean().default(true),
    namingPattern: z.enum(["original", "sequential", "date-id"]).default("sequential"),
    includeMetadata: z.boolean().default(true),
    includeIndex: z.boolean().default(true),
    destination: z.enum(["zip", "drive"]),
    driveFolderId: z.string().optional(),
  }),
});

interface ExportedFile {
  index: number;
  filename: string;
  metadataFile?: string;
  driveFileId?: string;
  size: number;
}

/**
 * Generate filename based on pattern
 */
function generateFilename(
  pattern: "original" | "sequential" | "date-id",
  index: number,
  publicId: string
): string {
  switch (pattern) {
    case "original":
      return `${publicId}.jpg`;
    case "sequential":
      return `export_${String(index + 1).padStart(3, "0")}.jpg`;
    case "date-id":
      const dateStr = new Date().toISOString().split("T")[0];
      return `${dateStr}_${publicId.slice(-8)}.jpg`;
  }
}

/**
 * POST /api/export/batch
 * Export multiple images as ZIP or to Drive
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { imageIds, options } = batchExportSchema.parse(body);

    // Get images from database
    const images = await prisma.image.findMany({
      where: {
        id: { in: imageIds },
        userId,
      },
      include: {
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

    if (images.length === 0) {
      return NextResponse.json({ error: "No images found" }, { status: 404 });
    }

    const exportedFiles: ExportedFile[] = [];
    const processedBuffers: { filename: string; buffer: Buffer; metadata?: object }[] = [];

    // Process each image
    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      // Fetch original image
      const imageResponse = await fetch(image.secureUrl);
      if (!imageResponse.ok) continue;

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // Optimize
      const optimizedBuffer = await ImageOptimizer.optimizeForInstagram({
        input: imageBuffer,
        aspectRatio: image.aspectRatio as AspectRatioType,
        quality: options.quality,
        applySharpening: options.applySharpening,
      });

      const filename = generateFilename(options.namingPattern, i, image.publicId);
      const post = image.postImages[0]?.post;

      // Build metadata
      const metadata = options.includeMetadata
        ? {
            version: "1.0",
            exportedAt: new Date().toISOString(),
            exportedBy: "AIImagePost",
            image: {
              originalName: `${image.publicId}.${image.format}`,
              exportedName: filename,
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
          }
        : undefined;

      processedBuffers.push({
        filename,
        buffer: optimizedBuffer,
        metadata,
      });

      exportedFiles.push({
        index: i + 1,
        filename,
        metadataFile: options.includeMetadata ? filename.replace(".jpg", "_metadata.json") : undefined,
        size: optimizedBuffer.length,
      });
    }

    // Handle ZIP destination
    if (options.destination === "zip") {
      const chunks: Buffer[] = [];

      // Create ZIP archive
      const archive = archiver("zip", { zlib: { level: 9 } });

      // Collect chunks
      archive.on("data", (chunk) => chunks.push(chunk));

      // Add files to archive
      for (const file of processedBuffers) {
        archive.append(file.buffer, { name: file.filename });
        if (file.metadata) {
          archive.append(JSON.stringify(file.metadata, null, 2), {
            name: file.filename.replace(".jpg", "_metadata.json"),
          });
        }
      }

      // Add index file
      if (options.includeIndex) {
        const indexData = {
          version: "1.0",
          exportedAt: new Date().toISOString(),
          exportedBy: "AIImagePost",
          batch: {
            totalImages: exportedFiles.length,
            totalSize: exportedFiles.reduce((sum, f) => sum + f.size, 0),
            destination: "zip",
          },
          files: exportedFiles,
          summary: {
            models: images.reduce((acc, img) => {
              if (img.aiModel) {
                acc[img.aiModel] = (acc[img.aiModel] || 0) + 1;
              }
              return acc;
            }, {} as Record<string, number>),
            aspectRatios: images.reduce((acc, img) => {
              acc[img.aspectRatio] = (acc[img.aspectRatio] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
          },
        };
        archive.append(JSON.stringify(indexData, null, 2), { name: "index.json" });
      }

      await archive.finalize();

      // Wait for all chunks
      const zipBuffer = Buffer.concat(chunks);

      // Log export
      await prisma.exportLog.create({
        data: {
          userId,
          imageIds,
          destination: "zip",
          options: options as object,
          fileSize: zipBuffer.length,
        },
      });

      return NextResponse.json({
        success: true,
        zipFile: {
          name: `export_${new Date().toISOString().split("T")[0]}.zip`,
          data: zipBuffer.toString("base64"),
          size: zipBuffer.length,
          fileCount: exportedFiles.length,
        },
      });
    }

    // Handle Drive destination - check if Drive is enabled
    if (!isDriveEnabled()) {
      return NextResponse.json(
        { error: "Google Drive is disabled" },
        { status: 403 }
      );
    }

    const tokens = await getGoogleTokens(userId);
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json(
        { error: "Drive not connected" },
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
        { error: "Drive not initialized" },
        { status: 400 }
      );
    }

    // Create batch folder
    const batchFolderName = `Batch_${new Date().toISOString().split("T")[0]}_${Date.now().toString(36)}`;
    const exportsFolder = await driveService.ensureSubfolder("Exports", user.driveRootFolderId);
    const batchFolderId = await driveService.createFolder(batchFolderName, exportsFolder);

    const uploadedFiles: { id: string; name: string; webViewLink: string }[] = [];

    // Upload files (max 5 concurrent)
    const BATCH_SIZE = 5;
    for (let i = 0; i < processedBuffers.length; i += BATCH_SIZE) {
      const batch = processedBuffers.slice(i, i + BATCH_SIZE);
      const uploads = batch.map(async (file, batchIndex) => {
        const globalIndex = i + batchIndex;

        // Upload image
        const driveFile = await driveService.uploadFile({
          name: file.filename,
          mimeType: "image/jpeg",
          content: file.buffer,
          parentFolderId: batchFolderId,
        });

        uploadedFiles.push({
          id: driveFile.id,
          name: driveFile.name,
          webViewLink: driveFile.webViewLink,
        });

        exportedFiles[globalIndex].driveFileId = driveFile.id;

        // Upload metadata
        if (file.metadata) {
          await driveService.uploadFile({
            name: file.filename.replace(".jpg", "_metadata.json"),
            mimeType: "application/json",
            content: Buffer.from(JSON.stringify(file.metadata, null, 2)),
            parentFolderId: batchFolderId,
          });
        }

        // Update image record
        await prisma.image.update({
          where: { id: images[globalIndex].id },
          data: {
            driveFileId: driveFile.id,
            driveExportedAt: new Date(),
          },
        });
      });

      await Promise.all(uploads);
    }

    // Upload index file
    if (options.includeIndex) {
      const folderLink = await driveService.getFolderLink(batchFolderId);
      const indexData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: "AIImagePost",
        batch: {
          totalImages: exportedFiles.length,
          totalSize: exportedFiles.reduce((sum, f) => sum + f.size, 0),
          destination: "drive",
          driveFolderId: batchFolderId,
          driveFolderLink: folderLink,
        },
        files: exportedFiles,
        summary: {
          models: images.reduce((acc, img) => {
            if (img.aiModel) {
              acc[img.aiModel] = (acc[img.aiModel] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>),
          aspectRatios: images.reduce((acc, img) => {
            acc[img.aspectRatio] = (acc[img.aspectRatio] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      };

      await driveService.uploadFile({
        name: "index.json",
        mimeType: "application/json",
        content: Buffer.from(JSON.stringify(indexData, null, 2)),
        parentFolderId: batchFolderId,
      });
    }

    // Log export
    await prisma.exportLog.create({
      data: {
        userId,
        imageIds,
        destination: "drive",
        driveFolderId: batchFolderId,
        options: options as object,
        fileSize: exportedFiles.reduce((sum, f) => sum + f.size, 0),
      },
    });

    const folderLink = await driveService.getFolderLink(batchFolderId);

    return NextResponse.json({
      success: true,
      folder: {
        id: batchFolderId,
        name: batchFolderName,
        webViewLink: folderLink,
      },
      files: uploadedFiles,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error batch exporting:", error);
    return NextResponse.json(
      { error: "Failed to export images" },
      { status: 500 }
    );
  }
}
