import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { INSTAGRAM_RATE_LIMITS } from "@/lib/instagram-validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/instagram/status
 * Returns the current Instagram connection status and account information
 */
export async function GET() {
  try {
    // Check configuration
    const isConfigured = !!(
      process.env.FACEBOOK_APP_ID &&
      process.env.FACEBOOK_APP_SECRET &&
      process.env.INSTAGRAM_REDIRECT_URI
    );

    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        connected: false,
        message: "Instagram API not configured",
      });
    }

    // Verify user authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get the user's Instagram account
    const instagramAccount = await prisma.instagramAccount.findUnique({
      where: { userId },
      select: {
        id: true,
        instagramUserId: true,
        instagramUsername: true,
        facebookPageId: true,
        facebookPageName: true,
        profilePictureUrl: true,
        accountType: true,
        followersCount: true,
        postsPublishedToday: true,
        rateLimitResetAt: true,
        tokenExpiresAt: true,
        connectedAt: true,
        lastSyncAt: true,
      },
    });

    if (!instagramAccount) {
      return NextResponse.json({
        configured: true,
        connected: false,
        message: "No Instagram account connected",
      });
    }

    // Check token status
    const now = new Date();
    const tokenExpired = instagramAccount.tokenExpiresAt < now;
    const tokenExpiresIn = Math.max(
      0,
      Math.floor((instagramAccount.tokenExpiresAt.getTime() - now.getTime()) / 1000)
    );
    const tokenExpiresDays = Math.floor(tokenExpiresIn / (60 * 60 * 24));
    const tokenExpiringSoon = tokenExpiresDays < 7;

    // Calculate rate limit status
    let postsToday = instagramAccount.postsPublishedToday;
    let rateLimitResetAt = instagramAccount.rateLimitResetAt;

    // Reset counter if 24 hours have passed
    if (rateLimitResetAt && rateLimitResetAt <= now) {
      postsToday = 0;
      rateLimitResetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Update in database
      await prisma.instagramAccount.update({
        where: { userId },
        data: {
          postsPublishedToday: 0,
          rateLimitResetAt,
        },
      });
    }

    const postsRemaining = Math.max(0, INSTAGRAM_RATE_LIMITS.maxPostsPerDay - postsToday);

    // Get published posts count
    const publishedPostsCount = await prisma.publishedPost.count({
      where: { userId },
    });

    return NextResponse.json({
      configured: true,
      connected: true,
      account: {
        id: instagramAccount.id,
        instagramUserId: instagramAccount.instagramUserId,
        username: instagramAccount.instagramUsername,
        profilePictureUrl: instagramAccount.profilePictureUrl,
        accountType: instagramAccount.accountType,
        followersCount: instagramAccount.followersCount,
        facebookPage: {
          id: instagramAccount.facebookPageId,
          name: instagramAccount.facebookPageName,
        },
      },
      token: {
        expired: tokenExpired,
        expiringSoon: tokenExpiringSoon,
        expiresAt: instagramAccount.tokenExpiresAt,
        expiresInDays: tokenExpiresDays,
      },
      rateLimit: {
        postsToday,
        postsRemaining,
        limit: INSTAGRAM_RATE_LIMITS.maxPostsPerDay,
        resetsAt: rateLimitResetAt,
        percentUsed: Math.round((postsToday / INSTAGRAM_RATE_LIMITS.maxPostsPerDay) * 100),
      },
      stats: {
        publishedPostsCount,
        connectedAt: instagramAccount.connectedAt,
        lastSyncAt: instagramAccount.lastSyncAt,
      },
    });
  } catch (error) {
    console.error("Error checking Instagram status:", error);
    return NextResponse.json(
      { error: "Failed to check Instagram status" },
      { status: 500 }
    );
  }
}
