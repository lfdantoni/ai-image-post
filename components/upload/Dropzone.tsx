"use client";

import { useCallback, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { Upload, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
}

const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const MAX_SIZE_DEFAULT = 8 * 1024 * 1024; // 8MB

export function Dropzone({
  onFilesAccepted,
  maxFiles = 10,
  maxSize = MAX_SIZE_DEFAULT,
  className,
}: DropzoneProps) {
  const [errors, setErrors] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setErrors([]);

      if (rejectedFiles.length > 0) {
        const newErrors = rejectedFiles.map((rejection) => {
          const error = rejection.errors[0];
          if (error.code === "file-too-large") {
            return `${rejection.file.name}: El archivo excede 8MB`;
          }
          if (error.code === "file-invalid-type") {
            return `${rejection.file.name}: Formato no soportado`;
          }
          return `${rejection.file.name}: ${error.message}`;
        });
        setErrors(newErrors);
      }

      if (acceptedFiles.length > 0) {
        onFilesAccepted(acceptedFiles);
      }
    },
    [onFilesAccepted]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize,
    maxFiles,
    multiple: true,
  });

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center",
          "w-full min-h-[300px] p-8",
          "border-2 border-dashed rounded-xl",
          "cursor-pointer transition-all duration-200",
          "bg-gray-50 hover:bg-gray-100",
          {
            "border-gray-300 hover:border-primary": !isDragActive,
            "border-primary bg-primary/5 scale-[1.02]": isDragAccept,
            "border-red-500 bg-red-50": isDragReject,
          }
        )}
      >
        <input {...getInputProps()} />

        <div
          className={cn(
            "flex flex-col items-center gap-4 text-center",
            "transition-transform duration-200",
            { "scale-110": isDragActive }
          )}
        >
          <div
            className={cn(
              "p-4 rounded-full",
              "bg-primary/10 text-primary",
              { "bg-red-100 text-red-500": isDragReject }
            )}
          >
            <Upload className="w-8 h-8" />
          </div>

          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragActive
                ? isDragReject
                  ? "Archivo no válido"
                  : "Suelta aquí tu imagen"
                : "Arrastra tu imagen aquí"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              o{" "}
              <span className="text-primary font-medium hover:underline">
                selecciona un archivo
              </span>
            </p>
          </div>

          <div className="flex gap-2 text-xs text-gray-400">
            <span className="px-2 py-1 bg-gray-100 rounded">PNG</span>
            <span className="px-2 py-1 bg-gray-100 rounded">JPG</span>
            <span className="px-2 py-1 bg-gray-100 rounded">WebP</span>
            <span className="px-2 py-1 bg-gray-100 rounded">Máx 8MB</span>
          </div>
        </div>

        {isDragActive && (
          <div className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse pointer-events-none" />
        )}
      </div>

      {errors.length > 0 && (
        <div className="mt-4 space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
              <button
                onClick={() =>
                  setErrors((prev) => prev.filter((_, i) => i !== index))
                }
                className="ml-auto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
