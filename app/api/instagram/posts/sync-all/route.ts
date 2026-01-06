import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  InstagramAPIService,
  InstagramAPIError,
  TokenExpiredError,
} from "@/lib/instagram-api";

export const dynamic = "force-dynamic";

// Maximum posts to sync in a single request to avoid rate limits
const MAX_POSTS_TO_SYNC = 50;

/**
 * POST /api/instagram/posts/sync-all
 * Synchronizes metrics for all recent published posts
 *
 * Query parameters:
 * - limit: Maximum number of posts to sync (default: 50, max: 50)
 * - days: Only sync posts from the last N days (default: 7)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      MAX_POSTS_TO_SYNC,
      Math.max(1, parseInt(searchParams.get("limit") || "50"))
    );
    const days = Math.max(1, parseInt(searchParams.get("days") || "7"));

    // Calculate the date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Get the user's Instagram account
    const instagramAccount = await prisma.instagramAccount.findUnique({
      where: { userId },
    });

    if (!instagramAccount) {
      return NextResponse.json(
        { error: "Instagram account not connected" },
        { status: 400 }
      );
    }

    // Check token expiration
    if (instagramAccount.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        {
          error: "Instagram access token has expired. Please reconnect your account.",
          needsReconnect: true,
        },
        { status: 400 }
      );
    }

    // Get recent published posts
    const publishedPosts = await prisma.publishedPost.findMany({
      where: {
        userId,
        publishedAt: {
          gte: dateThreshold,
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: limit,
    });

    if (publishedPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No recent posts to sync",
        synced: 0,
        failed: 0,
      });
    }

    // Create Instagram service
    const instagramService = new InstagramAPIService(
      instagramAccount.accessToken,
      instagramAccount.instagramUserId
    );

    // Sync metrics for each post
    const results = {
      synced: 0,
      failed: 0,
      errors: [] as Array<{ postId: string; error: string }>,
    };

    for (const post of publishedPosts) {
      try {
        const insights = await instagramService.getMediaInsights(
          post.instagramMediaId
        );

        await prisma.publishedPost.update({
          where: { id: post.id },
          data: {
            likesCount: insights.likes ?? post.likesCount,
            commentsCount: insights.comments ?? post.commentsCount,
            reachCount: insights.reach ?? post.reachCount,
            impressionsCount: insights.impressions ?? post.impressionsCount,
            savedCount: insights.saved ?? post.savedCount,
            metricsUpdatedAt: new Date(),
          },
        });

        results.synced++;

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err) {
        results.failed++;

        if (err instanceof TokenExpiredError) {
          // If token expired, stop syncing and return
          return NextResponse.json(
            {
              error: "Instagram access token has expired. Please reconnect your account.",
              needsReconnect: true,
              partialResults: results,
            },
            { status: 400 }
          );
        }

        if (err instanceof InstagramAPIError) {
          results.errors.push({
            postId: post.id,
            error: err.message,
          });
        } else {
          results.errors.push({
            postId: post.id,
            error: "Unknown error",
          });
        }
      }
    }

    // Update last sync time on the Instagram account
    await prisma.instagramAccount.update({
      where: { userId },
      data: {
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      synced: results.synced,
      failed: results.failed,
      total: publishedPosts.length,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error("Error syncing all posts:", error);
    return NextResponse.json(
      { error: "Failed to sync metrics" },
      { status: 500 }
    );
  }
}
