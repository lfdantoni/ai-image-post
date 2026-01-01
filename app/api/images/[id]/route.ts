import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cloudinary, generateProxyUrls } from "@/lib/cloudinary";
import { z } from "zod";

const updateSchema = z.object({
  prompt: z.string().optional(),
  negativePrompt: z.string().optional(),
  aiModel: z.string().optional(),
  aiModelVersion: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const image = await prisma.image.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        tags: true,
        postImages: {
          include: {
            post: {
              select: {
                caption: true,
                hashtags: true,
              },
            },
          },
        },
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }

    // Generar URLs del proxy interno para acceso seguro
    const proxyUrls = generateProxyUrls(image.id);
    const imageWithProxyUrls = {
      ...image,
      secureUrl: proxyUrls.url,
      thumbnailUrl: proxyUrls.thumbnailUrl,
    };

    return NextResponse.json({ image: imageWithProxyUrls });
  } catch (error) {
    console.error("Error fetching image:", error);
    return NextResponse.json(
      { error: "Error al obtener imagen" },
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
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    const existingImage = await prisma.image.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingImage) {
      return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }

    let tagConnections: { id: string }[] = [];
    if (validatedData.tags) {
      tagConnections = await Promise.all(
        validatedData.tags.map(async (tagName) => {
          const tag = await prisma.tag.upsert({
            where: { name: tagName.toLowerCase() },
            update: {},
            create: { name: tagName.toLowerCase() },
          });
          return { id: tag.id };
        })
      );
    }

    const image = await prisma.image.update({
      where: { id },
      data: {
        prompt: validatedData.prompt,
        negativePrompt: validatedData.negativePrompt,
        aiModel: validatedData.aiModel,
        aiModelVersion: validatedData.aiModelVersion,
        ...(validatedData.tags && {
          tags: {
            set: tagConnections,
          },
        }),
      },
      include: {
        tags: true,
      },
    });

    // Generar URLs del proxy interno para la respuesta
    const proxyUrls = generateProxyUrls(image.id);
    const imageWithProxyUrls = {
      ...image,
      secureUrl: proxyUrls.url,
      thumbnailUrl: proxyUrls.thumbnailUrl,
    };

    return NextResponse.json({ image: imageWithProxyUrls });
  } catch (error) {
    console.error("Error updating image:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al actualizar imagen" },
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
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const image = await prisma.image.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }

    // Eliminar imagen privada de Cloudinary
    await cloudinary.uploader.destroy(image.publicId, {
      type: "private",
      invalidate: true,
    });

    await prisma.image.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Error al eliminar imagen" },
      { status: 500 }
    );
  }
}
