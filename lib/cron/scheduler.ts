/**
 * Cron Job Scheduler
 * Handles scheduled tasks for Instagram integration:
 * - Token refresh (daily at 3:00 AM)
 * - Rate limit reset (every hour)
 * - Metrics sync (every 6 hours)
 */

import cron, { ScheduledTask } from "node-cron";
import { prisma } from "@/lib/db";
import { InstagramAPIService } from "@/lib/instagram-api";

// =============================================================================
// Types
// =============================================================================

export interface JobResult {
  success: boolean;
  jobName: string;
  executedAt: Date;
  duration: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface SchedulerStatus {
  isRunning: boolean;
  jobs: {
    name: string;
    schedule: string;
    lastRun?: Date;
    nextRun?: Date;
    isRunning: boolean;
  }[];
}

type JobFunction = () => Promise<JobResult>;

// =============================================================================
// Job Registry
// =============================================================================

const jobRegistry: Map<string, {
  task: ScheduledTask | null;
  schedule: string;
  lastRun?: Date;
  isRunning: boolean;
  fn: JobFunction;
}> = new Map();

let isSchedulerRunning = false;

// =============================================================================
// Job Implementations
// =============================================================================

/**
 * Refreshes Instagram access tokens that are expiring soon
 * Runs daily at 3:00 AM
 */
async function refreshTokensJob(): Promise<JobResult> {
  const startTime = Date.now();
  const jobName = "refresh-tokens";

  try {
    // Find tokens expiring within 7 days
    const expirationThreshold = new Date();
    expirationThreshold.setDate(expirationThreshold.getDate() + 7);

    const accountsToRefresh = await prisma.instagramAccount.findMany({
      where: {
        tokenExpiresAt: {
          lte: expirationThreshold,
        },
      },
      include: {
        user: {
          include: {
            accounts: {
              where: {
                provider: "google",
              },
            },
          },
        },
      },
    });

    console.log(`[${jobName}] Found ${accountsToRefresh.length} tokens to refresh`);

    let refreshed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const account of accountsToRefresh) {
      try {
        // Get Facebook app credentials
        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;

        if (!appId || !appSecret) {
          throw new Error("Facebook app credentials not configured");
        }

        // Refresh the token
        const result = await InstagramAPIService.refreshLongLivedToken(
          account.accessToken,
          appId,
          appSecret
        );

        // Update the account with new token
        await prisma.instagramAccount.update({
          where: { id: account.id },
          data: {
            accessToken: result.accessToken,
            tokenExpiresAt: new Date(Date.now() + result.expiresIn * 1000),
            lastSyncAt: new Date(),
          },
        });

        refreshed++;
        console.log(`[${jobName}] Refreshed token for @${account.instagramUsername}`);
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push(`@${account.instagramUsername}: ${errorMessage}`);
        console.error(`[${jobName}] Failed to refresh token for @${account.instagramUsername}:`, error);
      }
    }

    return {
      success: failed === 0,
      jobName,
      executedAt: new Date(),
      duration: Date.now() - startTime,
      details: {
        totalAccounts: accountsToRefresh.length,
        refreshed,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  } catch (error) {
    console.error(`[${jobName}] Job failed:`, error);
    return {
      success: false,
      jobName,
      executedAt: new Date(),
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Resets rate limit counters for accounts whose reset time has passed
 * Runs every hour
 */
async function resetRateLimitsJob(): Promise<JobResult> {
  const startTime = Date.now();
  const jobName = "reset-rate-limits";

  try {
    const now = new Date();

    // Find accounts whose rate limit reset time has passed
    const accountsToReset = await prisma.instagramAccount.findMany({
      where: {
        rateLimitResetAt: {
          lte: now,
        },
        postsPublishedToday: {
          gt: 0,
        },
      },
    });

    console.log(`[${jobName}] Found ${accountsToReset.length} accounts to reset`);

    if (accountsToReset.length > 0) {
      // Reset all accounts in a batch
      const result = await prisma.instagramAccount.updateMany({
        where: {
          id: {
            in: accountsToReset.map((a) => a.id),
          },
        },
        data: {
          postsPublishedToday: 0,
          rateLimitResetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
        },
      });

      console.log(`[${jobName}] Reset rate limits for ${result.count} accounts`);

      return {
        success: true,
        jobName,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        details: {
          accountsReset: result.count,
        },
      };
    }

    return {
      success: true,
      jobName,
      executedAt: new Date(),
      duration: Date.now() - startTime,
      details: {
        accountsReset: 0,
        message: "No accounts needed rate limit reset",
      },
    };
  } catch (error) {
    console.error(`[${jobName}] Job failed:`, error);
    return {
      success: false,
      jobName,
      executedAt: new Date(),
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Syncs metrics for recently published posts
 * Runs every 6 hours
 */
async function syncMetricsJob(): Promise<JobResult> {
  const startTime = Date.now();
  const jobName = "sync-metrics";

  try {
    // Get published posts from the last 7 days that haven't been synced in the last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const postsToSync = await prisma.publishedPost.findMany({
      where: {
        publishedAt: {
          gte: sevenDaysAgo,
        },
        OR: [
          { metricsUpdatedAt: null },
          { metricsUpdatedAt: { lte: sixHoursAgo } },
        ],
      },
      include: {
        instagramAccount: true,
      },
      take: 50, // Limit to avoid rate limiting
    });

    console.log(`[${jobName}] Found ${postsToSync.length} posts to sync`);

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    // Group posts by account to minimize service instantiation
    const postsByAccount = new Map<string, typeof postsToSync>();
    for (const post of postsToSync) {
      const accountId = post.instagramAccountId || '';
      if (!postsByAccount.has(accountId)) {
        postsByAccount.set(accountId, []);
      }
      postsByAccount.get(accountId)!.push(post);
    }

    for (const [accountId, posts] of postsByAccount) {
      const account = posts[0].instagramAccount;

      if (!account) {
        console.log(`[${jobName}] Skipping account @${accountId} - account not found`);
        continue;
      }

      // Skip if token is expired
      if (account.tokenExpiresAt < new Date()) {
        console.log(`[${jobName}] Skipping account @${account.instagramUsername} - token expired`);
        continue;
      }

      const service = new InstagramAPIService(
        account.accessToken,
        account.instagramUserId
      );

      for (const post of posts) {
        try {
          const insights = await service.getMediaInsights(post.instagramMediaId);

          await prisma.publishedPost.update({
            where: { id: post.id },
            data: {
              likesCount: insights.likes ?? post.likesCount,
              commentsCount: insights.comments ?? post.commentsCount,
              reachCount: insights.reach ?? post.reachCount,
              impressionsCount: insights.impressions ?? post.impressionsCount,
              savedCount: insights.saved ?? post.savedCount,
              metricsUpdatedAt: new Date(),
            },
          });

          synced++;
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          errors.push(`Post ${post.id}: ${errorMessage}`);
          console.error(`[${jobName}] Failed to sync post ${post.id}:`, error);
        }

        // Small delay between API calls to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`[${jobName}] Synced ${synced} posts, ${failed} failed`);

    return {
      success: failed === 0,
      jobName,
      executedAt: new Date(),
      duration: Date.now() - startTime,
      details: {
        totalPosts: postsToSync.length,
        synced,
        failed,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit error list
      },
    };
  } catch (error) {
    console.error(`[${jobName}] Job failed:`, error);
    return {
      success: false,
      jobName,
      executedAt: new Date(),
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Job Wrapper (handles concurrency and logging)
// =============================================================================

function createJobWrapper(jobName: string, jobFn: JobFunction): () => void {
  return async () => {
    const job = jobRegistry.get(jobName);
    if (!job) return;

    // Prevent concurrent execution
    if (job.isRunning) {
      console.log(`[${jobName}] Job is already running, skipping this execution`);
      return;
    }

    job.isRunning = true;
    console.log(`[${jobName}] Starting job...`);

    try {
      const result = await jobFn();
      job.lastRun = result.executedAt;

      if (result.success) {
        console.log(`[${jobName}] Completed successfully in ${result.duration}ms`);
      } else {
        console.error(`[${jobName}] Completed with errors in ${result.duration}ms:`, result.error || result.details);
      }
    } catch (error) {
      console.error(`[${jobName}] Unexpected error:`, error);
    } finally {
      job.isRunning = false;
    }
  };
}

// =============================================================================
// Scheduler Control Functions
// =============================================================================

/**
 * Initializes and starts all cron jobs
 */
export function startScheduler(): void {
  if (isSchedulerRunning) {
    console.log("[Scheduler] Already running");
    return;
  }

  console.log("[Scheduler] Starting cron jobs...");

  // Register jobs
  jobRegistry.set("refresh-tokens", {
    task: null,
    schedule: "0 3 * * *", // Daily at 3:00 AM
    isRunning: false,
    fn: refreshTokensJob,
  });

  jobRegistry.set("reset-rate-limits", {
    task: null,
    schedule: "0 * * * *", // Every hour at minute 0
    isRunning: false,
    fn: resetRateLimitsJob,
  });

  jobRegistry.set("sync-metrics", {
    task: null,
    schedule: "0 */6 * * *", // Every 6 hours
    isRunning: false,
    fn: syncMetricsJob,
  });

  // Start all jobs
  for (const [name, job] of jobRegistry) {
    const task = cron.schedule(job.schedule, createJobWrapper(name, job.fn), {
      timezone: process.env.CRON_TIMEZONE || "America/New_York",
    });
    job.task = task;
    console.log(`[Scheduler] Registered job: ${name} (${job.schedule})`);
  }

  isSchedulerRunning = true;
  console.log("[Scheduler] All cron jobs started");
}

/**
 * Stops all cron jobs
 */
export function stopScheduler(): void {
  if (!isSchedulerRunning) {
    console.log("[Scheduler] Not running");
    return;
  }

  console.log("[Scheduler] Stopping cron jobs...");

  for (const [name, job] of jobRegistry) {
    if (job.task) {
      job.task.stop();
      console.log(`[Scheduler] Stopped job: ${name}`);
    }
  }

  isSchedulerRunning = false;
  console.log("[Scheduler] All cron jobs stopped");
}

/**
 * Gets the current status of all scheduled jobs
 */
export function getSchedulerStatus(): SchedulerStatus {
  const jobs: SchedulerStatus["jobs"] = [];

  for (const [name, job] of jobRegistry) {
    jobs.push({
      name,
      schedule: job.schedule,
      lastRun: job.lastRun,
      isRunning: job.isRunning,
    });
  }

  return {
    isRunning: isSchedulerRunning,
    jobs,
  };
}

/**
 * Manually triggers a specific job
 */
export async function runJobManually(jobName: string): Promise<JobResult | null> {
  const job = jobRegistry.get(jobName);
  if (!job) {
    console.error(`[Scheduler] Job not found: ${jobName}`);
    return null;
  }

  if (job.isRunning) {
    console.log(`[Scheduler] Job ${jobName} is already running`);
    return {
      success: false,
      jobName,
      executedAt: new Date(),
      duration: 0,
      error: "Job is already running",
    };
  }

  job.isRunning = true;
  console.log(`[Scheduler] Manually running job: ${jobName}`);

  try {
    const result = await job.fn();
    job.lastRun = result.executedAt;
    return result;
  } finally {
    job.isRunning = false;
  }
}

// =============================================================================
// Auto-start in production (if enabled)
// =============================================================================

// Note: For Next.js, cron jobs should be started via instrumentation.ts
// or a separate worker process. This auto-start is disabled by default.
if (process.env.CRON_AUTO_START === "true" && typeof window === "undefined") {
  startScheduler();
}
