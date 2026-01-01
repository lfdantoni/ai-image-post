import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateProxyUrls } from "@/lib/cloudinary";

const createPostSchema = z.object({
  imageIds: z.array(z.string()).min(1).max(20),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  captionTone: z.string().optional(),
  captionLanguage: z.string().optional(),
  status: z.enum(["DRAFT", "READY"]).default("DRAFT"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: { userId: string; status?: "DRAFT" | "READY" | "SCHEDULED" | "PUBLISHED" } = {
      userId: session.user.id,
    };

    if (status && ["DRAFT", "READY", "SCHEDULED", "PUBLISHED"].includes(status)) {
      where.status = status as "DRAFT" | "READY" | "SCHEDULED" | "PUBLISHED";
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          images: {
            include: {
              image: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    // Add proxy URLs to images
    const postsWithProxyUrls = posts.map((post) => ({
      ...post,
      images: post.images.map((postImage) => ({
        ...postImage,
        image: {
          ...postImage.image,
          ...generateProxyUrls(postImage.image.id),
        },
      })),
    }));

    return NextResponse.json({
      posts: postsWithProxyUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + posts.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { imageIds, caption, hashtags, captionTone, captionLanguage, status } = parsed.data;

    // Verify all images belong to the user
    const images = await prisma.image.findMany({
      where: {
        id: { in: imageIds },
        userId: session.user.id,
      },
    });

    if (images.length !== imageIds.length) {
      return NextResponse.json(
        { error: "Some images were not found or don't belong to you" },
        { status: 400 }
      );
    }

    const postType = imageIds.length > 1 ? "CAROUSEL" : "SINGLE";

    const post = await prisma.post.create({
      data: {
        userId: session.user.id,
        type: postType,
        caption: caption || null,
        hashtags: hashtags || [],
        captionTone: captionTone || null,
        captionLanguage: captionLanguage || null,
        status,
        images: {
          create: imageIds.map((imageId, index) => ({
            imageId,
            order: index,
          })),
        },
      },
      include: {
        images: {
          include: {
            image: true,
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    // Add proxy URLs
    const postWithProxyUrls = {
      ...post,
      images: post.images.map((postImage) => ({
        ...postImage,
        image: {
          ...postImage.image,
          ...generateProxyUrls(postImage.image.id),
        },
      })),
    };

    return NextResponse.json({ post: postWithProxyUrls }, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
