import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isDriveEnabled } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  autoSyncOnExport: z.boolean().optional(),
  backupOriginals: z.boolean().optional(),
  includeMetadataJson: z.boolean().optional(),
  folderOrganization: z.enum(["date", "project", "flat"]).optional(),
});

/**
 * GET /api/drive/settings
 * Get Drive settings
 */
export async function GET() {
  try {
    // Check if Drive is enabled
    if (!isDriveEnabled()) {
      return NextResponse.json(
        { error: "Google Drive is disabled" },
        { status: 403 }
      );
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { driveSettings: true },
    });

    const defaultSettings = {
      autoSyncOnExport: true,
      backupOriginals: false,
      includeMetadataJson: true,
      folderOrganization: "date",
    };

    return NextResponse.json({
      settings: user?.driveSettings || defaultSettings,
    });
  } catch (error) {
    console.error("Error getting Drive settings:", error);
    return NextResponse.json(
      { error: "Failed to get Drive settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/drive/settings
 * Update Drive settings
 */
export async function PUT(request: NextRequest) {
  try {
    // Check if Drive is enabled
    if (!isDriveEnabled()) {
      return NextResponse.json(
        { error: "Google Drive is disabled" },
        { status: 403 }
      );
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = settingsSchema.parse(body);

    // Get current settings and merge
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { driveSettings: true },
    });

    const currentSettings = (user?.driveSettings as object) || {};
    const newSettings = { ...currentSettings, ...validatedData };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { driveSettings: newSettings },
    });

    return NextResponse.json({
      success: true,
      settings: newSettings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid settings data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating Drive settings:", error);
    return NextResponse.json(
      { error: "Failed to update Drive settings" },
      { status: 500 }
    );
  }
}
