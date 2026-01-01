import { NextResponse } from "next/server";
import { auth, getGoogleTokens } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createDriveService, isDriveEnabled } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

/**
 * POST /api/drive/initialize
 * Initialize Drive connection by creating root folder
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

    // Get user's Google tokens
    const tokens = await getGoogleTokens(userId);

    if (!tokens || !tokens.accessToken) {
      // Get account info for debugging
      const account = await prisma.account.findFirst({
        where: {
          userId,
          provider: "google",
        },
        select: {
          scope: true,
          access_token: true,
        },
      });

      const scopeInfo = account?.scope || "no scope found";
      const hasToken = !!account?.access_token;

      console.error("Drive initialization failed:", {
        userId,
        hasToken,
        scope: scopeInfo,
        scopeIncludesDrive: scopeInfo?.includes("drive.file"),
      });

      return NextResponse.json(
        {
          error: "No Drive access. Please reconnect your Google account with Drive permissions.",
          details: {
            hasToken,
            scope: scopeInfo,
            message: hasToken
              ? "Token exists but missing Drive scope. Please revoke app access at https://myaccount.google.com/permissions and sign in again."
              : "No token found. Please sign in again.",
          },
        },
        { status: 400 }
      );
    }

    // Create Drive service
    const driveService = createDriveService(userId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });

    if (!driveService) {
      return NextResponse.json(
        { error: "Failed to create Drive service" },
        { status: 500 }
      );
    }

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

      return NextResponse.json({
        success: true,
        folderId: rootFolderId,
        folderLink,
      });
    } catch (error) {
      console.error("Drive initialization error:", error);
      return NextResponse.json(
        { error: "Failed to initialize Drive. Please check your permissions." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error initializing Drive:", error);
    return NextResponse.json(
      { error: "Failed to initialize Drive" },
      { status: 500 }
    );
  }
}
