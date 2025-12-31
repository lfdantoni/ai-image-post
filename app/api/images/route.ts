import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateProxyUrls } from "@/lib/cloudinary";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const aiModel = searchParams.get("aiModel") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    const where: {
      userId: string;
      OR?: { prompt?: { contains: string; mode: "insensitive" }; tags?: { some: { name: { contains: string; mode: "insensitive" } } } }[];
      aiModel?: string;
    } = {
      userId: session.user.id,
    };

    if (search) {
      where.OR = [
        { prompt: { contains: search, mode: "insensitive" } },
        { tags: { some: { name: { contains: search, mode: "insensitive" } } } },
      ];
    }

    if (aiModel) {
      where.aiModel = aiModel;
    }

    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        include: {
          tags: true,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.image.count({ where }),
    ]);

    // Generar URLs del proxy interno para cada imagen
    const imagesWithProxyUrls = images.map((image) => {
      const proxyUrls = generateProxyUrls(image.id);
      return {
        ...image,
        secureUrl: proxyUrls.url,
        thumbnailUrl: proxyUrls.thumbnailUrl,
      };
    });

    return NextResponse.json({
      images: imagesWithProxyUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + images.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Error al obtener imágenes" },
      { status: 500 }
    );
  }
}
