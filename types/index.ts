export interface ImageData {
  id: string;
  publicId: string;
  url: string;
  secureUrl: string;
  thumbnailUrl: string | null;
  width: number;
  height: number;
  format: string;
  bytes: number;
  aspectRatio: string;
  prompt: string | null;
  negativePrompt: string | null;
  aiModel: string | null;
  aiModelVersion: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface UploadMetadata {
  prompt?: string;
  negativePrompt?: string;
  aiModel?: string;
  aiModelVersion?: string;
  tags?: string[];
  aspectRatio: "portrait" | "square" | "landscape" | "story";
}

export interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export interface CropData {
  aspect: string;
  crop: { x: number; y: number };
  zoom: number;
  croppedAreaPixels: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}
