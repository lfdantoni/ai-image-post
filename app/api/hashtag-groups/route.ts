import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createGroupSchema = z.object({
  name: z.string().min(1).max(50),
  hashtags: z.array(z.string()).min(1).max(30),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await prisma.hashtagGroup.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Error fetching hashtag groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch hashtag groups" },
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
    const parsed = createGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { name, hashtags } = parsed.data;

    // Check if group with same name already exists
    const existing = await prisma.hashtagGroup.findUnique({
      where: {
        userId_name: {
          userId: session.user.id,
          name,
        },
      },
    });

    if (existing) {
      // Update existing group
      const updated = await prisma.hashtagGroup.update({
        where: {
          id: existing.id,
        },
        data: {
          hashtags,
        },
      });

      return NextResponse.json({ group: updated });
    }

    // Create new group
    const group = await prisma.hashtagGroup.create({
      data: {
        userId: session.user.id,
        name,
        hashtags,
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("Error creating hashtag group:", error);
    return NextResponse.json(
      { error: "Failed to create hashtag group" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("id");

    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }

    // Verify ownership
    const group = await prisma.hashtagGroup.findFirst({
      where: {
        id: groupId,
        userId: session.user.id,
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    await prisma.hashtagGroup.delete({
      where: {
        id: groupId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting hashtag group:", error);
    return NextResponse.json(
      { error: "Failed to delete hashtag group" },
      { status: 500 }
    );
  }
}
