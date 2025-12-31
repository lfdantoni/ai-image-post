import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePrivateUrl, generatePrivateThumbnailUrl } from "@/lib/cloudinary";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.error("Unauthorized access to image serve endpoint");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isThumbnail = searchParams.get("thumbnail") === "true";

    const image = await prisma.image.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!image) {
      console.error(`Image not found: ${id} for user: ${session.user.id}`);
      return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }

    console.log(`Serving image: ${id}, publicId: ${image.publicId}, thumbnail: ${isThumbnail}`);

    // Verificar que la imagen tenga publicId
    if (!image.publicId) {
      console.error("Image missing publicId:", image.id);
      return NextResponse.json(
        { error: "Imagen no válida: falta publicId" },
        { status: 500 }
      );
    }

    // Generar URL firmada privada para obtener la imagen de Cloudinary
    const cloudinaryUrl = isThumbnail
      ? generatePrivateThumbnailUrl(image.publicId)
      : generatePrivateUrl(image.publicId);

    // Fetch la imagen desde Cloudinary
    const imageResponse = await fetch(cloudinaryUrl);

    if (!imageResponse.ok) {
      console.error(
        "Error fetching from Cloudinary:",
        imageResponse.status,
        imageResponse.statusText,
        "URL:",
        cloudinaryUrl
      );
      return NextResponse.json(
        {
          error: "Error al obtener imagen de Cloudinary",
          details: `Status: ${imageResponse.status}`,
        },
        { status: 500 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    if (!imageBuffer || imageBuffer.byteLength === 0) {
      console.error("Received null or empty buffer from Cloudinary");
      return NextResponse.json(
        { error: "La imagen recibida está vacía" },
        { status: 500 }
      );
    }

    const contentType =
      imageResponse.headers.get("content-type") ||
      `image/${image.format || "jpeg"}`;

    // Devolver la imagen con headers de cache
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": imageBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return NextResponse.json(
      { error: "Error al servir imagen" },
      { status: 500 }
    );
  }
}
