"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Cache con información de expiración
interface CacheEntry {
  blobUrl: string;
  timestamp: number;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
const imageCache = new Map<string, CacheEntry>();
const loadingPromises = new Map<string, Promise<string>>();

// Limpiar cache expirado periódicamente
if (typeof window !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [src, entry] of imageCache.entries()) {
      if (now - entry.timestamp > CACHE_DURATION) {
        URL.revokeObjectURL(entry.blobUrl);
        imageCache.delete(src);
      }
    }
  }, 5 * 60 * 1000); // Verificar cada 5 minutos
}

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function AuthenticatedImage({
  src,
  alt,
  fill = false,
  className,
  onLoad,
  onError,
}: AuthenticatedImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  const retryCountRef = useRef(0);
  const loadImageRef = useRef<((clearCache?: boolean) => Promise<void>) | null>(null);
  const MAX_RETRIES = 2;

  // Actualizar refs cuando cambian las funciones
  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
  }, [onLoad, onError]);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async (clearCache = false) => {
      // Limpiar cache si se solicita (por ejemplo, después de un error)
      if (clearCache) {
        const cached = imageCache.get(src);
        if (cached) {
          URL.revokeObjectURL(cached.blobUrl);
          imageCache.delete(src);
        }
      }

      // Verificar cache válido
      const cached = imageCache.get(src);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < CACHE_DURATION) {
          if (isMounted) {
            setImageUrl(cached.blobUrl);
            setIsLoading(false);
            onLoadRef.current?.();
          }
          return;
        } else {
          // Cache expirado, limpiar
          URL.revokeObjectURL(cached.blobUrl);
          imageCache.delete(src);
        }
      }

      if (isMounted) {
        setIsLoading(true);
        setHasError(false);
      }

      let loadPromise = loadingPromises.get(src);
      
      if (!loadPromise) {
        loadPromise = (async () => {
          try {
            const response = await fetch(src, {
              credentials: "include",
            });

            if (!response.ok) {
              throw new Error(`Failed to load image: ${response.status}`);
            }

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.startsWith("image/")) {
              throw new Error("Response is not an image");
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            // Guardar en cache con timestamp
            imageCache.set(src, {
              blobUrl,
              timestamp: Date.now(),
            });
            loadingPromises.delete(src);
            
            return blobUrl;
          } catch (error) {
            loadingPromises.delete(src);
            throw error;
          }
        })();
        
        loadingPromises.set(src, loadPromise);
      }

      try {
        const blobUrl = await loadPromise;
        if (isMounted) {
          setImageUrl(blobUrl);
          setIsLoading(false);
          retryCountRef.current = 0;
          onLoadRef.current?.();
        }
      } catch (error) {
        console.error("Error loading authenticated image:", error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
          onErrorRef.current?.();
        }
      }
    };

    loadImageRef.current = loadImage;
    loadImage();

    return () => {
      isMounted = false;
    };
  }, [src]);

  const handleImageError = () => {
    // Si el blob URL falla, intentar recargar (puede estar corrupto o revocado)
    retryCountRef.current += 1;
    
    if (retryCountRef.current <= MAX_RETRIES) {
      console.warn(`Image load error, retrying (${retryCountRef.current}/${MAX_RETRIES})...`);
      setHasError(false);
      setIsLoading(true);
      // Usar el ref para acceder a loadImage
      if (loadImageRef.current) {
        loadImageRef.current(true);
      }
    } else {
      setHasError(true);
      onErrorRef.current?.();
    }
  };

  if (hasError) {
    return (
      <div
        className={cn(
          "bg-gray-200 flex items-center justify-center",
          fill && "absolute inset-0",
          className
        )}
      >
        <span className="text-xs text-gray-400">Error al cargar</span>
      </div>
    );
  }

  if (isLoading || !imageUrl) {
    return (
      <div
        className={cn(
          "bg-gray-200 animate-pulse",
          fill && "absolute inset-0",
          className
        )}
      />
    );
  }

  if (fill) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={cn("absolute inset-0 w-full h-full object-cover", className)}
        onError={handleImageError}
      />
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={handleImageError}
    />
  );
}

