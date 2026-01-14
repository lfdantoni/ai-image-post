import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateInstagramPublishUrl } from "@/lib/cloudinary";
import {
  InstagramAPIService,
  InstagramAPIError,
  TokenExpiredError,
  RateLimitError,
  PermissionError,
  MediaError,
  ValidationError,
  ContainerProcessingError,
  buildErrorResponse,
  createDailyLimitError,
} from "@/lib/instagram-api";
import {
  validateForInstagram,
  formatCaptionWithHashtags,
  INSTAGRAM_RATE_LIMITS,
} from "@/lib/instagram-validation";

export const dynamic = "force-dynamic";

// Request validation schemas
const publishSingleSchema = z.object({
  postId: z.string(),
  accountId: z.string().optional(), // Optional: specific account to publish to
  caption: z.string().optional().default(""),
  hashtags: z.array(z.string()).optional().default([]),
});

const publishCarouselSchema = z.object({
  postId: z.string(),
  accountId: z.string().optional(), // Optional: specific account to publish to
  caption: z.string().optional().default(""),
  hashtags: z.array(z.string()).optional().default([]),
});

/**
 * POST /api/instagram/publish
 * Publishes a post to Instagram
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Verify user authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Step 2: Parse request body early to get accountId
    const body = await request.json();
    const parsed = publishSingleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid request body",
            details: parsed.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { postId, accountId, caption, hashtags } = parsed.data;

    // Step 3: Get the user's Instagram account
    let instagramAccount;

    if (accountId) {
      // Use specified account
      instagramAccount = await prisma.instagramAccount.findFirst({
        where: { id: accountId, userId },
      });

      if (!instagramAccount) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "ACCOUNT_NOT_FOUND",
              message: "Instagram account not found or doesn't belong to you.",
            },
          },
          { status: 404 }
        );
      }
    } else {
      // Use default account
      instagramAccount = await prisma.instagramAccount.findFirst({
        where: { userId, isDefault: true },
      });

      // Fallback to any account if no default set
      if (!instagramAccount) {
        instagramAccount = await prisma.instagramAccount.findFirst({
          where: { userId },
        });
      }
    }

    if (!instagramAccount) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_CONNECTED",
            message: "Instagram account not connected. Please connect your account in Settings.",
          },
        },
        { status: 400 }
      );
    }

    // Step 3: Check token expiration
    if (instagramAccount.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOKEN_EXPIRED",
            message: "Instagram access token has expired. Please reconnect your account.",
          },
        },
        { status: 400 }
      );
    }

    // Step 4: Check rate limit
    const now = new Date();
    let postsToday = instagramAccount.postsPublishedToday;

    // Reset counter if 24 hours have passed
    if (instagramAccount.rateLimitResetAt && instagramAccount.rateLimitResetAt <= now) {
      postsToday = 0;
      await prisma.instagramAccount.update({
        where: { id: instagramAccount.id },
        data: {
          postsPublishedToday: 0,
          rateLimitResetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });
    }

    if (postsToday >= INSTAGRAM_RATE_LIMITS.maxPostsPerDay) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Daily post limit (${INSTAGRAM_RATE_LIMITS.maxPostsPerDay}) reached. Try again tomorrow.`,
          },
        },
        { status: 429 }
      );
    }

    // Step 5: Get the post with images
    const post = await prisma.post.findUnique({
      where: { id: postId, userId },
      include: {
        images: {
          include: { image: true },
          orderBy: { order: "asc" },
        },
        publishedPost: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "POST_NOT_FOUND",
            message: "Post not found or doesn't belong to you.",
          },
        },
        { status: 404 }
      );
    }

    // Check if already published
    if (post.publishedPost) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ALREADY_PUBLISHED",
            message: "This post has already been published to Instagram.",
            permalink: post.publishedPost.permalink,
          },
        },
        { status: 400 }
      );
    }

    if (post.images.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_IMAGES",
            message: "Post has no images to publish.",
          },
        },
        { status: 400 }
      );
    }

    // Step 7: Validate content for Instagram
    const images = post.images.map((pi) => ({
      url: generateInstagramPublishUrl(pi.image.publicId),
      width: pi.image.width,
      height: pi.image.height,
      format: pi.image.format,
      bytes: pi.image.bytes,
    }));

    const validation = await validateForInstagram({
      images,
      caption: caption || post.caption || "",
      hashtags: hashtags.length > 0 ? hashtags : post.hashtags,
      account: {
        isConnected: true,
        tokenExpiresAt: instagramAccount.tokenExpiresAt,
        postsPublishedToday: postsToday,
        rateLimitResetAt: instagramAccount.rateLimitResetAt || undefined,
      },
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Content validation failed",
            details: validation.errors,
          },
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // Step 8: Prepare caption with hashtags
    const finalCaption = caption || post.caption || "";
    const finalHashtags = hashtags.length > 0 ? hashtags : post.hashtags;
    const fullCaption = formatCaptionWithHashtags(finalCaption, finalHashtags);

    // Step 9: Create Instagram service and publish
    const instagramService = new InstagramAPIService(
      instagramAccount.accessToken,
      instagramAccount.instagramUserId
    );

    console.log("------------------------------------------");
    console.log("INSTAGRAM PUBLISH ATTEMPT");
    console.log("Post ID:", postId);
    console.log("Account:", instagramAccount.instagramUsername);

    let result: { mediaId: string; permalink: string };

    try {
      if (post.images.length === 1) {
        // Single image post
        const imageUrl = generateInstagramPublishUrl(post.images[0].image.publicId);
        console.log("GENERATE URL:", imageUrl);
        result = await instagramService.publishSingleImage(imageUrl, fullCaption);
      } else {
        // Carousel post
        const imageUrls = post.images.map((pi) =>
          generateInstagramPublishUrl(pi.image.publicId)
        );
        console.log("GENERATE URLS:", imageUrls);
        result = await instagramService.publishCarousel(imageUrls, fullCaption);
      }
    } catch (err) {
      console.log("PUBLISH ERROR:", err);

      // All Instagram errors now have enhanced properties
      if (err instanceof InstagramAPIError) {
        const errorResponse = {
          success: false,
          error: {
            code: err.code,
            message: err.userMessage,
            technicalMessage: err.message,
            category: err.category,
            needsReconnect: err.needsReconnect,
            retryable: err.retryable,
          },
          needsReconnect: err.needsReconnect,
        };

        // Determine appropriate HTTP status code based on error type
        let statusCode = 400;

        if (err instanceof TokenExpiredError) {
          statusCode = 401; // Unauthorized
        } else if (err instanceof RateLimitError) {
          statusCode = 429; // Too Many Requests
        } else if (err instanceof PermissionError) {
          statusCode = 403; // Forbidden
        } else if (err instanceof MediaError || err instanceof ValidationError) {
          statusCode = 400; // Bad Request
        } else if (err instanceof ContainerProcessingError) {
          statusCode = 422; // Unprocessable Entity
        } else if (err.category === "SERVER") {
          statusCode = 502; // Bad Gateway (Instagram server error)
        } else if (err.category === "NETWORK") {
          statusCode = 503; // Service Unavailable
        }

        return NextResponse.json(errorResponse, { status: statusCode });
      }

      throw err;
    }

    // Step 10: Get media details for timestamp
    const mediaDetails = await instagramService.getMediaDetails(result.mediaId);

    // Step 11: Update post status and create PublishedPost record
    const [updatedPost, publishedPost] = await prisma.$transaction([
      prisma.post.update({
        where: { id: postId },
        data: {
          status: "PUBLISHED",
          caption: finalCaption,
          hashtags: finalHashtags,
        },
      }),
      prisma.publishedPost.create({
        data: {
          userId,
          instagramAccountId: instagramAccount.id,
          instagramUserId: instagramAccount.instagramUserId,
          postId,
          instagramMediaId: result.mediaId,
          permalink: result.permalink,
          mediaType: post.images.length > 1 ? "CAROUSEL" : "IMAGE",
          caption: finalCaption,
          hashtags: finalHashtags,
          thumbnailUrl: generateInstagramPublishUrl(post.images[0].image.publicId),
          publishedAt: new Date(mediaDetails.timestamp),
          likesCount: 0,
          commentsCount: 0,
        },
      }),
      // Update rate limit counter
      prisma.instagramAccount.update({
        where: { id: instagramAccount.id },
        data: {
          postsPublishedToday: postsToday + 1,
          lastSyncAt: new Date(),
        },
      }),
    ]);

    // Step 12: Return success response
    return NextResponse.json({
      success: true,
      instagramMediaId: result.mediaId,
      permalink: result.permalink,
      timestamp: mediaDetails.timestamp,
      post: {
        id: updatedPost.id,
        status: updatedPost.status,
      },
      publishedPost: {
        id: publishedPost.id,
        permalink: publishedPost.permalink,
        publishedAt: publishedPost.publishedAt,
      },
      warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
    });
  } catch (error) {
    console.error("Error publishing to Instagram:", error);

    // Use the standardized error response builder
    const errorResponse = buildErrorResponse(
      error,
      "An unexpected error occurred while publishing."
    );

    return NextResponse.json(
      {
        success: false,
        ...errorResponse,
      },
      { status: 500 }
    );
  }
}
