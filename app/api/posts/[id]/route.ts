import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateProxyUrls } from "@/lib/cloudinary";

const updatePostSchema = z.object({
  imageIds: z.array(z.string()).min(1).max(20).optional(),
  caption: z.string().optional().nullable(),
  hashtags: z.array(z.string()).optional(),
  captionTone: z.string().optional().nullable(),
  captionLanguage: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "READY", "SCHEDULED", "PUBLISHED"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const post = await prisma.post.findFirst({
      where: {
        id,
        userId: session.user.id,
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

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

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

    return NextResponse.json({ post: postWithProxyUrls });
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Check post exists and belongs to user
    const existingPost = await prisma.post.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const { imageIds, caption, hashtags, captionTone, captionLanguage, status } = parsed.data;

    // If updating images, verify they belong to user
    if (imageIds) {
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
    }

    // Update post
    const post = await prisma.post.update({
      where: { id },
      data: {
        ...(caption !== undefined && { caption }),
        ...(hashtags !== undefined && { hashtags }),
        ...(captionTone !== undefined && { captionTone }),
        ...(captionLanguage !== undefined && { captionLanguage }),
        ...(status !== undefined && { status }),
        ...(imageIds !== undefined && {
          type: imageIds.length > 1 ? "CAROUSEL" : "SINGLE",
        }),
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

    // If images were updated, recreate the PostImage relations
    if (imageIds) {
      await prisma.postImage.deleteMany({
        where: { postId: id },
      });

      await prisma.postImage.createMany({
        data: imageIds.map((imageId, index) => ({
          postId: id,
          imageId,
          order: index,
        })),
      });

      // Refetch with updated images
      const updatedPost = await prisma.post.findUnique({
        where: { id },
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

      if (updatedPost) {
        const postWithProxyUrls = {
          ...updatedPost,
          images: updatedPost.images.map((postImage) => ({
            ...postImage,
            image: {
              ...postImage.image,
              ...generateProxyUrls(postImage.image.id),
            },
          })),
        };
        return NextResponse.json({ post: postWithProxyUrls });
      }
    }

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

    return NextResponse.json({ post: postWithProxyUrls });
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const post = await prisma.post.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.post.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
