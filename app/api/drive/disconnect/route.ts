import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isDriveEnabled } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

/**
 * POST /api/drive/disconnect
 * Disconnect Drive (clear folder references, optionally revoke tokens)
 */
export async function POST() {
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

    const userId = session.user.id;

    // Clear Drive-related data from user
    await prisma.user.update({
      where: { id: userId },
      data: {
        driveRootFolderId: null,
        driveConnectedAt: null,
        driveSettings: Prisma.JsonNull,
      },
    });

    // Clear Drive file references from images
    await prisma.image.updateMany({
      where: { userId },
      data: {
        driveFileId: null,
        driveExportedAt: null,
        driveBackupId: null,
      },
    });

    // Note: We don't revoke OAuth tokens here because that would
    // affect the main Google login. Users can revoke access at:
    // https://myaccount.google.com/permissions

    return NextResponse.json({
      success: true,
      message: "Drive disconnected. Your files in Drive remain intact.",
    });
  } catch (error) {
    console.error("Error disconnecting Drive:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Drive" },
      { status: 500 }
    );
  }
}
