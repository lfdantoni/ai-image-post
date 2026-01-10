import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export const CLOUDINARY_FOLDERS = {
  originals: "aigram/originals",
  thumbnails: "aigram/thumbnails",
  processed: "aigram/processed",
};

// Duration of signed URLs (1 hour in seconds)
const SIGNED_URL_EXPIRATION = 60 * 60;

/**
 * Generates a signed URL to access a private image
 * Used internally by the server to fetch images from Cloudinary
 */
export function generatePrivateUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  } = {}
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SIGNED_URL_EXPIRATION;

  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    type: "private",
    expires_at: expiresAt,
    ...options,
  });
}

/**
 * Generates a signed URL for thumbnail (internal server use)
 */
export function generatePrivateThumbnailUrl(publicId: string): string {
  return generatePrivateUrl(publicId, {
    width: 400,
    height: 400,
    crop: "fill",
    quality: "auto",
    format: "webp",
  });
}

/**
 * Generates internal proxy URLs for an image
 * These URLs are sent to the client
 */
export function generateProxyUrls(imageId: string): {
  url: string;
  thumbnailUrl: string;
  secureUrl: string;
} {
  return {
    url: `/api/images/${imageId}/serve`,
    thumbnailUrl: `/api/images/${imageId}/serve?thumbnail=true`,
    secureUrl: `/api/images/${imageId}/serve`,
  };
}

/**
 * Generates a temporary public URL for Instagram
 * Instagram requires images to be on publicly accessible URLs
 * This URL is signed and expires after a period (2 hours to allow for processing)
 */
export function generateInstagramPublishUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    format?: "jpg" | "jpeg";
    quality?: number;
  } = {}
): string {
  // Instagram publishing needs 2 hours for the upload + processing time
  const INSTAGRAM_URL_EXPIRATION = 2 * 60 * 60; // 2 hours in seconds
  const expiresAt = Math.floor(Date.now() / 1000) + INSTAGRAM_URL_EXPIRATION;

  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    type: "private",
    resource_type: "image",
    expires_at: expiresAt,
    width: options.width || 1080,
    crop: "limit",
    quality: options.quality || 90,
    format: "jpg", // Force JPG extension in the URL
    flags: "progressive",
  });
}

/**
 * Generates multiple temporary public URLs for an Instagram carousel
 */
export function generateInstagramCarouselUrls(
  publicIds: string[],
  options: {
    width?: number;
    height?: number;
    format?: "jpg" | "jpeg";
    quality?: number;
  } = {}
): string[] {
  return publicIds.map((publicId) => generateInstagramPublishUrl(publicId, options));
}
