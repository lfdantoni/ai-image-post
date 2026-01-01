import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isDriveEnabled } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

/**
 * GET /api/drive/debug
 * Debug endpoint to check Drive connection status and tokens
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get account info
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: "google",
      },
      select: {
        id: true,
        scope: true,
        access_token: true,
        refresh_token: true,
        expires_at: true,
        providerAccountId: true,
      },
    });

    const driveEnabled = isDriveEnabled();
    const scopeString = account?.scope || "";
    const hasDriveScope = 
      scopeString.includes("drive.file") || 
      scopeString.includes("https://www.googleapis.com/auth/drive.file");

    return NextResponse.json({
      driveEnabled,
      hasAccount: !!account,
      hasAccessToken: !!account?.access_token,
      hasRefreshToken: !!account?.refresh_token,
      hasDriveScope,
      scope: scopeString,
      scopeLength: scopeString.length,
      expiresAt: account?.expires_at,
      providerAccountId: account?.providerAccountId,
      message: !account
        ? "No Google account found. Please sign in with Google."
        : !hasDriveScope
        ? "Account found but missing Drive scope. Please revoke app access at https://myaccount.google.com/permissions and sign in again."
        : !account.access_token
        ? "Account found but no access token. Please sign in again."
        : "Account and tokens look good!",
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      { error: "Failed to get debug info", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

