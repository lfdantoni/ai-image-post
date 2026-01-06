import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateProxyUrls } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

/**
 * GET /api/instagram/posts
 * Lists all posts published to Instagram by the authenticated user
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Sort field - "publishedAt" | "likes" | "comments" (default: "publishedAt")
 * - sortOrder: Sort direction - "asc" | "desc" (default: "desc")
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const sortBy = searchParams.get("sortBy") || "publishedAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const skip = (page - 1) * limit;

    // Build orderBy based on sortBy parameter
    let orderBy: Record<string, "asc" | "desc">;
    switch (sortBy) {
      case "likes":
        orderBy = { likesCount: sortOrder };
        break;
      case "comments":
        orderBy = { commentsCount: sortOrder };
        break;
      case "publishedAt":
      default:
        orderBy = { publishedAt: sortOrder };
        break;
    }

    // Fetch published posts with related data
    const [publishedPosts, total] = await Promise.all([
      prisma.publishedPost.findMany({
        where: { userId },
        include: {
          post: {
            include: {
              images: {
                include: { image: true },
                orderBy: { order: "asc" },
                take: 1, // Only get the first image for thumbnail
              },
            },
          },
          instagramAccount: {
            select: {
              instagramUsername: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.publishedPost.count({ where: { userId } }),
    ]);

    // Transform posts to include proxy URLs
    const posts = publishedPosts.map((publishedPost) => {
      const firstImage = publishedPost.post?.images[0]?.image;

      return {
        id: publishedPost.id,
        postId: publishedPost.postId,
        instagramMediaId: publishedPost.instagramMediaId,
        permalink: publishedPost.permalink,
        mediaType: publishedPost.mediaType,
        caption: publishedPost.caption,
        hashtags: publishedPost.hashtags,
        thumbnail: firstImage
          ? {
              ...generateProxyUrls(firstImage.id),
              width: firstImage.width,
              height: firstImage.height,
            }
          : publishedPost.thumbnailUrl
          ? { url: publishedPost.thumbnailUrl }
          : null,
        metrics: {
          likes: publishedPost.likesCount,
          comments: publishedPost.commentsCount,
          reach: publishedPost.reachCount,
          impressions: publishedPost.impressionsCount,
          saved: publishedPost.savedCount,
          updatedAt: publishedPost.metricsUpdatedAt,
        },
        publishedAt: publishedPost.publishedAt,
        createdAt: publishedPost.createdAt,
        instagramUsername: publishedPost.instagramAccount?.instagramUsername,
      };
    });

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + publishedPosts.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching Instagram posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch Instagram posts" },
      { status: 500 }
    );
  }
}
