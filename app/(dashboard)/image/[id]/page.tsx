"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  Download,
  Trash2,
  Copy,
  Check,
  Edit2,
  FileDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ExportModal } from "@/components/export/ExportModal";
import { formatBytes } from "@/lib/utils";
import type { ImageData } from "@/types";

export default function ImageDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [image, setImage] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const response = await fetch(`/api/images/${id}`);
        if (response.ok) {
          const data = await response.json();
          setImage(data.image);
          
          // Load image using fetch to ensure cookies are sent
          const imageResponse = await fetch(data.image.secureUrl, {
            credentials: "include",
          });
          
          if (imageResponse.ok) {
            const contentType = imageResponse.headers.get("content-type");
            if (contentType && contentType.startsWith("image/")) {
              const blob = await imageResponse.blob();
              const url = URL.createObjectURL(blob);
              setImageUrl(url);
            } else {
              // Si no es una imagen, probablemente es un error JSON
              const errorData = await imageResponse.json().catch(() => ({}));
              console.error("Error loading image (not an image):", errorData);
              setImageError(true);
            }
          } else {
            const errorText = await imageResponse.text().catch(() => "");
            console.error("Error loading image:", imageResponse.status, errorText);
            setImageError(true);
          }
        } else {
          router.push("/gallery");
        }
      } catch (error) {
        console.error("Error fetching image:", error);
        router.push("/gallery");
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
    
    // Cleanup: revoke blob URL when component unmounts
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [id, router]);

  const handleCopyPrompt = async () => {
    if (image?.prompt) {
      await navigator.clipboard.writeText(image.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/images/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.push("/gallery");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDownload = async () => {
    if (image?.secureUrl) {
      const response = await fetch(image.secureUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aigram-${image.id}.${image.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!image) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/gallery"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Detalle de imagen</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="relative aspect-[4/5] bg-gray-100">
              {imageError ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500">Error al cargar la imagen</p>
                </div>
              ) : imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-contain"
                  onError={() => {
                    console.error("Error displaying image");
                    setImageError(true);
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-pulse text-gray-400">Cargando imagen...</div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Detalles</h2>

              {image.aiModel && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Modelo IA</p>
                  <Badge variant="primary">
                    {image.aiModel}
                    {image.aiModelVersion && ` ${image.aiModelVersion}`}
                  </Badge>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-1">Fecha de subida</p>
                <p className="text-gray-900">
                  {format(new Date(image.createdAt), "d 'de' MMMM, yyyy", {
                    locale: es,
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Dimensiones</p>
                <p className="text-gray-900">
                  {image.width} x {image.height} ({image.aspectRatio})
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Tamaño</p>
                <p className="text-gray-900">{formatBytes(image.bytes)}</p>
              </div>

              {image.tags && image.tags.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {image.tags.map((tag) => (
                      <Badge key={tag.id} variant="default">
                        #{tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {image.prompt && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-gray-900">Prompt</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPrompt}
                    leftIcon={
                      copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )
                    }
                  >
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {image.prompt}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setShowExportModal(true)}
              className="w-full"
              leftIcon={<FileDown className="w-4 h-4" />}
            >
              Exportar optimizada
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className="w-full"
              leftIcon={<Download className="w-4 h-4" />}
            >
              Descargar original
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar imagen"
        size="sm"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            ¿Estás seguro de que quieres eliminar esta imagen? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
              className="flex-1"
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        imageId={image.id}
        imageUrl={imageUrl || image.secureUrl}
        aspectRatio={image.aspectRatio}
        currentCaption={
          (image as any).postImages?.[0]?.post?.caption || undefined
        }
        currentHashtags={
          (image as any).postImages?.[0]?.post?.hashtags || undefined
        }
        onExportComplete={(result) => {
          if (result.success) {
            setShowExportModal(false);
          }
        }}
      />
    </div>
  );
}
