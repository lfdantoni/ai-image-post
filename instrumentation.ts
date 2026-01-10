/**
 * Next.js Instrumentation
 * This file runs when the Next.js server starts
 * Used to initialize cron jobs and other server-side setup
 */

export async function register() {
  // Only run on the server (not edge runtime or client)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Check if cron jobs should be enabled
    const cronEnabled = process.env.CRON_ENABLED === "true";

    if (cronEnabled) {
      console.log("[Instrumentation] Cron jobs enabled, starting scheduler...");

      // Dynamic import to avoid bundling issues
      const { startScheduler } = await import("@/lib/cron/scheduler");
      startScheduler();
    } else {
      console.log("[Instrumentation] Cron jobs disabled (set CRON_ENABLED=true to enable)");
    }
  }
}
