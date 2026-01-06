import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateProxyUrls } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

/**
 * GET /api/instagram/posts/[id]
 * Gets detailed information about a specific published post
 */
export async function GET(
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

    // Fetch the published post with all related data
    const publishedPost = await prisma.publishedPost.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        post: {
          include: {
            images: {
              include: { image: true },
              orderBy: { order: "asc" },
            },
          },
        },
        instagramAccount: {
          select: {
            instagramUsername: true,
            profilePictureUrl: true,
            accountType: true,
          },
        },
      },
    });

    if (!publishedPost) {
      return NextResponse.json(
        { error: "Published post not found" },
        { status: 404 }
      );
    }

    // Transform images to include proxy URLs
    const images = publishedPost.post?.images.map((postImage) => ({
      id: postImage.image.id,
      order: postImage.order,
      ...generateProxyUrls(postImage.image.id),
      width: postImage.image.width,
      height: postImage.image.height,
      aspectRatio: postImage.image.aspectRatio,
    })) || [];

    return NextResponse.json({
      id: publishedPost.id,
      postId: publishedPost.postId,
      instagramMediaId: publishedPost.instagramMediaId,
      permalink: publishedPost.permalink,
      mediaType: publishedPost.mediaType,
      caption: publishedPost.caption,
      hashtags: publishedPost.hashtags,
      images,
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
      account: {
        username: publishedPost.instagramAccount?.instagramUsername,
        profilePictureUrl: publishedPost.instagramAccount?.profilePictureUrl,
        accountType: publishedPost.instagramAccount?.accountType,
      },
    });
  } catch (error) {
    console.error("Error fetching published post:", error);
    return NextResponse.json(
      { error: "Failed to fetch published post" },
      { status: 500 }
    );
  }
}
