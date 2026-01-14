import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PUT /api/instagram/accounts/[id]/default
 * Sets the specified Instagram account as the default for publishing
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Verify account belongs to user
    const account = await prisma.instagramAccount.findFirst({
      where: { id, userId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Already default?
    if (account.isDefault) {
      return NextResponse.json({
        success: true,
        message: `@${account.instagramUsername} is already the default account`,
      });
    }

    // Transaction: unset all defaults, set this one
    await prisma.$transaction([
      prisma.instagramAccount.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      prisma.instagramAccount.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `@${account.instagramUsername} is now the default account`,
    });
  } catch (error) {
    console.error("Error setting default account:", error);
    return NextResponse.json(
      { error: "Failed to set default account" },
      { status: 500 }
    );
  }
}
