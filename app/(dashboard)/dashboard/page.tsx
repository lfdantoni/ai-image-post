import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateProxyUrls } from "@/lib/cloudinary";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Images, Tag, Calendar, Upload, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

async function getStats(userId: string) {
  const totalImages = await prisma.image.count({ where: { userId } });
  const imagesWithPrompts = await prisma.image.count({ where: { userId, prompt: { not: null } } });
  const recentImagesRaw = await prisma.image.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { tags: true },
  });

  // Generar URLs del proxy interno para cada imagen
  const recentImages = recentImagesRaw.map((image) => {
    const proxyUrls = generateProxyUrls(image.id);
    return {
      ...image,
      secureUrl: proxyUrls.url,
      thumbnailUrl: proxyUrls.thumbnailUrl,
    };
  });

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyUploads = await prisma.image.count({
    where: {
      userId,
      createdAt: { gte: oneWeekAgo },
    },
  });

  return { totalImages, imagesWithPrompts, weeklyUploads, recentImages };
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { totalImages, imagesWithPrompts, weeklyUploads, recentImages } =
    await getStats(session.user.id);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome section */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {session.user.name?.split(" ")[0] || "Usuario"}
        </h1>
        <p className="text-gray-500 mt-1">
          Tienes {totalImages} {totalImages === 1 ? "imagen" : "imágenes"} en tu
          galería
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Images className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalImages}</p>
              <p className="text-sm text-gray-500">Total imágenes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="p-3 bg-secondary/10 rounded-lg">
              <Tag className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {imagesWithPrompts}
              </p>
              <p className="text-sm text-gray-500">Con prompts</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{weeklyUploads}</p>
              <p className="text-sm text-gray-500">Esta semana</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent images */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Imágenes recientes
          </h2>
          <Link
            href="/gallery"
            className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1"
          >
            Ver todas
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {recentImages.map((image) => (
              <Link
                key={image.id}
                href={`/image/${image.id}`}
                className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:shadow-lg transition-all duration-200"
              >
                <Image
                  src={image.thumbnailUrl || image.secureUrl}
                  alt=""
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs text-white/80 truncate">
                      {formatDistanceToNow(new Date(image.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Images className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No tienes imágenes aún</p>
              <Link href="/upload" className="mt-4 inline-block">
                <Button>Subir primera imagen</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload CTA */}
      <Link href="/upload" className="block">
        <Card className="border-dashed border-2 border-gray-300 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
          <CardContent className="py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-lg font-medium text-gray-900">
              Subir nueva imagen
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Arrastra archivos o haz clic para seleccionar
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
