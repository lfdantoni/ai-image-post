"use client";

import Image from "next/image";
import { X, Check, Loader2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadFile } from "@/types";

interface UploadPreviewProps {
  files: UploadFile[];
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
}

export function UploadPreview({ files, onRemove, onEdit }: UploadPreviewProps) {
  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400">
        <p>Selecciona imágenes para comenzar</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {files.map((file) => (
        <div
          key={file.id}
          className={cn(
            "relative group aspect-square rounded-lg overflow-hidden",
            "border-2 transition-all duration-200",
            {
              "border-gray-200": file.status === "pending",
              "border-primary": file.status === "uploading",
              "border-green-500": file.status === "success",
              "border-red-500": file.status === "error",
            }
          )}
        >
          <Image
            src={file.preview}
            alt={file.file.name}
            fill
            className="object-cover"
          />

          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              "bg-black/40 transition-opacity",
              {
                "opacity-0 group-hover:opacity-100": file.status === "pending",
                "opacity-100": file.status !== "pending",
              }
            )}
          >
            {file.status === "uploading" && (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <span className="text-white text-sm font-medium">
                  {file.progress}%
                </span>
              </div>
            )}

            {file.status === "success" && (
              <div className="p-2 bg-green-500 rounded-full">
                <Check className="w-6 h-6 text-white" />
              </div>
            )}

            {file.status === "error" && (
              <div className="text-center px-2">
                <p className="text-white text-sm">{file.error || "Error"}</p>
              </div>
            )}

            {file.status === "pending" && (
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(file.id)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition"
                >
                  <Edit2 className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => onRemove(file.id)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition"
                >
                  <X className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            )}
          </div>

          {file.status === "uploading" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-xs text-white truncate">{file.file.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
