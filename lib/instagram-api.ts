/**
 * Instagram Graph API Service
 * Handles all interactions with Instagram Graph API for publishing content
 */

import {
  parseInstagramError,
  getErrorInfo,
  formatErrorMessage,
  isRetryable,
  getRetryDelay,
  type ParsedInstagramError,
  type ErrorCategory,
} from "./instagram-errors";

// =============================================================================
// Types
// =============================================================================

export type ContainerStatus =
  | "EXPIRED"
  | "ERROR"
  | "FINISHED"
  | "IN_PROGRESS"
  | "PUBLISHED";

export interface CreateMediaParams {
  imageUrl: string;      // Public URL of the JPEG image
  caption?: string;      // Caption with hashtags
  isCarouselItem?: boolean;
}

export interface CarouselParams {
  childContainerIds: string[];  // IDs of item containers
  caption: string;
}

export interface MediaDetails {
  id: string;
  permalink: string;
  timestamp: string;
  mediaUrl?: string;
  caption?: string;
  mediaType: string;
}

export interface MediaInsights {
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  saved?: number;
  engagement?: number;
}

export interface InstagramProfile {
  id: string;
  username: string;
  profilePictureUrl?: string;
  followersCount?: number;
  mediaCount?: number;
  accountType?: string;
}

export interface RateLimitInfo {
  postsToday: number;
  postsRemaining: number;
  limit: number;
  resetsAt: Date;
}

// =============================================================================
// Error Classes
// =============================================================================

export class InstagramAPIError extends Error {
  public readonly userMessage: string;
  public readonly category: ErrorCategory;
  public readonly needsReconnect: boolean;
  public readonly retryable: boolean;
  public readonly retryAfterMs?: number;

  constructor(
    message: string,
    public code: number | string,
    public subcode?: number,
    public type?: string,
    public fbTraceId?: string
  ) {
    super(message);
    this.name = "InstagramAPIError";

    // Get enhanced error info from mapping
    const errorInfo = getErrorInfo(code, subcode);
    this.userMessage = errorInfo.userMessage;
    this.category = errorInfo.category;
    this.needsReconnect = errorInfo.needsReconnect ?? false;
    this.retryable = errorInfo.retryable ?? false;
    this.retryAfterMs = errorInfo.retryAfterSeconds
      ? errorInfo.retryAfterSeconds * 1000
      : undefined;
  }

  /**
   * Creates an InstagramAPIError from a parsed error
   */
  static fromParsedError(parsed: ParsedInstagramError): InstagramAPIError {
    return new InstagramAPIError(
      parsed.message,
      parsed.code,
      parsed.subcode,
      parsed.type,
      parsed.fbTraceId
    );
  }

  /**
   * Gets a user-friendly error message with recovery action
   */
  getFormattedMessage(): string {
    const errorInfo = getErrorInfo(this.code, this.subcode);
    return formatErrorMessage({
      code: this.code,
      subcode: this.subcode,
      message: this.message,
      type: this.type,
      fbTraceId: this.fbTraceId,
      errorInfo,
    });
  }

  /**
   * Converts to a plain object for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      subcode: this.subcode,
      message: this.userMessage,
      technicalMessage: this.message,
      category: this.category,
      needsReconnect: this.needsReconnect,
      retryable: this.retryable,
      retryAfterMs: this.retryAfterMs,
    };
  }
}

export class TokenExpiredError extends InstagramAPIError {
  constructor(message: string = "Access token has expired", subcode?: number) {
    super(message, 190, subcode);
    this.name = "TokenExpiredError";
  }
}

export class RateLimitError extends InstagramAPIError {
  public readonly retryAfter?: Date;

  constructor(
    message: string = "Rate limit exceeded",
    code: number = 17,
    retryAfterSeconds?: number
  ) {
    super(message, code);
    this.name = "RateLimitError";
    this.retryAfter = retryAfterSeconds
      ? new Date(Date.now() + retryAfterSeconds * 1000)
      : undefined;
  }
}

export class PermissionError extends InstagramAPIError {
  constructor(
    message: string = "Insufficient permissions",
    code: number = 10,
    public missingPermissions?: string[],
    subcode?: number
  ) {
    super(message, code, subcode);
    this.name = "PermissionError";
  }
}

export class MediaError extends InstagramAPIError {
  constructor(message: string, code: number | string, subcode?: number) {
    super(message, code, subcode);
    this.name = "MediaError";
  }
}

export class ValidationError extends InstagramAPIError {
  constructor(message: string, code: string = "VALIDATION_ERROR") {
    super(message, code);
    this.name = "ValidationError";
  }
}

export class ContainerProcessingError extends InstagramAPIError {
  constructor(
    message: string,
    public containerId: string,
    public status?: ContainerStatus
  ) {
    super(message, "CONTAINER_ERROR");
    this.name = "ContainerProcessingError";
  }
}

// =============================================================================
// Instagram API Service
// =============================================================================

export class InstagramAPIService {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly instagramAccountId: string;
  private readonly apiVersion: string;

  constructor(accessToken: string, instagramAccountId: string) {
    this.accessToken = accessToken;
    this.instagramAccountId = instagramAccountId;
    this.apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v21.0";
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Makes an authenticated request to the Instagram Graph API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Add access token to all requests
    if (options.method === "POST") {
      // For POST requests, add token to body
      const body = options.body ? JSON.parse(options.body as string) : {};
      body.access_token = this.accessToken;
      options.body = JSON.stringify(body);
      options.headers = {
        "Content-Type": "application/json",
        ...options.headers,
      };
    } else {
      // For GET requests, add token to URL
      url.searchParams.set("access_token", this.accessToken);
    }

    const response = await fetch(url.toString(), options);
    const data = await response.json();

    if (!response.ok || data.error) {
      this.handleApiError(data.error || data);
    }

    return data as T;
  }

  /**
   * Handles API errors and throws appropriate custom errors
   */
  private handleApiError(error: {
    message?: string;
    code?: number;
    error_subcode?: number;
    type?: string;
    fbtrace_id?: string;
    is_transient?: boolean;
  }): never {
    // Parse the error using our comprehensive error mapping
    const parsed = parseInstagramError(error);
    const { code, subcode, message, type, fbTraceId } = parsed;
    const { category } = parsed.errorInfo;

    // Token expired (code 190 and related subcodes)
    if (code === 190 || category === "AUTH") {
      throw new TokenExpiredError(message, subcode);
    }

    // Rate limit exceeded (codes 4, 17, 21, 341, 9004)
    if (category === "RATE_LIMIT") {
      const retryAfterSeconds = parsed.errorInfo.retryAfterSeconds;
      throw new RateLimitError(
        message,
        typeof code === "number" ? code : 17,
        retryAfterSeconds
      );
    }

    // Permission denied (codes 10, 200, and permission subcodes)
    if (category === "PERMISSION") {
      throw new PermissionError(
        message,
        typeof code === "number" ? code : 10,
        undefined,
        subcode
      );
    }

    // Media processing errors (2207xxx, 36xxx codes)
    if (category === "MEDIA") {
      throw new MediaError(message, code, subcode);
    }

    // Validation errors
    if (category === "VALIDATION") {
      throw new ValidationError(message, String(code));
    }

    // Generic error with enhanced info
    throw new InstagramAPIError(message, code, subcode, type, fbTraceId);
  }

  /**
   * Wraps an async operation with retry logic for transient errors
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;
    let delay = initialDelayMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (error instanceof InstagramAPIError && error.retryable && attempt < maxRetries) {
          // Use the error's recommended retry delay if available
          const retryDelay = error.retryAfterMs || delay;
          console.log(
            `Instagram API error (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}. Retrying in ${retryDelay}ms...`
          );
          await this.delay(retryDelay);
          delay *= 2; // Exponential backoff
          continue;
        }

        // Non-retryable error or max retries reached
        throw error;
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError;
  }

  /**
   * Delays execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ===========================================================================
  // Media Container Methods
  // ===========================================================================

  /**
   * Creates a media container for a single image
   * This is the first step in publishing to Instagram
   */
  async createMediaContainer(params: CreateMediaParams): Promise<string> {
    const { imageUrl, caption, isCarouselItem } = params;

    const body: Record<string, string | boolean> = {
      image_url: imageUrl,
    };

    if (isCarouselItem) {
      body.is_carousel_item = true;
    } else {
      // For single image posts, media_type is recommended
      body.media_type = "IMAGE";
      if (caption) {
        body.caption = caption;
      }
    }

    const response = await this.request<{ id: string }>(
      `/${this.instagramAccountId}/media`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return response.id;
  }

  /**
   * Checks the status of a media container
   */
  async checkContainerStatus(containerId: string): Promise<ContainerStatus> {
    const response = await this.request<{ status_code: ContainerStatus }>(
      `/${containerId}?fields=status_code`
    );

    return response.status_code;
  }

  /**
   * Waits for a media container to be ready for publishing
   * Polls every 5 seconds until FINISHED or timeout
   */
  async waitForContainerReady(
    containerId: string,
    maxWaitMs: number = 120000
  ): Promise<{ ready: boolean; status: ContainerStatus }> {
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();
    let lastStatus: ContainerStatus = "IN_PROGRESS";

    while (Date.now() - startTime < maxWaitMs) {
      lastStatus = await this.checkContainerStatus(containerId);

      switch (lastStatus) {
        case "FINISHED":
          return { ready: true, status: lastStatus };
        case "ERROR":
          throw new ContainerProcessingError(
            "Media container processing failed",
            containerId,
            lastStatus
          );
        case "EXPIRED":
          throw new ContainerProcessingError(
            "Media container has expired. Please try again.",
            containerId,
            lastStatus
          );
        case "IN_PROGRESS":
          await this.delay(pollInterval);
          break;
        case "PUBLISHED":
          // Already published, this shouldn't happen in normal flow
          return { ready: true, status: lastStatus };
      }
    }

    // Timeout reached
    throw new ContainerProcessingError(
      `Media container processing timed out after ${maxWaitMs / 1000} seconds`,
      containerId,
      lastStatus
    );
  }

  /**
   * Publishes a media container to Instagram
   * The container must be in FINISHED state
   */
  async publishMedia(containerId: string): Promise<string> {
    const response = await this.request<{ id: string }>(
      `/${this.instagramAccountId}/media_publish`,
      {
        method: "POST",
        body: JSON.stringify({
          creation_id: containerId,
        }),
      }
    );

    return response.id;
  }

  /**
   * Gets details of a published media post
   */
  async getMediaDetails(mediaId: string): Promise<MediaDetails> {
    const response = await this.request<{
      id: string;
      permalink: string;
      timestamp: string;
      media_url?: string;
      caption?: string;
      media_type: string;
    }>(`/${mediaId}?fields=id,permalink,timestamp,media_url,caption,media_type`);

    return {
      id: response.id,
      permalink: response.permalink,
      timestamp: response.timestamp,
      mediaUrl: response.media_url,
      caption: response.caption,
      mediaType: response.media_type,
    };
  }

  // ===========================================================================
  // Carousel Methods (Subtask 3.2)
  // ===========================================================================

  /**
   * Creates a carousel container from multiple image containers
   */
  async createCarouselContainer(params: CarouselParams): Promise<string> {
    const { childContainerIds, caption } = params;

    if (childContainerIds.length < 2) {
      throw new MediaError("Carousel requires at least 2 items", "INVALID_CAROUSEL");
    }

    if (childContainerIds.length > 10) {
      throw new MediaError("Carousel cannot have more than 10 items", "INVALID_CAROUSEL");
    }

    const response = await this.request<{ id: string }>(
      `/${this.instagramAccountId}/media`,
      {
        method: "POST",
        body: JSON.stringify({
          caption,
          media_type: "CAROUSEL",
          children: childContainerIds.join(","),
        }),
      }
    );

    return response.id;
  }

  /**
   * Publishes a carousel post to Instagram
   * This is a convenience method that handles the full carousel flow
   */
  async publishCarousel(
    imageUrls: string[],
    caption: string
  ): Promise<{ mediaId: string; permalink: string }> {
    if (imageUrls.length < 2) {
      throw new ValidationError(
        "Carousel requires at least 2 images",
        "INVALID_CAROUSEL"
      );
    }

    if (imageUrls.length > 10) {
      throw new ValidationError(
        "Carousel cannot have more than 10 images",
        "INVALID_CAROUSEL"
      );
    }

    // Step 1: Create containers for each image with retry logic
    const childContainerIds: string[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      try {
        const containerId = await this.withRetry(
          () => this.createMediaContainer({
            imageUrl,
            isCarouselItem: true,
          }),
          2 // Max 2 retries for container creation
        );
        childContainerIds.push(containerId);
      } catch (error) {
        // Add context about which image failed
        if (error instanceof InstagramAPIError) {
          throw new MediaError(
            `Failed to create container for image ${i + 1}: ${error.message}`,
            error.code,
            error.subcode
          );
        }
        throw error;
      }
    }

    // Step 2: Wait for all child containers to be ready
    for (let i = 0; i < childContainerIds.length; i++) {
      const containerId = childContainerIds[i];
      // waitForContainerReady now throws on error, so no need to check return value
      await this.waitForContainerReady(containerId);
    }

    // Step 3: Create carousel container
    const carouselContainerId = await this.createCarouselContainer({
      childContainerIds,
      caption,
    });

    // Step 4: Wait for carousel container to be ready
    await this.waitForContainerReady(carouselContainerId);

    // Step 5: Publish the carousel
    const mediaId = await this.publishMedia(carouselContainerId);

    // Step 6: Get permalink
    const details = await this.getMediaDetails(mediaId);

    return {
      mediaId,
      permalink: details.permalink,
    };
  }

  /**
   * Publishes a single image post to Instagram
   * This is a convenience method that handles the full single image flow
   */
  async publishSingleImage(
    imageUrl: string,
    caption: string
  ): Promise<{ mediaId: string; permalink: string }> {
    // Step 1: Create media container with retry logic
    const containerId = await this.withRetry(
      () => this.createMediaContainer({
        imageUrl,
        caption,
      }),
      2 // Max 2 retries for container creation
    );

    // Step 2: Wait for container to be ready
    // waitForContainerReady now throws on error
    await this.waitForContainerReady(containerId);

    // Step 3: Publish with retry logic
    const mediaId = await this.withRetry(
      () => this.publishMedia(containerId),
      2 // Max 2 retries for publishing
    );

    // Step 4: Get permalink
    const details = await this.getMediaDetails(mediaId);

    return {
      mediaId,
      permalink: details.permalink,
    };
  }

  // ===========================================================================
  // Metrics Methods (Subtask 3.3)
  // ===========================================================================

  /**
   * Gets insights/metrics for a published media post
   */
  async getMediaInsights(mediaId: string): Promise<MediaInsights> {
    try {
      const response = await this.request<{
        data: Array<{
          name: string;
          values: Array<{ value: number }>;
        }>;
      }>(`/${mediaId}/insights?metric=impressions,reach,saved`);

      const insights: MediaInsights = {};

      for (const metric of response.data) {
        const value = metric.values[0]?.value || 0;
        switch (metric.name) {
          case "impressions":
            insights.impressions = value;
            break;
          case "reach":
            insights.reach = value;
            break;
          case "saved":
            insights.saved = value;
            break;
        }
      }

      // Get likes and comments from the media object directly
      const mediaDetails = await this.request<{
        like_count?: number;
        comments_count?: number;
      }>(`/${mediaId}?fields=like_count,comments_count`);

      insights.likes = mediaDetails.like_count || 0;
      insights.comments = mediaDetails.comments_count || 0;
      insights.engagement = (insights.likes || 0) + (insights.comments || 0) + (insights.saved || 0);

      return insights;
    } catch (error) {
      // If insights are not available (e.g., for very new posts), return basic metrics
      if (error instanceof InstagramAPIError) {
        const mediaDetails = await this.request<{
          like_count?: number;
          comments_count?: number;
        }>(`/${mediaId}?fields=like_count,comments_count`);

        return {
          likes: mediaDetails.like_count || 0,
          comments: mediaDetails.comments_count || 0,
        };
      }
      throw error;
    }
  }

  /**
   * Gets the user's Instagram profile information
   */
  async getUserProfile(): Promise<InstagramProfile> {
    const response = await this.request<{
      id: string;
      username: string;
      profile_picture_url?: string;
      followers_count?: number;
      media_count?: number;
    }>(
      `/${this.instagramAccountId}?fields=id,username,profile_picture_url,followers_count,media_count`
    );

    return {
      id: response.id,
      username: response.username,
      profilePictureUrl: response.profile_picture_url,
      followersCount: response.followers_count,
      mediaCount: response.media_count,
    };
  }

  /**
   * Gets the current rate limit status for the account
   * Note: Instagram API doesn't provide direct rate limit info,
   * so we track this in our database
   */
  async getRateLimitStatus(
    postsPublishedToday: number,
    rateLimitResetAt?: Date
  ): Promise<RateLimitInfo> {
    const limit = 25; // Instagram's daily limit
    const now = new Date();

    // If reset time has passed, reset the counter
    if (rateLimitResetAt && rateLimitResetAt <= now) {
      postsPublishedToday = 0;
    }

    // Calculate reset time (24 hours from now if not set)
    const resetsAt = rateLimitResetAt && rateLimitResetAt > now
      ? rateLimitResetAt
      : new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return {
      postsToday: postsPublishedToday,
      postsRemaining: Math.max(0, limit - postsPublishedToday),
      limit,
      resetsAt,
    };
  }

  // ===========================================================================
  // Token Management Methods
  // ===========================================================================

  /**
   * Exchanges a short-lived token for a long-lived token
   * Long-lived tokens are valid for 60 days
   */
  static async exchangeForLongLivedToken(
    shortLivedToken: string,
    appId: string,
    appSecret: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v21.0";
    const url = new URL(`https://graph.facebook.com/${apiVersion}/oauth/access_token`);
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("fb_exchange_token", shortLivedToken);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      // Use error parsing for consistent error handling
      const parsed = parseInstagramError(data.error);
      throw InstagramAPIError.fromParsedError(parsed);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in, // seconds until expiration
    };
  }

  /**
   * Refreshes a long-lived token
   * Can only be done after 24 hours of the token being issued
   */
  static async refreshLongLivedToken(
    existingToken: string,
    appId: string,
    appSecret: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v21.0";
    const url = new URL(`https://graph.facebook.com/${apiVersion}/oauth/access_token`);
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("fb_exchange_token", existingToken);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      // Use error parsing for consistent error handling
      const parsed = parseInstagramError(data.error);
      throw InstagramAPIError.fromParsedError(parsed);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Gets the Facebook Pages for a user
   * Used during the OAuth flow to find connected Instagram accounts
   */
  static async getUserPages(
    accessToken: string
  ): Promise<Array<{ id: string; name: string; accessToken: string }>> {
    const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v21.0";
    const url = new URL(`https://graph.facebook.com/${apiVersion}/me/accounts`);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("fields", "id,name,access_token");

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      // Use error parsing for consistent error handling
      const parsed = parseInstagramError(data.error);
      throw InstagramAPIError.fromParsedError(parsed);
    }

    return data.data.map((page: { id: string; name: string; access_token: string }) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
    }));
  }

  /**
   * Gets the Instagram Business Account connected to a Facebook Page
   */
  static async getInstagramAccountForPage(
    pageId: string,
    pageAccessToken: string
  ): Promise<{ id: string; username: string } | null> {
    const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v21.0";
    const url = new URL(`https://graph.facebook.com/${apiVersion}/${pageId}`);
    url.searchParams.set("access_token", pageAccessToken);
    url.searchParams.set("fields", "instagram_business_account{id,username}");

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      // Use error parsing for consistent error handling
      const parsed = parseInstagramError(data.error);
      throw InstagramAPIError.fromParsedError(parsed);
    }

    if (!data.instagram_business_account) {
      return null;
    }

    return {
      id: data.instagram_business_account.id,
      username: data.instagram_business_account.username,
    };
  }
}

// =============================================================================
// Re-exports from instagram-errors for convenience
// =============================================================================

export {
  parseInstagramError,
  getErrorInfo,
  formatErrorMessage,
  isRetryable,
  getRetryDelay,
  isRateLimitError,
  isAuthError,
  isMediaError,
  requiresReconnect,
  buildErrorResponse,
  createDailyLimitError,
  type ParsedInstagramError,
  type InstagramErrorInfo,
  type ErrorCategory,
  type ErrorSeverity,
  type APIErrorResponse,
} from "./instagram-errors";

// =============================================================================
// Export default instance factory
// =============================================================================

export function createInstagramService(
  accessToken: string,
  instagramAccountId: string
): InstagramAPIService {
  return new InstagramAPIService(accessToken, instagramAccountId);
}
