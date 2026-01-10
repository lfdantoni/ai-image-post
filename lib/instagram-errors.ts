/**
 * Instagram Graph API Error Mapping
 * Comprehensive error codes, messages, and recovery suggestions
 */

// =============================================================================
// Types
// =============================================================================

export type ErrorCategory =
  | "AUTH"           // Authentication/token errors
  | "PERMISSION"     // Missing permissions
  | "RATE_LIMIT"     // Rate limiting
  | "MEDIA"          // Media processing errors
  | "VALIDATION"     // Input validation errors
  | "NETWORK"        // Network/connectivity issues
  | "SERVER"         // Instagram server errors
  | "ACCOUNT"        // Account-related issues
  | "UNKNOWN";       // Unknown errors

export type ErrorSeverity = "warning" | "error" | "critical";

export interface InstagramErrorInfo {
  code: number | string;
  subcode?: number;
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  recoveryAction?: string;
  needsReconnect?: boolean;
  retryable?: boolean;
  retryAfterSeconds?: number;
}

export interface ParsedInstagramError {
  code: number | string;
  subcode?: number;
  message: string;
  type?: string;
  fbTraceId?: string;
  errorInfo: InstagramErrorInfo;
}

// =============================================================================
// Error Code Mappings
// =============================================================================

/**
 * Facebook/Instagram Graph API Error Codes
 * Reference: https://developers.facebook.com/docs/graph-api/guides/error-handling/
 */
const ERROR_CODE_MAP: Record<number | string, Omit<InstagramErrorInfo, "code">> = {
  // ===== Authentication Errors (1xx, 190) =====
  1: {
    category: "SERVER",
    severity: "error",
    userMessage: "An unknown error occurred. Please try again.",
    technicalMessage: "Unknown API error",
    retryable: true,
    retryAfterSeconds: 5,
  },
  2: {
    category: "SERVER",
    severity: "error",
    userMessage: "Instagram is temporarily unavailable. Please try again later.",
    technicalMessage: "Service temporarily unavailable",
    retryable: true,
    retryAfterSeconds: 60,
  },
  4: {
    category: "RATE_LIMIT",
    severity: "warning",
    userMessage: "Too many requests. Please wait a moment before trying again.",
    technicalMessage: "Application-level rate limiting",
    retryable: true,
    retryAfterSeconds: 300,
  },
  10: {
    category: "PERMISSION",
    severity: "error",
    userMessage: "The app doesn't have permission to perform this action.",
    technicalMessage: "Permission denied",
    recoveryAction: "Please reconnect your Instagram account with the required permissions.",
    needsReconnect: true,
  },
  17: {
    category: "RATE_LIMIT",
    severity: "warning",
    userMessage: "Rate limit reached. Please wait before publishing again.",
    technicalMessage: "User-level rate limiting",
    retryable: true,
    retryAfterSeconds: 3600,
  },
  21: {
    category: "SERVER",
    severity: "error",
    userMessage: "Page request limit reached. Please try again later.",
    technicalMessage: "Page-level rate limiting",
    retryable: true,
    retryAfterSeconds: 3600,
  },
  100: {
    category: "VALIDATION",
    severity: "error",
    userMessage: "Invalid request. Please check your content and try again.",
    technicalMessage: "Invalid parameter",
  },
  102: {
    category: "AUTH",
    severity: "critical",
    userMessage: "Session expired. Please reconnect your Instagram account.",
    technicalMessage: "Session key invalid or no longer valid",
    needsReconnect: true,
    recoveryAction: "Click 'Reconnect' to re-authenticate with Instagram.",
  },
  104: {
    category: "AUTH",
    severity: "critical",
    userMessage: "Authentication required. Please reconnect your Instagram account.",
    technicalMessage: "Incorrect signature",
    needsReconnect: true,
  },
  190: {
    category: "AUTH",
    severity: "critical",
    userMessage: "Your Instagram session has expired. Please reconnect.",
    technicalMessage: "Access token has expired",
    needsReconnect: true,
    recoveryAction: "Your access token has expired. Please reconnect your Instagram account.",
  },
  200: {
    category: "PERMISSION",
    severity: "error",
    userMessage: "Permission required. Please reconnect with the necessary permissions.",
    technicalMessage: "Permission error",
    needsReconnect: true,
    recoveryAction: "Some required permissions are missing. Please reconnect your account.",
  },

  // ===== OAuth Errors (300-399) =====
  341: {
    category: "RATE_LIMIT",
    severity: "warning",
    userMessage: "Application limit reached. Please try again later.",
    technicalMessage: "Application limit reached",
    retryable: true,
    retryAfterSeconds: 3600,
  },

  // ===== Business/Page Errors (1xxx) =====
  1609005: {
    category: "ACCOUNT",
    severity: "error",
    userMessage: "This link couldn't be posted. Please check if it violates Instagram's policies.",
    technicalMessage: "Link couldn't be saved",
  },

  // ===== Media Errors (2xxx, 36xxx) =====
  2207001: {
    category: "MEDIA",
    severity: "error",
    userMessage: "Unable to access the image. Please ensure the image URL is valid and accessible.",
    technicalMessage: "Media URL fetch failed",
    retryable: true,
    recoveryAction: "Try uploading the image again or use a different image.",
  },
  2207002: {
    category: "MEDIA",
    severity: "error",
    userMessage: "The media container has expired. Please try publishing again.",
    technicalMessage: "Media container expired",
    retryable: true,
  },
  2207003: {
    category: "MEDIA",
    severity: "error",
    userMessage: "Unable to download the image. Please check the image URL.",
    technicalMessage: "Unable to fetch media from URL",
    retryable: true,
  },
  2207006: {
    category: "MEDIA",
    severity: "error",
    userMessage: "Video processing failed. Please try a different video or format.",
    technicalMessage: "Video processing error",
  },
  2207026: {
    category: "MEDIA",
    severity: "error",
    userMessage: "The image aspect ratio is not supported. Please use 4:5, 1:1, or 1.91:1.",
    technicalMessage: "Unsupported aspect ratio",
    recoveryAction: "Crop your image to one of the supported aspect ratios.",
  },
  2207050: {
    category: "MEDIA",
    severity: "error",
    userMessage: "Media upload failed. The file may be corrupted or in an unsupported format.",
    technicalMessage: "Media upload failed",
    retryable: true,
  },

  // ===== Container Errors (9xxx, 36xxx) =====
  9004: {
    category: "RATE_LIMIT",
    severity: "warning",
    userMessage: "You've reached the daily posting limit (25 posts). Please try again tomorrow.",
    technicalMessage: "Daily publishing limit reached",
    recoveryAction: "Wait until tomorrow when the limit resets.",
  },
  9007: {
    category: "PERMISSION",
    severity: "error",
    userMessage: "Cannot publish to this Instagram account. Please check the account permissions.",
    technicalMessage: "Cannot create content for this user",
    needsReconnect: true,
  },

  36000: {
    category: "MEDIA",
    severity: "error",
    userMessage: "Media is not ready yet. Please wait and try again.",
    technicalMessage: "Media not ready for publishing",
    retryable: true,
    retryAfterSeconds: 10,
  },
  36001: {
    category: "MEDIA",
    severity: "error",
    userMessage: "Carousel requires between 2 and 10 images.",
    technicalMessage: "Invalid carousel size",
  },
  36002: {
    category: "MEDIA",
    severity: "error",
    userMessage: "Cannot mix image and video in carousel.",
    technicalMessage: "Mixed media types in carousel not allowed",
  },
  36003: {
    category: "MEDIA",
    severity: "error",
    userMessage: "Unable to process the image. Please try a different image.",
    technicalMessage: "Image processing failed",
    retryable: true,
  },

  // ===== Account/Business Errors (190xx) =====
  19001: {
    category: "ACCOUNT",
    severity: "critical",
    userMessage: "This Instagram account is not a Business or Creator account.",
    technicalMessage: "Account is not an Instagram Business or Creator account",
    recoveryAction: "Convert your Instagram account to a Business or Creator account in the Instagram app.",
  },
  19002: {
    category: "ACCOUNT",
    severity: "error",
    userMessage: "The Facebook Page is not connected to an Instagram account.",
    technicalMessage: "No Instagram account connected to Page",
    recoveryAction: "Connect your Instagram Business account to your Facebook Page.",
  },

  // ===== Caption/Content Errors =====
  CAPTION_TOO_LONG: {
    category: "VALIDATION",
    severity: "error",
    userMessage: "Caption is too long. Maximum 2,200 characters allowed.",
    technicalMessage: "Caption exceeds maximum length",
    recoveryAction: "Shorten your caption to 2,200 characters or less.",
  },
  TOO_MANY_HASHTAGS: {
    category: "VALIDATION",
    severity: "error",
    userMessage: "Too many hashtags. Maximum 30 hashtags allowed.",
    technicalMessage: "Hashtag limit exceeded",
    recoveryAction: "Reduce the number of hashtags to 30 or fewer.",
  },
  INVALID_IMAGE_SIZE: {
    category: "VALIDATION",
    severity: "error",
    userMessage: "Image dimensions are not valid. Minimum 320px, maximum 1440px width.",
    technicalMessage: "Invalid image dimensions",
    recoveryAction: "Resize your image to meet Instagram's requirements.",
  },
  INVALID_ASPECT_RATIO: {
    category: "VALIDATION",
    severity: "error",
    userMessage: "Image aspect ratio is not supported. Use 4:5, 1:1, or 1.91:1.",
    technicalMessage: "Unsupported aspect ratio",
    recoveryAction: "Crop your image to a supported aspect ratio.",
  },
  INVALID_CAROUSEL: {
    category: "VALIDATION",
    severity: "error",
    userMessage: "Carousel must have between 2 and 10 images.",
    technicalMessage: "Invalid carousel size",
  },
  CONTAINER_ERROR: {
    category: "MEDIA",
    severity: "error",
    userMessage: "Failed to prepare media for publishing. Please try again.",
    technicalMessage: "Media container processing failed",
    retryable: true,
  },

  // ===== Network/Connection Errors =====
  NETWORK_ERROR: {
    category: "NETWORK",
    severity: "error",
    userMessage: "Network error. Please check your connection and try again.",
    technicalMessage: "Network request failed",
    retryable: true,
    retryAfterSeconds: 5,
  },
  TIMEOUT: {
    category: "NETWORK",
    severity: "error",
    userMessage: "Request timed out. Please try again.",
    technicalMessage: "Request timeout",
    retryable: true,
    retryAfterSeconds: 10,
  },
  CONNECTION_LOST: {
    category: "AUTH",
    severity: "critical",
    userMessage: "Instagram connection lost. Please reconnect your account.",
    technicalMessage: "Instagram connection not found",
    needsReconnect: true,
  },

  // ===== Default Unknown Error =====
  UNKNOWN: {
    category: "UNKNOWN",
    severity: "error",
    userMessage: "An unexpected error occurred. Please try again.",
    technicalMessage: "Unknown error",
    retryable: true,
  },
};

// =============================================================================
// Subcode Mappings (for more specific error handling)
// =============================================================================

const SUBCODE_MAP: Record<number, Partial<InstagramErrorInfo>> = {
  // Token subcodes (for error code 190)
  458: {
    userMessage: "App session expired. Please reconnect your Instagram account.",
    technicalMessage: "App not installed or session invalid",
    needsReconnect: true,
  },
  459: {
    userMessage: "User session expired. Please log in again and reconnect.",
    technicalMessage: "User session invalid",
    needsReconnect: true,
  },
  460: {
    userMessage: "Password changed. Please reconnect your Instagram account.",
    technicalMessage: "Password was recently changed",
    needsReconnect: true,
  },
  463: {
    userMessage: "Your session has expired. Please reconnect your Instagram account.",
    technicalMessage: "Access token has expired",
    needsReconnect: true,
  },
  464: {
    userMessage: "Your session is no longer valid. Please reconnect your Instagram account.",
    technicalMessage: "Unconfirmed user session",
    needsReconnect: true,
  },
  467: {
    userMessage: "Access token is invalid. Please reconnect your Instagram account.",
    technicalMessage: "Invalid access token",
    needsReconnect: true,
  },

  // Permission subcodes (for error codes 10, 200)
  1349013: {
    userMessage: "Publishing permission required. Please reconnect with instagram_content_publish permission.",
    technicalMessage: "Missing instagram_content_publish permission",
    needsReconnect: true,
    recoveryAction: "Reconnect your account and grant the content publishing permission.",
  },
  1349014: {
    userMessage: "Basic permissions required. Please reconnect with instagram_basic permission.",
    technicalMessage: "Missing instagram_basic permission",
    needsReconnect: true,
  },
  1349048: {
    userMessage: "Page publishing permissions required. Please reconnect with pages permissions.",
    technicalMessage: "Missing pages_read_engagement or pages_show_list permission",
    needsReconnect: true,
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parses an Instagram/Facebook API error response and returns structured error info
 */
export function parseInstagramError(error: {
  message?: string;
  code?: number | string;
  error_subcode?: number;
  type?: string;
  fbtrace_id?: string;
  is_transient?: boolean;
}): ParsedInstagramError {
  const code = error.code ?? "UNKNOWN";
  const subcode = error.error_subcode;

  // Get base error info from code
  let errorInfo: InstagramErrorInfo = {
    code,
    ...(ERROR_CODE_MAP[code] || ERROR_CODE_MAP.UNKNOWN),
  };

  // Override with subcode-specific info if available
  if (subcode && SUBCODE_MAP[subcode]) {
    errorInfo = {
      ...errorInfo,
      subcode,
      ...SUBCODE_MAP[subcode],
    };
  }

  // Handle transient errors
  if (error.is_transient) {
    errorInfo.retryable = true;
    errorInfo.retryAfterSeconds = errorInfo.retryAfterSeconds || 30;
  }

  return {
    code,
    subcode,
    message: error.message || errorInfo.technicalMessage,
    type: error.type,
    fbTraceId: error.fbtrace_id,
    errorInfo,
  };
}

/**
 * Gets error info for a known error code
 */
export function getErrorInfo(code: number | string, subcode?: number): InstagramErrorInfo {
  let errorInfo: InstagramErrorInfo = {
    code,
    ...(ERROR_CODE_MAP[code] || ERROR_CODE_MAP.UNKNOWN),
  };

  if (subcode && SUBCODE_MAP[subcode]) {
    errorInfo = {
      ...errorInfo,
      subcode,
      ...SUBCODE_MAP[subcode],
    };
  }

  return errorInfo;
}

/**
 * Creates a user-friendly error message with recovery action
 */
export function formatErrorMessage(error: ParsedInstagramError): string {
  const { errorInfo } = error;
  let message = errorInfo.userMessage;

  if (errorInfo.recoveryAction) {
    message += ` ${errorInfo.recoveryAction}`;
  }

  return message;
}

/**
 * Determines if an error requires the user to reconnect their Instagram account
 */
export function requiresReconnect(error: ParsedInstagramError): boolean {
  return error.errorInfo.needsReconnect === true;
}

/**
 * Determines if an error is retryable
 */
export function isRetryable(error: ParsedInstagramError): boolean {
  return error.errorInfo.retryable === true;
}

/**
 * Gets the recommended retry delay in milliseconds
 */
export function getRetryDelay(error: ParsedInstagramError): number {
  return (error.errorInfo.retryAfterSeconds || 30) * 1000;
}

/**
 * Checks if error is a rate limit error
 */
export function isRateLimitError(error: ParsedInstagramError): boolean {
  return error.errorInfo.category === "RATE_LIMIT";
}

/**
 * Checks if error is an authentication error
 */
export function isAuthError(error: ParsedInstagramError): boolean {
  return error.errorInfo.category === "AUTH" || error.errorInfo.needsReconnect === true;
}

/**
 * Checks if error is a media processing error
 */
export function isMediaError(error: ParsedInstagramError): boolean {
  return error.errorInfo.category === "MEDIA";
}

// =============================================================================
// Error Response Builder
// =============================================================================

export interface APIErrorResponse {
  error: {
    code: string | number;
    message: string;
    details?: string;
    category: ErrorCategory;
    needsReconnect?: boolean;
    retryable?: boolean;
    retryAfterSeconds?: number;
  };
}

/**
 * Builds a standardized API error response
 */
export function buildErrorResponse(
  error: unknown,
  defaultMessage: string = "An error occurred"
): APIErrorResponse {
  // Handle ParsedInstagramError
  if (typeof error === "object" && error !== null && "errorInfo" in error) {
    const parsedError = error as ParsedInstagramError;
    return {
      error: {
        code: parsedError.code,
        message: parsedError.errorInfo.userMessage,
        details: parsedError.message,
        category: parsedError.errorInfo.category,
        needsReconnect: parsedError.errorInfo.needsReconnect,
        retryable: parsedError.errorInfo.retryable,
        retryAfterSeconds: parsedError.errorInfo.retryAfterSeconds,
      },
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    // Check if it has a code property (InstagramAPIError)
    const errWithCode = error as Error & { code?: number | string };
    if (errWithCode.code) {
      const errorInfo = getErrorInfo(errWithCode.code);
      return {
        error: {
          code: errWithCode.code,
          message: errorInfo.userMessage,
          details: error.message,
          category: errorInfo.category,
          needsReconnect: errorInfo.needsReconnect,
          retryable: errorInfo.retryable,
          retryAfterSeconds: errorInfo.retryAfterSeconds,
        },
      };
    }

    // Generic Error
    return {
      error: {
        code: "UNKNOWN",
        message: error.message || defaultMessage,
        category: "UNKNOWN",
        retryable: true,
      },
    };
  }

  // Handle unknown error types
  return {
    error: {
      code: "UNKNOWN",
      message: defaultMessage,
      category: "UNKNOWN",
      retryable: true,
    },
  };
}

// =============================================================================
// Daily Limit Error Helper
// =============================================================================

/**
 * Creates a rate limit error for daily posting limits
 */
export function createDailyLimitError(
  used: number,
  limit: number = 25,
  resetsAt?: Date
): ParsedInstagramError {
  const hoursUntilReset = resetsAt
    ? Math.ceil((resetsAt.getTime() - Date.now()) / (1000 * 60 * 60))
    : 24;

  return {
    code: 9004,
    message: `Daily posting limit reached (${used}/${limit})`,
    errorInfo: {
      code: 9004,
      category: "RATE_LIMIT",
      severity: "warning",
      userMessage: `You've reached the daily posting limit of ${limit} posts.`,
      technicalMessage: `Daily limit: ${used}/${limit} posts`,
      recoveryAction: `Please wait approximately ${hoursUntilReset} hour${hoursUntilReset === 1 ? "" : "s"} for the limit to reset.`,
      retryable: false,
    },
  };
}
