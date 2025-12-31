import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudinary, CLOUDINARY_FOLDERS } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";
import { z } from "zod";

const uploadSchema = z.object({
  prompt: z.string().optional(),
  negativePrompt: z.string().optional(),
  aiModel: z.string().optional(),
  aiModelVersion: z.string().optional(),
  tags: z.array(z.string()).optional(),
  aspectRatio: z.enum(["portrait", "square", "landscape", "story"]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metadataStr = formData.get("metadata") as string;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    const metadata = JSON.parse(metadataStr);
    const validatedData = uploadSchema.parse(metadata);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Subir imagen como "private" (solo accesible via API)
    const uploadResult = await cloudinary.uploader.upload(base64, {
      folder: CLOUDINARY_FOLDERS.originals,
      resource_type: "image",
      type: "private", // Imagen privada - solo accesible via API
      transformation: [
        { quality: "auto:best" },
        { fetch_format: "auto" },
      ],
    });

    const tagConnections = validatedData.tags?.length
      ? await Promise.all(
          validatedData.tags.map(async (tagName) => {
            const tag = await prisma.tag.upsert({
              where: { name: tagName.toLowerCase() },
              update: {},
              create: { name: tagName.toLowerCase() },
            });
            return { id: tag.id };
          })
        )
      : [];

    const image = await prisma.image.create({
      data: {
        userId: session.user.id,
        publicId: uploadResult.public_id,
        // Guardar URLs base de Cloudinary (no accesibles directamente)
        url: uploadResult.url,
        secureUrl: uploadResult.secure_url,
        // Thumbnail se servirá via API proxy
        thumbnailUrl: null,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        aspectRatio: validatedData.aspectRatio,
        prompt: validatedData.prompt,
        negativePrompt: validatedData.negativePrompt,
        aiModel: validatedData.aiModel,
        aiModelVersion: validatedData.aiModelVersion,
        tags: {
          connect: tagConnections,
        },
      },
      include: {
        tags: true,
      },
    });

    return NextResponse.json({
      success: true,
      image: {
        id: image.id,
        // Devolver URLs del proxy interno
        url: `/api/images/${image.id}/serve`,
        thumbnailUrl: `/api/images/${image.id}/serve?thumbnail=true`,
        width: image.width,
        height: image.height,
      },
    });
  } catch (error) {
    console.error("Error en upload:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al subir imagen" },
      { status: 500 }
    );
  }
}
