/**
 * Instagram Graph API Service
 * Handles all interactions with Instagram Graph API for publishing content
 */

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
  imageUrl: string;      // URL pública de la imagen JPEG
  caption?: string;      // Caption con hashtags
  isCarouselItem?: boolean;
}

export interface CarouselParams {
  childContainerIds: string[];  // IDs de containers de items
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
  constructor(
    message: string,
    public code: number | string,
    public subcode?: number,
    public type?: string,
    public fbTraceId?: string
  ) {
    super(message);
    this.name = "InstagramAPIError";
  }
}

export class TokenExpiredError extends InstagramAPIError {
  constructor(message: string = "Access token has expired") {
    super(message, 190);
    this.name = "TokenExpiredError";
  }
}

export class RateLimitError extends InstagramAPIError {
  constructor(
    message: string = "Rate limit exceeded",
    public retryAfter?: Date
  ) {
    super(message, 17);
    this.name = "RateLimitError";
  }
}

export class PermissionError extends InstagramAPIError {
  constructor(
    message: string = "Insufficient permissions",
    public missingPermissions?: string[]
  ) {
    super(message, 10);
    this.name = "PermissionError";
  }
}

export class MediaError extends InstagramAPIError {
  constructor(message: string, code: number | string) {
    super(message, code);
    this.name = "MediaError";
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
  }): never {
    const { message = "Unknown error", code, error_subcode, type, fbtrace_id } = error;

    // Token expired
    if (code === 190) {
      throw new TokenExpiredError(message);
    }

    // Rate limit exceeded
    if (code === 4 || code === 17) {
      throw new RateLimitError(message);
    }

    // Permission denied
    if (code === 10 || code === 200) {
      throw new PermissionError(message);
    }

    // Media processing errors
    if (code === 36000 || code === 36003 || code === 2207001) {
      throw new MediaError(message, code);
    }

    // Generic error
    throw new InstagramAPIError(message, code || "UNKNOWN", error_subcode, type, fbtrace_id);
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

    if (caption && !isCarouselItem) {
      body.caption = caption;
    }

    if (isCarouselItem) {
      body.is_carousel_item = true;
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
  ): Promise<boolean> {
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.checkContainerStatus(containerId);

      switch (status) {
        case "FINISHED":
          return true;
        case "ERROR":
        case "EXPIRED":
          return false;
        case "IN_PROGRESS":
          await this.delay(pollInterval);
          break;
        case "PUBLISHED":
          // Already published, this shouldn't happen in normal flow
          return true;
      }
    }

    // Timeout reached
    return false;
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
      throw new MediaError("Carousel requires at least 2 images", "INVALID_CAROUSEL");
    }

    if (imageUrls.length > 10) {
      throw new MediaError("Carousel cannot have more than 10 images", "INVALID_CAROUSEL");
    }

    // Step 1: Create containers for each image
    const childContainerIds: string[] = [];
    for (const imageUrl of imageUrls) {
      const containerId = await this.createMediaContainer({
        imageUrl,
        isCarouselItem: true,
      });
      childContainerIds.push(containerId);
    }

    // Step 2: Wait for all child containers to be ready
    for (const containerId of childContainerIds) {
      const isReady = await this.waitForContainerReady(containerId);
      if (!isReady) {
        throw new MediaError(
          `Carousel item container ${containerId} failed to process`,
          "CONTAINER_ERROR"
        );
      }
    }

    // Step 3: Create carousel container
    const carouselContainerId = await this.createCarouselContainer({
      childContainerIds,
      caption,
    });

    // Step 4: Wait for carousel container to be ready
    const isCarouselReady = await this.waitForContainerReady(carouselContainerId);
    if (!isCarouselReady) {
      throw new MediaError("Carousel container failed to process", "CONTAINER_ERROR");
    }

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
    // Step 1: Create media container
    const containerId = await this.createMediaContainer({
      imageUrl,
      caption,
    });

    // Step 2: Wait for container to be ready
    const isReady = await this.waitForContainerReady(containerId);
    if (!isReady) {
      throw new MediaError("Media container failed to process", "CONTAINER_ERROR");
    }

    // Step 3: Publish
    const mediaId = await this.publishMedia(containerId);

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
      account_type?: string;
    }>(
      `/${this.instagramAccountId}?fields=id,username,profile_picture_url,followers_count,media_count,account_type`
    );

    return {
      id: response.id,
      username: response.username,
      profilePictureUrl: response.profile_picture_url,
      followersCount: response.followers_count,
      mediaCount: response.media_count,
      accountType: response.account_type,
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
      throw new InstagramAPIError(
        data.error.message,
        data.error.code,
        data.error.error_subcode,
        data.error.type,
        data.error.fbtrace_id
      );
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
      throw new InstagramAPIError(
        data.error.message,
        data.error.code,
        data.error.error_subcode,
        data.error.type,
        data.error.fbtrace_id
      );
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
      throw new InstagramAPIError(
        data.error.message,
        data.error.code,
        data.error.error_subcode,
        data.error.type,
        data.error.fbtrace_id
      );
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
      throw new InstagramAPIError(
        data.error.message,
        data.error.code,
        data.error.error_subcode,
        data.error.type,
        data.error.fbtrace_id
      );
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
// Export default instance factory
// =============================================================================

export function createInstagramService(
  accessToken: string,
  instagramAccountId: string
): InstagramAPIService {
  return new InstagramAPIService(accessToken, instagramAccountId);
}
