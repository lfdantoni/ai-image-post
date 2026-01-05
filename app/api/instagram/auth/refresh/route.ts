import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InstagramAPIService, InstagramAPIError } from "@/lib/instagram-api";

export const dynamic = "force-dynamic";

// Facebook OAuth configuration
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!;

/**
 * POST /api/instagram/auth/refresh
 * Refreshes the Instagram long-lived access token
 *
 * Long-lived tokens:
 * - Valid for 60 days
 * - Can be refreshed after 24 hours of being issued
 * - Should be refreshed when close to expiration (< 7 days)
 */
export async function POST() {
  try {
    // Check configuration
    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      return NextResponse.json(
        { error: "Instagram API not configured" },
        { status: 500 }
      );
    }

    // Verify user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get the user's Instagram account
    const instagramAccount = await prisma.instagramAccount.findUnique({
      where: { userId },
    });

    if (!instagramAccount) {
      return NextResponse.json(
        { error: "No Instagram account connected" },
        { status: 404 }
      );
    }

    // Check if token can be refreshed (must be at least 24 hours old)
    const tokenAge = Date.now() - instagramAccount.connectedAt.getTime();
    const minRefreshAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (tokenAge < minRefreshAge) {
      const hoursUntilRefresh = Math.ceil((minRefreshAge - tokenAge) / (60 * 60 * 1000));
      return NextResponse.json(
        {
          error: `Token cannot be refreshed yet. Please wait ${hoursUntilRefresh} more hours.`,
          tokenExpiresAt: instagramAccount.tokenExpiresAt,
        },
        { status: 400 }
      );
    }

    // Check if token is already expired
    if (instagramAccount.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        {
          error: "Token has already expired. Please reconnect your Instagram account.",
          needsReconnect: true,
        },
        { status: 400 }
      );
    }

    try {
      // Refresh the long-lived token
      const { accessToken: newToken, expiresIn } =
        await InstagramAPIService.refreshLongLivedToken(
          instagramAccount.accessToken,
          FACEBOOK_APP_ID,
          FACEBOOK_APP_SECRET
        );

      // Calculate new expiration date
      const newTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      // Update the token in the database
      await prisma.instagramAccount.update({
        where: { userId },
        data: {
          accessToken: newToken,
          tokenExpiresAt: newTokenExpiresAt,
          lastSyncAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Token refreshed successfully",
        tokenExpiresAt: newTokenExpiresAt,
        expiresInDays: Math.floor(expiresIn / (60 * 60 * 24)),
      });
    } catch (err) {
      if (err instanceof InstagramAPIError) {
        // Token might be invalid or revoked
        if (err.code === 190) {
          return NextResponse.json(
            {
              error: "Token has been revoked. Please reconnect your Instagram account.",
              needsReconnect: true,
            },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: err.message },
          { status: 400 }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("Error refreshing Instagram token:", error);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
