import sharp from "sharp";

export type AspectRatioType = "portrait" | "square" | "landscape" | "story";

export interface OptimizeParams {
  input: Buffer;
  aspectRatio: AspectRatioType;
  quality?: number; // 1-100, default 90
  applySharpening?: boolean; // default true
  maxFileSize?: number; // default 1.6MB (1600000 bytes)
  convertToSRGB?: boolean; // default true
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  colorSpace: string;
  size: number;
}

// Instagram dimensions for each aspect ratio
const INSTAGRAM_DIMENSIONS: Record<AspectRatioType, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1350 }, // 4:5
  square: { width: 1080, height: 1080 }, // 1:1
  landscape: { width: 1080, height: 566 }, // 1.91:1
  story: { width: 1080, height: 1920 }, // 9:16
};

// Default max file size (1.6MB to avoid Instagram recompression)
const DEFAULT_MAX_FILE_SIZE = 1600000;

// Default quality
const DEFAULT_QUALITY = 90;

/**
 * Image Optimizer for Instagram-ready exports
 */
export class ImageOptimizer {
  /**
   * Optimize image for Instagram with specified parameters
   */
  static async optimizeForInstagram(params: OptimizeParams): Promise<Buffer> {
    const {
      input,
      aspectRatio,
      quality = DEFAULT_QUALITY,
      applySharpening = true,
      maxFileSize = DEFAULT_MAX_FILE_SIZE,
      convertToSRGB = true,
    } = params;

    const dimensions = INSTAGRAM_DIMENSIONS[aspectRatio];

    let pipeline = sharp(input);

    // Convert to sRGB color space
    if (convertToSRGB) {
      pipeline = pipeline.toColorspace("srgb");
    }

    // Resize to exact Instagram dimensions
    pipeline = pipeline.resize(dimensions.width, dimensions.height, {
      fit: "cover",
      position: "center",
    });

    // Apply subtle sharpening to compensate for Instagram compression
    if (applySharpening) {
      pipeline = pipeline.sharpen({
        sigma: 0.5,
        m1: 0.5,
        m2: 0.5,
      });
    }

    // Export as JPEG with high quality settings
    let outputBuffer = await pipeline
      .jpeg({
        quality,
        chromaSubsampling: "4:4:4", // Better color quality
        mozjpeg: true, // Better compression
      })
      .toBuffer();

    // If file exceeds max size, progressively reduce quality
    if (outputBuffer.length > maxFileSize) {
      outputBuffer = await this.compressToSize(input, aspectRatio, maxFileSize, applySharpening);
    }

    return outputBuffer;
  }

  /**
   * Compress image to target size using binary search for quality
   */
  private static async compressToSize(
    input: Buffer,
    aspectRatio: AspectRatioType,
    targetSize: number,
    applySharpening: boolean
  ): Promise<Buffer> {
    const dimensions = INSTAGRAM_DIMENSIONS[aspectRatio];
    let minQuality = 60;
    let maxQuality = 95;
    let bestBuffer: Buffer | null = null;

    // Binary search for optimal quality
    while (minQuality <= maxQuality) {
      const midQuality = Math.floor((minQuality + maxQuality) / 2);

      let pipeline = sharp(input)
        .toColorspace("srgb")
        .resize(dimensions.width, dimensions.height, {
          fit: "cover",
          position: "center",
        });

      if (applySharpening) {
        pipeline = pipeline.sharpen({ sigma: 0.5, m1: 0.5, m2: 0.5 });
      }

      const buffer = await pipeline
        .jpeg({
          quality: midQuality,
          chromaSubsampling: "4:4:4",
          mozjpeg: true,
        })
        .toBuffer();

      if (buffer.length <= targetSize) {
        bestBuffer = buffer;
        minQuality = midQuality + 1; // Try higher quality
      } else {
        maxQuality = midQuality - 1; // Try lower quality
      }
    }

    // If no valid buffer found, use minimum quality
    if (!bestBuffer) {
      let pipeline = sharp(input)
        .toColorspace("srgb")
        .resize(dimensions.width, dimensions.height, {
          fit: "cover",
          position: "center",
        });

      if (applySharpening) {
        pipeline = pipeline.sharpen({ sigma: 0.5, m1: 0.5, m2: 0.5 });
      }

      bestBuffer = await pipeline
        .jpeg({
          quality: 60,
          chromaSubsampling: "4:4:4",
          mozjpeg: true,
        })
        .toBuffer();
    }

    return bestBuffer;
  }

  /**
   * Create a thumbnail for preview
   */
  static async createThumbnail(input: Buffer, size = 200): Promise<Buffer> {
    return sharp(input)
      .resize(size, size, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 80 })
      .toBuffer();
  }

  /**
   * Get image metadata
   */
  static async getImageMetadata(input: Buffer): Promise<ImageMetadata> {
    const metadata = await sharp(input).metadata();

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || "unknown",
      colorSpace: metadata.space || "unknown",
      size: input.length,
    };
  }

  /**
   * Calculate optimal quality for target file size
   */
  static async calculateOptimalQuality(
    input: Buffer,
    aspectRatio: AspectRatioType,
    targetSize: number
  ): Promise<number> {
    const dimensions = INSTAGRAM_DIMENSIONS[aspectRatio];
    let minQuality = 60;
    let maxQuality = 95;
    let optimalQuality = 90;

    // Binary search
    while (minQuality <= maxQuality) {
      const midQuality = Math.floor((minQuality + maxQuality) / 2);

      const buffer = await sharp(input)
        .toColorspace("srgb")
        .resize(dimensions.width, dimensions.height, {
          fit: "cover",
          position: "center",
        })
        .jpeg({
          quality: midQuality,
          chromaSubsampling: "4:4:4",
          mozjpeg: true,
        })
        .toBuffer();

      if (buffer.length <= targetSize) {
        optimalQuality = midQuality;
        minQuality = midQuality + 1;
      } else {
        maxQuality = midQuality - 1;
      }
    }

    return optimalQuality;
  }

  /**
   * Estimate file size for given quality
   */
  static async estimateFileSize(
    input: Buffer,
    aspectRatio: AspectRatioType,
    quality: number
  ): Promise<number> {
    const dimensions = INSTAGRAM_DIMENSIONS[aspectRatio];

    const buffer = await sharp(input)
      .toColorspace("srgb")
      .resize(dimensions.width, dimensions.height, {
        fit: "cover",
        position: "center",
      })
      .jpeg({
        quality,
        chromaSubsampling: "4:4:4",
        mozjpeg: true,
      })
      .toBuffer();

    return buffer.length;
  }

  /**
   * Get Instagram dimensions for aspect ratio
   */
  static getDimensions(aspectRatio: AspectRatioType): { width: number; height: number } {
    return INSTAGRAM_DIMENSIONS[aspectRatio];
  }
}
