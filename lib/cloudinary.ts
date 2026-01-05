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

// Duración de las URLs firmadas (1 hora en segundos)
const SIGNED_URL_EXPIRATION = 60 * 60;

/**
 * Genera una URL firmada para acceder a una imagen privada
 * Usado internamente por el servidor para obtener imágenes de Cloudinary
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
 * Genera una URL firmada para thumbnail (uso interno del servidor)
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
 * Genera URLs del proxy interno para una imagen
 * Estas URLs son las que se envían al cliente
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
 * Genera una URL pública temporal para Instagram
 * Instagram requiere que las imágenes estén en URLs públicamente accesibles
 * Esta URL es firmada y expira después de un tiempo (2 horas para dar tiempo al proceso)
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
    type: "authenticated", // Use authenticated type for signed URLs
    expires_at: expiresAt,
    width: options.width || 1080,
    crop: "limit", // Don't upscale, only downscale if needed
    quality: options.quality || 90,
    format: options.format || "jpg", // Instagram requires JPEG
    flags: "progressive", // Progressive JPEG for better loading
  });
}

/**
 * Genera múltiples URLs públicas temporales para un carrusel de Instagram
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
