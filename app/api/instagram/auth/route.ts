import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Facebook OAuth configuration
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI;
const API_VERSION = process.env.INSTAGRAM_GRAPH_API_VERSION || "v21.0";

// Required scopes for Instagram publishing
const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management"
].join(",");

/**
 * GET /api/instagram/auth
 * Initiates the Instagram OAuth flow by redirecting to Facebook OAuth Dialog
 */
export async function GET() {
  try {
    // Check configuration
    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET || !INSTAGRAM_REDIRECT_URI) {
      return NextResponse.json(
        { error: "Instagram API not configured. Please set FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, and INSTAGRAM_REDIRECT_URI." },
        { status: 500 }
      );
    }

    // Verify user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate state parameter to prevent CSRF
    // We'll include the user ID in the state to verify on callback
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        timestamp: Date.now(),
      })
    ).toString("base64");

    // Build Facebook OAuth URL
    const authUrl = new URL(`https://www.facebook.com/${API_VERSION}/dialog/oauth`);
    authUrl.searchParams.set("client_id", FACEBOOK_APP_ID);
    authUrl.searchParams.set("redirect_uri", INSTAGRAM_REDIRECT_URI);
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);

    // Redirect to the Facebook OAuth URL
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Instagram auth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Instagram authentication" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/instagram/auth
 * Disconnects Instagram account(s) from the user's profile
 * - With ?accountId=xxx: Disconnects specific account
 * - Without accountId: Disconnects ALL accounts (backward compatible)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    if (accountId) {
      // Delete specific account
      const account = await prisma.instagramAccount.findFirst({
        where: { id: accountId, userId },
      });

      if (!account) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 }
        );
      }

      // If deleting the default account, set another as default
      if (account.isDefault) {
        const nextAccount = await prisma.instagramAccount.findFirst({
          where: { userId, id: { not: accountId } },
        });

        if (nextAccount) {
          await prisma.instagramAccount.update({
            where: { id: nextAccount.id },
            data: { isDefault: true },
          });
        }
      }

      await prisma.instagramAccount.delete({
        where: { id: accountId },
      });

      return NextResponse.json({
        success: true,
        message: `Disconnected @${account.instagramUsername}`,
      });
    } else {
      // Delete ALL accounts (backward compatible)
      const count = await prisma.instagramAccount.count({
        where: { userId },
      });

      if (count === 0) {
        return NextResponse.json(
          { error: "No Instagram account connected" },
          { status: 404 }
        );
      }

      await prisma.instagramAccount.deleteMany({
        where: { userId },
      });

      // Note: We don't revoke the token on Facebook's side
      // User can manually revoke access in their Facebook/Instagram settings

      return NextResponse.json({
        success: true,
        message: `Disconnected ${count} Instagram account(s)`,
      });
    }
  } catch (error) {
    console.error("Error disconnecting Instagram:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Instagram account" },
      { status: 500 }
    );
  }
}
