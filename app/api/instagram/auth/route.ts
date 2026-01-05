import { NextResponse } from "next/server";
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

    // Return the auth URL for the client to redirect
    return NextResponse.json({ authUrl: authUrl.toString() });
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
 * Disconnects the Instagram account from the user's profile
 */
export async function DELETE() {
  try {
    // Verify user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Find and delete the Instagram account
    const instagramAccount = await prisma.instagramAccount.findUnique({
      where: { userId },
    });

    if (!instagramAccount) {
      return NextResponse.json(
        { error: "No Instagram account connected" },
        { status: 404 }
      );
    }

    // Delete the Instagram account record
    // This will cascade to delete related PublishedPost records if configured
    await prisma.instagramAccount.delete({
      where: { userId },
    });

    // Note: We don't revoke the token on Facebook's side
    // User can manually revoke access in their Facebook/Instagram settings

    return NextResponse.json({
      success: true,
      message: "Instagram account disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting Instagram:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Instagram account" },
      { status: 500 }
    );
  }
}
