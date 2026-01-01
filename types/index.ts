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

// Phase 2 Types

export type CaptionTone = "artistic" | "casual" | "professional" | "inspirational";
export type CaptionLength = "short" | "medium" | "long";
export type PostType = "SINGLE" | "CAROUSEL";
export type PostStatus = "DRAFT" | "READY" | "SCHEDULED" | "PUBLISHED";

export interface PostData {
  id: string;
  type: PostType;
  images: PostImageData[];
  caption: string | null;
  hashtags: string[];
  captionTone: string | null;
  captionLanguage: string | null;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string | null;
}

export interface PostImageData {
  id: string;
  imageId: string;
  image: ImageData;
  order: number;
}

export interface HashtagGroupData {
  id: string;
  name: string;
  hashtags: string[];
  createdAt: string;
}

export interface Hashtag {
  tag: string;
  category: "trending" | "niche" | "branded";
  isBanned: boolean;
  selected?: boolean;
}

export interface CaptionGeneratorParams {
  prompt: string;
  imageAnalysis?: string;
  tone: CaptionTone;
  length: CaptionLength;
  includeEmojis: boolean;
  includeQuestion: boolean;
  includeCTA: boolean;
  language: string;
  provider?: "openai" | "gemini";
}

export interface HashtagGeneratorParams {
  prompt: string;
  caption?: string;
  count: number;
  categories: {
    trending: boolean;
    niche: boolean;
    branded: boolean;
  };
  provider?: "openai" | "gemini";
}

export interface GenerationMetadata {
  provider: "openai" | "gemini";
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}
