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
} {
  return {
    url: `/api/images/${imageId}/serve`,
    thumbnailUrl: `/api/images/${imageId}/serve?thumbnail=true`,
  };
}
