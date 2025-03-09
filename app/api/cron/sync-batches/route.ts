import { NextRequest, NextResponse } from "next/server";
import { syncAllInProgressBatches } from "@/lib/services/batchSyncService";

/**
 * Cron job endpoint to sync all in-progress batches with Anthropic
 * This should be called on a schedule (e.g., every 5 minutes)
 */
export async function GET(req: NextRequest) {
  try {
    // Check for secret token to ensure this is a valid cron request
    const authHeader = req.headers.get("authorization");
    
    if (
      process.env.CRON_SECRET &&
      (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== process.env.CRON_SECRET)
    ) {
      console.error("Unauthorized cron job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log("Starting scheduled batch sync job");
    
    // Run the sync operation
    const result = await syncAllInProgressBatches();
    
    return NextResponse.json({
      success: true,
      message: `Sync completed: ${result.succeeded} succeeded, ${result.failed} failed out of ${result.total} batches`,
      result,
    });
  } catch (error: unknown) {
    console.error("Error in batch sync cron job:", error);
    
    return NextResponse.json(
      { error: "Failed to run batch sync job" },
      { status: 500 }
    );
  }
} 