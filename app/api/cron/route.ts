/**
 * Cron Jobs Management API
 * GET - Get scheduler status
 * POST - Run a job manually
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSchedulerStatus,
  runJobManually,
  startScheduler,
  stopScheduler,
} from "@/lib/cron";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron
 * Returns the current status of all cron jobs
 */
export async function GET() {
  try {
    // Verify admin/authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = getSchedulerStatus();

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error("Error getting scheduler status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get scheduler status",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron
 * Manage cron jobs: run manually, start, or stop scheduler
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin/authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, jobName } = body;

    switch (action) {
      case "run": {
        if (!jobName) {
          return NextResponse.json(
            {
              success: false,
              error: "Job name required for manual run",
            },
            { status: 400 }
          );
        }

        const result = await runJobManually(jobName);
        if (!result) {
          return NextResponse.json(
            {
              success: false,
              error: `Job not found: ${jobName}`,
            },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: result.success,
          result,
        });
      }

      case "start": {
        startScheduler();
        return NextResponse.json({
          success: true,
          message: "Scheduler started",
          status: getSchedulerStatus(),
        });
      }

      case "stop": {
        stopScheduler();
        return NextResponse.json({
          success: true,
          message: "Scheduler stopped",
          status: getSchedulerStatus(),
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action. Use: run, start, or stop",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error managing cron jobs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to manage cron jobs",
      },
      { status: 500 }
    );
  }
}
