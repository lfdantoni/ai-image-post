import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  InstagramAPIService,
  InstagramAPIError,
  TokenExpiredError,
} from "@/lib/instagram-api";

export const dynamic = "force-dynamic";

/**
 * POST /api/instagram/posts/[id]/sync
 * Synchronizes metrics for a specific published post from Instagram
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;

    // Get the published post
    const publishedPost = await prisma.publishedPost.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        instagramAccount: true,
      },
    });

    if (!publishedPost) {
      return NextResponse.json(
        { error: "Published post not found" },
        { status: 404 }
      );
    }

    // Check if Instagram account is still connected
    if (!publishedPost.instagramAccount) {
      return NextResponse.json(
        { error: "Instagram account not found. It may have been disconnected." },
        { status: 400 }
      );
    }

    // Check token expiration
    if (publishedPost.instagramAccount.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        {
          error: "Instagram access token has expired. Please reconnect your account.",
          needsReconnect: true,
        },
        { status: 400 }
      );
    }

    // Create Instagram service
    const instagramService = new InstagramAPIService(
      publishedPost.instagramAccount.accessToken,
      publishedPost.instagramAccount.instagramUserId
    );

    try {
      // Fetch latest metrics from Instagram
      const insights = await instagramService.getMediaInsights(
        publishedPost.instagramMediaId
      );

      // Update metrics in database
      const updatedPost = await prisma.publishedPost.update({
        where: { id },
        data: {
          likesCount: insights.likes ?? publishedPost.likesCount,
          commentsCount: insights.comments ?? publishedPost.commentsCount,
          reachCount: insights.reach ?? publishedPost.reachCount,
          impressionsCount: insights.impressions ?? publishedPost.impressionsCount,
          savedCount: insights.saved ?? publishedPost.savedCount,
          metricsUpdatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        metrics: {
          likes: updatedPost.likesCount,
          comments: updatedPost.commentsCount,
          reach: updatedPost.reachCount,
          impressions: updatedPost.impressionsCount,
          saved: updatedPost.savedCount,
          engagement: insights.engagement,
          updatedAt: updatedPost.metricsUpdatedAt,
        },
      });
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        return NextResponse.json(
          {
            error: "Instagram access token has expired. Please reconnect your account.",
            needsReconnect: true,
          },
          { status: 400 }
        );
      }

      if (err instanceof InstagramAPIError) {
        // The post might have been deleted from Instagram
        if (err.code === 100) {
          return NextResponse.json(
            {
              error: "This post may have been deleted from Instagram.",
              code: "POST_NOT_FOUND",
            },
            { status: 404 }
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
    console.error("Error syncing post metrics:", error);
    return NextResponse.json(
      { error: "Failed to sync metrics" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/instagram/posts/sync-all (handled separately)
 * This is implemented as a different route for clarity
 */
