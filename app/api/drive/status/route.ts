import { NextResponse } from "next/server";
import { auth, getGoogleTokens } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createDriveService, isDriveEnabled } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

/**
 * GET /api/drive/status
 * Check Drive connection status and quota
 */
export async function GET() {
  try {
    // Check if Drive is enabled
    if (!isDriveEnabled()) {
      return NextResponse.json(
        {
          connected: false,
          message: "Google Drive is disabled",
        },
        { status: 403 }
      );
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's Google tokens
    const tokens = await getGoogleTokens(userId);

    if (!tokens || !tokens.accessToken) {
      return NextResponse.json({
        connected: false,
        message: "No Drive access. Please reconnect your Google account.",
      });
    }

    // Get user data for root folder ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        driveRootFolderId: true,
        driveConnectedAt: true,
        driveSettings: true,
      },
    });

    // Create Drive service
    const driveService = createDriveService(userId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });

    if (!driveService) {
      return NextResponse.json({
        connected: false,
        message: "Failed to create Drive service.",
      });
    }

    try {
      // Get storage quota
      const quota = await driveService.getStorageQuota();

      // Get folder link if we have a root folder
      let rootFolderLink: string | undefined;
      if (user?.driveRootFolderId) {
        try {
          rootFolderLink = await driveService.getFolderLink(user.driveRootFolderId);
        } catch {
          // Folder might have been deleted, clear it
          await prisma.user.update({
            where: { id: userId },
            data: { driveRootFolderId: null },
          });
        }
      }

      return NextResponse.json({
        connected: true,
        email: user?.email,
        rootFolderId: user?.driveRootFolderId,
        rootFolderLink,
        connectedAt: user?.driveConnectedAt,
        settings: user?.driveSettings,
        quota,
      });
    } catch (error) {
      // Token might be expired or revoked
      console.error("Drive API error:", error);
      return NextResponse.json({
        connected: false,
        message: "Drive access expired. Please reconnect your account.",
      });
    }
  } catch (error) {
    console.error("Error checking Drive status:", error);
    return NextResponse.json(
      { error: "Failed to check Drive status" },
      { status: 500 }
    );
  }
}
