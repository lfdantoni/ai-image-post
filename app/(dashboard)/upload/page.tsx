"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Dropzone } from "@/components/upload/Dropzone";
import { UploadPreview } from "@/components/upload/UploadPreview";
import { ImageCropper } from "@/components/upload/ImageCropper";
import { PromptInput } from "@/components/upload/PromptInput";
import { AIModelSelector } from "@/components/upload/AIModelSelector";
import { TagInput } from "@/components/upload/TagInput";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useImageUpload } from "@/hooks/useImageUpload";
import type { UploadFile } from "@/types";
import type { AspectRatioKey } from "@/lib/instagram-formats";

interface ImageMetadata {
  prompt: string;
  negativePrompt: string;
  aiModel: string;
  aiModelVersion: string;
  tags: string[];
  aspectRatio: AspectRatioKey;
  croppedBlob?: Blob;
}

export default function UploadPage() {
  const router = useRouter();
  const { upload, isUploading } = useImageUpload();

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, ImageMetadata>>({});

  const handleFilesAccepted = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
      progress: 0,
    }));

    const newMetadata: Record<string, ImageMetadata> = {};
    newFiles.forEach((f) => {
      newMetadata[f.id] = {
        prompt: "",
        negativePrompt: "",
        aiModel: "",
        aiModelVersion: "",
        tags: [],
        aspectRatio: "portrait",
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);
    setMetadata((prev) => ({ ...prev, ...newMetadata }));

    if (newFiles.length === 1) {
      setEditingFileId(newFiles[0].id);
    }
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
    setMetadata((prev) => {
      const newMetadata = { ...prev };
      delete newMetadata[id];
      return newMetadata;
    });
  }, []);

  const handleEditFile = useCallback((id: string) => {
    setEditingFileId(id);
  }, []);

  const handleCropComplete = useCallback(
    (croppedBlob: Blob, cropData: { aspect: AspectRatioKey }) => {
      if (editingFileId) {
        setMetadata((prev) => ({
          ...prev,
          [editingFileId]: {
            ...prev[editingFileId],
            aspectRatio: cropData.aspect,
            croppedBlob,
          },
        }));

        const newPreview = URL.createObjectURL(croppedBlob);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === editingFileId
              ? { ...f, preview: newPreview }
              : f
          )
        );
      }
    },
    [editingFileId]
  );

  const handleUploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");

    for (const file of pendingFiles) {
      const fileMeta = metadata[file.id];
      if (!fileMeta) continue;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: "uploading" as const, progress: 0 } : f
        )
      );

      const blobToUpload = fileMeta.croppedBlob || file.file;
      const result = await upload(blobToUpload, {
        prompt: fileMeta.prompt || undefined,
        negativePrompt: fileMeta.negativePrompt || undefined,
        aiModel: fileMeta.aiModel || undefined,
        aiModelVersion: fileMeta.aiModelVersion || undefined,
        tags: fileMeta.tags.length > 0 ? fileMeta.tags : undefined,
        aspectRatio: fileMeta.aspectRatio,
      });

      if (result) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "success" as const, progress: 100 } : f
          )
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "error" as const, error: "Error al subir" }
              : f
          )
        );
      }
    }

    const allSuccess = files.every(
      (f) => f.status === "success" || metadata[f.id]?.croppedBlob
    );
    if (allSuccess && files.length > 0) {
      setTimeout(() => {
        router.push("/gallery");
      }, 1000);
    }
  };

  const editingFile = files.find((f) => f.id === editingFileId);
  const editingMeta = editingFileId ? metadata[editingFileId] : null;
  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Subir imagen</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <Dropzone onFilesAccepted={handleFilesAccepted} />
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Imágenes seleccionadas ({files.length})
              </h2>
              {pendingCount > 0 && (
                <Button onClick={handleUploadAll} isLoading={isUploading}>
                  Subir {pendingCount > 1 ? `${pendingCount} imágenes` : "imagen"}
                </Button>
              )}
            </div>
            <UploadPreview
              files={files}
              onRemove={handleRemoveFile}
              onEdit={handleEditFile}
            />
          </CardContent>
        </Card>
      )}

      <Modal
        isOpen={!!editingFile && !!editingMeta}
        onClose={() => setEditingFileId(null)}
        title="Edit image"
        size="xl"
      >
        {editingFile && editingMeta && (
          <div className="flex flex-col lg:flex-row gap-6 p-6">
            <div className="flex-1 min-h-[400px]">
              <ImageCropper
                imageSrc={editingFile.preview}
                onCropComplete={handleCropComplete}
                onCancel={() => setEditingFileId(null)}
                initialAspect={editingMeta.aspectRatio}
              />
            </div>

            <div className="flex-1 space-y-6">
              <PromptInput
                value={editingMeta.prompt}
                onChange={(prompt) =>
                  setMetadata((prev) => ({
                    ...prev,
                    [editingFileId!]: { ...prev[editingFileId!], prompt },
                  }))
                }
                negativePrompt={editingMeta.negativePrompt}
                onNegativePromptChange={(negativePrompt) =>
                  setMetadata((prev) => ({
                    ...prev,
                    [editingFileId!]: { ...prev[editingFileId!], negativePrompt },
                  }))
                }
              />

              <AIModelSelector
                model={editingMeta.aiModel}
                version={editingMeta.aiModelVersion}
                onModelChange={(aiModel) =>
                  setMetadata((prev) => ({
                    ...prev,
                    [editingFileId!]: { ...prev[editingFileId!], aiModel },
                  }))
                }
                onVersionChange={(aiModelVersion) =>
                  setMetadata((prev) => ({
                    ...prev,
                    [editingFileId!]: { ...prev[editingFileId!], aiModelVersion },
                  }))
                }
              />

              <TagInput
                tags={editingMeta.tags}
                onTagsChange={(tags) =>
                  setMetadata((prev) => ({
                    ...prev,
                    [editingFileId!]: { ...prev[editingFileId!], tags },
                  }))
                }
                suggestions={["fantasy", "landscape", "portrait", "abstract", "anime", "realistic"]}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
