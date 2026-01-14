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
    const now = new Date();

    // Get ALL user's Instagram accounts
    const instagramAccounts = await prisma.instagramAccount.findMany({
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
        isDefault: true,
        postsPublishedToday: true,
        rateLimitResetAt: true,
        tokenExpiresAt: true,
        connectedAt: true,
        lastSyncAt: true,
      },
      orderBy: [
        { isDefault: "desc" },
        { connectedAt: "asc" },
      ],
    });

    if (instagramAccounts.length === 0) {
      return NextResponse.json({
        configured: true,
        connected: false,
        accounts: [],
        account: null,
        message: "No Instagram account connected",
      });
    }

    // Get published posts count per account
    const publishedPostsCounts = await prisma.publishedPost.groupBy({
      by: ["instagramAccountId"],
      where: { userId },
      _count: true,
    });

    const countsMap = new Map(
      publishedPostsCounts.map(p => [p.instagramAccountId, p._count])
    );

    // Build response for each account
    const accounts = await Promise.all(
      instagramAccounts.map(async (account) => {
        // Check token status
        const tokenExpired = account.tokenExpiresAt < now;
        const tokenExpiresIn = Math.max(
          0,
          Math.floor((account.tokenExpiresAt.getTime() - now.getTime()) / 1000)
        );
        const tokenExpiresDays = Math.floor(tokenExpiresIn / (60 * 60 * 24));
        const tokenExpiringSoon = tokenExpiresDays < 7;

        // Calculate rate limit status
        let postsToday = account.postsPublishedToday;
        let rateLimitResetAt = account.rateLimitResetAt;

        // Reset counter if 24 hours have passed
        if (rateLimitResetAt && rateLimitResetAt <= now) {
          postsToday = 0;
          rateLimitResetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

          // Update in database
          await prisma.instagramAccount.update({
            where: { id: account.id },
            data: {
              postsPublishedToday: 0,
              rateLimitResetAt,
            },
          });
        }

        const postsRemaining = Math.max(0, INSTAGRAM_RATE_LIMITS.maxPostsPerDay - postsToday);

        return {
          id: account.id,
          instagramUserId: account.instagramUserId,
          username: account.instagramUsername,
          profilePictureUrl: account.profilePictureUrl,
          accountType: account.accountType,
          followersCount: account.followersCount,
          isDefault: account.isDefault,
          facebookPage: {
            id: account.facebookPageId,
            name: account.facebookPageName,
          },
          token: {
            expired: tokenExpired,
            expiringSoon: tokenExpiringSoon,
            expiresAt: account.tokenExpiresAt,
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
            publishedPostsCount: countsMap.get(account.id) || 0,
            connectedAt: account.connectedAt,
            lastSyncAt: account.lastSyncAt,
          },
        };
      })
    );

    // Find default account for backward compatibility
    const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];

    return NextResponse.json({
      configured: true,
      connected: true,
      accounts,
      // Backward compatibility: single account object
      account: defaultAccount,
      token: defaultAccount.token,
      rateLimit: defaultAccount.rateLimit,
      stats: defaultAccount.stats,
    });
  } catch (error) {
    console.error("Error checking Instagram status:", error);
    return NextResponse.json(
      { error: "Failed to check Instagram status" },
      { status: 500 }
    );
  }
}
