/**
 * Instagram Validation
 * Functions and constants for validating content before publishing to Instagram
 */

// =============================================================================
// Constants - Instagram Requirements (Subtask 4.2)
// =============================================================================

/**
 * Instagram image requirements
 */
export const INSTAGRAM_IMAGE_REQUIREMENTS = {
  /** Only JPEG format is supported by Instagram API */
  format: "JPEG" as const,

  /** Aspect ratio constraints */
  aspectRatio: {
    min: 0.8,   // 4:5 (portrait)
    max: 1.91,  // Landscape
  },

  /** Epsilon for float comparison (avoids 4:5 e.g. 0.79999... being rejected; 0.001 ≈ 1px at 1080) */
  aspectRatioEpsilon: 0.001,

  /** Dimension constraints in pixels */
  dimensions: {
    minWidth: 320,
    maxWidth: 1440,
    minHeight: 320,
    maxHeight: 1800,
  },

  /** Maximum file size in bytes (8MB) */
  maxFileSize: 8 * 1024 * 1024,

  /** Recommended dimensions for optimal quality */
  recommended: {
    portrait: { width: 1080, height: 1350 },
    square: { width: 1080, height: 1080 },
    landscape: { width: 1080, height: 566 },
  },

  /** Optimal width for best quality */
  optimalWidth: 1080,
} as const;

/**
 * Instagram caption requirements
 */
export const INSTAGRAM_CAPTION_REQUIREMENTS = {
  /** Maximum caption length including hashtags */
  maxLength: 2200,

  /** Maximum number of hashtags allowed */
  maxHashtags: 30,

  /** Maximum number of mentions allowed */
  maxMentions: 20,

  /** Minimum recommended caption length for engagement */
  recommendedMinLength: 50,

  /** Minimum recommended hashtags for reach */
  recommendedMinHashtags: 5,
} as const;

/**
 * Instagram carousel requirements
 */
export const INSTAGRAM_CAROUSEL_REQUIREMENTS = {
  /** Minimum number of items in a carousel */
  minItems: 2,

  /** Maximum number of items via API (app allows 20, API allows 10) */
  maxItems: 10,
} as const;

/**
 * Instagram rate limit requirements
 */
export const INSTAGRAM_RATE_LIMITS = {
  /** Maximum posts per day per account */
  maxPostsPerDay: 25,

  /** Maximum API calls per hour */
  maxApiCallsPerHour: 200,
} as const;

/**
 * Valid MIME types for Instagram images
 */
export const VALID_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
] as const;

// =============================================================================
// Types
// =============================================================================

export type ValidationField = "image" | "caption" | "hashtags" | "account" | "carousel";

export interface ValidationError {
  code: string;
  message: string;
  field: ValidationField;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field: ValidationField;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ImageValidationParams {
  url?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  contentType?: string;
}

export interface AccountValidationParams {
  isConnected: boolean;
  tokenExpiresAt?: Date;
  postsPublishedToday?: number;
  rateLimitResetAt?: Date;
}

export interface ValidateForInstagramParams {
  images: ImageValidationParams[];
  caption: string;
  hashtags: string[];
  account: AccountValidationParams;
}

// =============================================================================
// Validation Functions (Subtask 4.1)
// =============================================================================

/**
 * Validates an image for Instagram publishing
 */
export function validateImage(image: ImageValidationParams): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check format (JPEG only)
  if (image.format && !["jpeg", "jpg"].includes(image.format.toLowerCase())) {
    errors.push({
      code: "INVALID_IMAGE_FORMAT",
      message: `Instagram only supports JPEG images. Current format: ${image.format}`,
      field: "image",
    });
  }

  // Check content type if available
  if (image.contentType && !VALID_IMAGE_MIME_TYPES.includes(image.contentType as typeof VALID_IMAGE_MIME_TYPES[number])) {
    errors.push({
      code: "INVALID_CONTENT_TYPE",
      message: `Invalid content type: ${image.contentType}. Must be image/jpeg`,
      field: "image",
    });
  }

  // Check dimensions
  if (image.width !== undefined && image.height !== undefined) {
    const { dimensions, aspectRatio, optimalWidth, aspectRatioEpsilon } = INSTAGRAM_IMAGE_REQUIREMENTS;

    // Width constraints
    if (image.width < dimensions.minWidth) {
      errors.push({
        code: "IMAGE_TOO_NARROW",
        message: `Image width (${image.width}px) is below minimum (${dimensions.minWidth}px)`,
        field: "image",
      });
    }

    if (image.width > dimensions.maxWidth) {
      errors.push({
        code: "IMAGE_TOO_WIDE",
        message: `Image width (${image.width}px) exceeds maximum (${dimensions.maxWidth}px)`,
        field: "image",
      });
    }

    // Height constraints
    if (image.height < dimensions.minHeight) {
      errors.push({
        code: "IMAGE_TOO_SHORT",
        message: `Image height (${image.height}px) is below minimum (${dimensions.minHeight}px)`,
        field: "image",
      });
    }

    if (image.height > dimensions.maxHeight) {
      errors.push({
        code: "IMAGE_TOO_TALL",
        message: `Image height (${image.height}px) exceeds maximum (${dimensions.maxHeight}px)`,
        field: "image",
      });
    }

    // Aspect ratio (use epsilon to avoid floating-point rejecting exact 4:5 e.g. 0.79999... < 0.8)
    const ratio = image.width / image.height;
    if (ratio < aspectRatio.min - aspectRatioEpsilon) {
      errors.push({
        code: "ASPECT_RATIO_TOO_TALL",
        message: `Aspect ratio (${ratio.toFixed(2)}) is too tall. Minimum is ${aspectRatio.min} (4:5)`,
        field: "image",
      });
    }

    if (ratio > aspectRatio.max + aspectRatioEpsilon) {
      errors.push({
        code: "ASPECT_RATIO_TOO_WIDE",
        message: `Aspect ratio (${ratio.toFixed(2)}) is too wide. Maximum is ${aspectRatio.max} (1.91:1)`,
        field: "image",
      });
    }

    // Warning for suboptimal width
    if (image.width !== optimalWidth && image.width < optimalWidth) {
      warnings.push({
        code: "SUBOPTIMAL_WIDTH",
        message: `Image width (${image.width}px) is below optimal (${optimalWidth}px). Quality may be reduced.`,
        field: "image",
      });
    }
  }

  // Check file size
  if (image.bytes !== undefined) {
    if (image.bytes > INSTAGRAM_IMAGE_REQUIREMENTS.maxFileSize) {
      const maxMB = INSTAGRAM_IMAGE_REQUIREMENTS.maxFileSize / (1024 * 1024);
      const currentMB = (image.bytes / (1024 * 1024)).toFixed(2);
      errors.push({
        code: "FILE_TOO_LARGE",
        message: `File size (${currentMB}MB) exceeds maximum (${maxMB}MB)`,
        field: "image",
      });
    }
  }

  // Check URL is provided
  if (!image.url) {
    errors.push({
      code: "MISSING_IMAGE_URL",
      message: "Image URL is required for publishing",
      field: "image",
    });
  }

  return { errors, warnings };
}

/**
 * Validates caption for Instagram
 */
export function validateCaption(caption: string): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const { maxLength, recommendedMinLength } = INSTAGRAM_CAPTION_REQUIREMENTS;

  // Check length
  if (caption.length > maxLength) {
    errors.push({
      code: "CAPTION_TOO_LONG",
      message: `Caption (${caption.length} chars) exceeds maximum (${maxLength} chars)`,
      field: "caption",
    });
  }

  // Warning for short caption
  if (caption.length > 0 && caption.length < recommendedMinLength) {
    warnings.push({
      code: "CAPTION_TOO_SHORT",
      message: `Caption is short (${caption.length} chars). Consider adding more context for better engagement.`,
      field: "caption",
    });
  }

  return { errors, warnings };
}

/**
 * Validates hashtags for Instagram
 */
export function validateHashtags(hashtags: string[]): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const { maxHashtags, recommendedMinHashtags } = INSTAGRAM_CAPTION_REQUIREMENTS;

  // Check count
  if (hashtags.length > maxHashtags) {
    errors.push({
      code: "TOO_MANY_HASHTAGS",
      message: `Too many hashtags (${hashtags.length}). Maximum is ${maxHashtags}`,
      field: "hashtags",
    });
  }

  // Warning for few hashtags
  if (hashtags.length > 0 && hashtags.length < recommendedMinHashtags) {
    warnings.push({
      code: "FEW_HASHTAGS",
      message: `Only ${hashtags.length} hashtags. Consider adding at least ${recommendedMinHashtags} for better reach.`,
      field: "hashtags",
    });
  }

  // Validate each hashtag format
  const invalidHashtags: string[] = [];
  for (const hashtag of hashtags) {
    // Remove # prefix if present for validation
    const tag = hashtag.startsWith("#") ? hashtag.slice(1) : hashtag;

    // Check for invalid characters (only alphanumeric and underscores allowed)
    if (!/^[a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]+$/.test(tag)) {
      invalidHashtags.push(hashtag);
    }

    // Check for empty or too short
    if (tag.length === 0) {
      invalidHashtags.push(hashtag);
    }
  }

  if (invalidHashtags.length > 0) {
    errors.push({
      code: "INVALID_HASHTAG_FORMAT",
      message: `Invalid hashtags: ${invalidHashtags.join(", ")}. Hashtags can only contain letters, numbers, and underscores.`,
      field: "hashtags",
    });
  }

  return { errors, warnings };
}

/**
 * Validates account status for Instagram publishing
 */
export function validateAccount(account: AccountValidationParams): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check if connected
  if (!account.isConnected) {
    errors.push({
      code: "ACCOUNT_NOT_CONNECTED",
      message: "Instagram account is not connected. Please connect your account in Settings.",
      field: "account",
    });
    return { errors, warnings };
  }

  // Check token expiration
  if (account.tokenExpiresAt) {
    const now = new Date();
    const expiresAt = new Date(account.tokenExpiresAt);

    if (expiresAt <= now) {
      errors.push({
        code: "TOKEN_EXPIRED",
        message: "Instagram access token has expired. Please reconnect your account.",
        field: "account",
      });
    } else {
      // Warning if token expires within 7 days
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (expiresAt <= sevenDaysFromNow) {
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        warnings.push({
          code: "TOKEN_EXPIRING_SOON",
          message: `Instagram access token expires in ${daysLeft} days. Consider refreshing it.`,
          field: "account",
        });
      }
    }
  }

  // Check rate limit
  if (account.postsPublishedToday !== undefined) {
    const { maxPostsPerDay } = INSTAGRAM_RATE_LIMITS;

    if (account.postsPublishedToday >= maxPostsPerDay) {
      const resetTime = account.rateLimitResetAt
        ? new Date(account.rateLimitResetAt).toLocaleString()
        : "24 hours";
      errors.push({
        code: "RATE_LIMIT_EXCEEDED",
        message: `Daily post limit (${maxPostsPerDay}) reached. Try again after ${resetTime}.`,
        field: "account",
      });
    } else if (account.postsPublishedToday >= maxPostsPerDay - 3) {
      // Warning when close to limit
      const remaining = maxPostsPerDay - account.postsPublishedToday;
      warnings.push({
        code: "RATE_LIMIT_WARNING",
        message: `Only ${remaining} posts remaining today.`,
        field: "account",
      });
    }
  }

  return { errors, warnings };
}

/**
 * Validates carousel for Instagram
 */
export function validateCarousel(imageCount: number): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const { minItems, maxItems } = INSTAGRAM_CAROUSEL_REQUIREMENTS;

  if (imageCount < minItems) {
    errors.push({
      code: "CAROUSEL_TOO_FEW_ITEMS",
      message: `Carousel requires at least ${minItems} images. Current: ${imageCount}`,
      field: "carousel",
    });
  }

  if (imageCount > maxItems) {
    errors.push({
      code: "CAROUSEL_TOO_MANY_ITEMS",
      message: `Carousel cannot have more than ${maxItems} images via API. Current: ${imageCount}`,
      field: "carousel",
    });
  }

  return { errors, warnings };
}

/**
 * Validates combined caption and hashtags length
 */
export function validateCombinedLength(caption: string, hashtags: string[]): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Calculate combined length (caption + space + hashtags joined by spaces)
  const hashtagsText = hashtags
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .join(" ");

  const combinedLength = caption.length + (hashtagsText.length > 0 ? 1 + hashtagsText.length : 0);
  const { maxLength } = INSTAGRAM_CAPTION_REQUIREMENTS;

  if (combinedLength > maxLength) {
    errors.push({
      code: "COMBINED_LENGTH_EXCEEDED",
      message: `Caption + hashtags (${combinedLength} chars) exceeds maximum (${maxLength} chars)`,
      field: "caption",
    });
  }

  return { errors, warnings };
}

/**
 * Main validation function - validates all aspects for Instagram publishing
 */
export async function validateForInstagram(
  params: ValidateForInstagramParams
): Promise<ValidationResult> {
  const { images, caption, hashtags, account } = params;

  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  // Validate account
  const accountValidation = validateAccount(account);
  allErrors.push(...accountValidation.errors);
  allWarnings.push(...accountValidation.warnings);

  // Validate images
  for (let i = 0; i < images.length; i++) {
    const imageValidation = validateImage(images[i]);
    // Add index to error messages for multiple images
    if (images.length > 1) {
      imageValidation.errors.forEach((e) => {
        e.message = `Image ${i + 1}: ${e.message}`;
      });
      imageValidation.warnings.forEach((w) => {
        w.message = `Image ${i + 1}: ${w.message}`;
      });
    }
    allErrors.push(...imageValidation.errors);
    allWarnings.push(...imageValidation.warnings);
  }

  // Validate carousel if multiple images
  if (images.length > 1) {
    const carouselValidation = validateCarousel(images.length);
    allErrors.push(...carouselValidation.errors);
    allWarnings.push(...carouselValidation.warnings);
  }

  // Validate caption
  const captionValidation = validateCaption(caption);
  allErrors.push(...captionValidation.errors);
  allWarnings.push(...captionValidation.warnings);

  // Validate hashtags
  const hashtagsValidation = validateHashtags(hashtags);
  allErrors.push(...hashtagsValidation.errors);
  allWarnings.push(...hashtagsValidation.warnings);

  // Validate combined length
  const combinedValidation = validateCombinedLength(caption, hashtags);
  allErrors.push(...combinedValidation.errors);
  allWarnings.push(...combinedValidation.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Quick validation for checking if content can be published
 * Returns true if valid, false otherwise
 */
export function canPublish(params: ValidateForInstagramParams): boolean {
  const accountValid = params.account.isConnected &&
    (!params.account.tokenExpiresAt || new Date(params.account.tokenExpiresAt) > new Date()) &&
    (params.account.postsPublishedToday ?? 0) < INSTAGRAM_RATE_LIMITS.maxPostsPerDay;

  if (!accountValid) return false;

  const captionValid = params.caption.length <= INSTAGRAM_CAPTION_REQUIREMENTS.maxLength;
  const hashtagsValid = params.hashtags.length <= INSTAGRAM_CAPTION_REQUIREMENTS.maxHashtags;

  const hashtagsText = params.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  const combinedLength = params.caption.length + (hashtagsText.length > 0 ? 1 + hashtagsText.length : 0);
  const combinedValid = combinedLength <= INSTAGRAM_CAPTION_REQUIREMENTS.maxLength;

  const imagesValid = params.images.length >= 1 &&
    (params.images.length === 1 || params.images.length <= INSTAGRAM_CAROUSEL_REQUIREMENTS.maxItems);

  return captionValid && hashtagsValid && combinedValid && imagesValid;
}

/**
 * Formats hashtags for Instagram caption
 * Ensures each hashtag starts with # and joins them with spaces
 */
export function formatHashtagsForCaption(hashtags: string[]): string {
  return hashtags
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .join(" ");
}

/**
 * Combines caption and hashtags for Instagram
 */
export function formatCaptionWithHashtags(caption: string, hashtags: string[]): string {
  const hashtagsText = formatHashtagsForCaption(hashtags);

  if (!caption && !hashtagsText) return "";
  if (!caption) return hashtagsText;
  if (!hashtagsText) return caption;

  return `${caption}\n\n${hashtagsText}`;
}

/**
 * Counts mentions in a caption
 */
export function countMentions(caption: string): number {
  const mentionRegex = /@[a-zA-Z0-9_.]+/g;
  const matches = caption.match(mentionRegex);
  return matches ? matches.length : 0;
}

/**
 * Validates mentions count
 */
export function validateMentions(caption: string): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const mentionCount = countMentions(caption);
  const { maxMentions } = INSTAGRAM_CAPTION_REQUIREMENTS;

  if (mentionCount > maxMentions) {
    errors.push({
      code: "TOO_MANY_MENTIONS",
      message: `Too many mentions (${mentionCount}). Maximum is ${maxMentions}`,
      field: "caption",
    });
  }

  return { errors, warnings };
}
