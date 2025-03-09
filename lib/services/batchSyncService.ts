import { anthropicClient } from "@/lib/api/anthropic";
import { db } from "@/lib/db/prisma";
import { BatchStatus, Batch } from "@prisma/client";
import { BatchCompletion } from "@/lib/api/anthropic";

/**
 * Maps Anthropic API status to our application's batch status
 */
function mapAnthropicStatus(status: string): BatchStatus {
  switch (status) {
    case "completed": return "COMPLETED";
    case "failed": return "FAILED";
    case "canceled": return "CANCELED";
    case "in_progress": return "IN_PROGRESS";
    default: return "IN_PROGRESS";
  }
}

/**
 * Maps Anthropic completion status to our application's completion status
 */
function mapAnthropicCompletionStatus(status: string) {
  switch (status) {
    case "completed": return "COMPLETED";
    case "failed": return "FAILED";
    case "in_progress": return "IN_PROGRESS";
    default: return "PENDING";
  }
}

/**
 * Syncs a single batch's status with Anthropic API
 */
export async function syncBatchWithAnthropic(batchId: string): Promise<Batch | null> {
  // Get batch from database
  const batch = await db.batch.findUnique({
    where: { id: batchId },
  });
  
  // Return early if batch doesn't exist or has no Anthropic ID
  if (!batch?.anthropicId) {
    console.error(`Cannot sync batch ${batchId}: Not found or missing Anthropic ID`);
    return null;
  }
  
  // Skip if batch is already in a terminal state
  if (batch.status === "COMPLETED" || batch.status === "FAILED" || batch.status === "CANCELED") {
    console.log(`Batch ${batchId} is already in terminal state: ${batch.status}`);
    return batch;
  }
  
  try {
    // Fetch updated status from Anthropic
    console.log(`Syncing batch ${batchId} with Anthropic ID ${batch.anthropicId}`);
    const anthropicBatch = await anthropicClient.getBatch(batch.anthropicId);
    
    // Map Anthropic status to our status
    const mappedStatus = mapAnthropicStatus(anthropicBatch.status);
    
    // Determine if we need to update the status
    const statusChanged = mappedStatus !== batch.status;
    const isTerminalState = ["COMPLETED", "FAILED", "CANCELED"].includes(mappedStatus);
    
    // Only update if status changed or we have new token counts
    if (statusChanged || 
        anthropicBatch.input_tokens !== batch.inputTokens || 
        anthropicBatch.output_tokens !== batch.outputTokens) {
      
      // Update batch in database
      const updatedBatch = await db.batch.update({
        where: { id: batchId },
        data: {
          status: mappedStatus,
          completedAt: isTerminalState ? new Date() : undefined,
          inputTokens: anthropicBatch.input_tokens,
          outputTokens: anthropicBatch.output_tokens,
          totalCompletions: anthropicBatch.completion_count,
          errorCount: anthropicBatch.error_count,
          // Store last synced time in metadata
          metadata: {
            ...batch.metadata as object,
            lastSyncedAt: new Date().toISOString(),
            lastAnthropicStatus: anthropicBatch.status,
          },
        },
      });
      
      console.log(`Updated batch ${batchId} status: ${batch.status} -> ${mappedStatus}`);
      
      // If completions are provided, update them too
      if (anthropicBatch.completions && Array.isArray(anthropicBatch.completions)) {
        await Promise.all(
          anthropicBatch.completions.map(async (completion: BatchCompletion) => {
            // Try to find completion by any metadata
            const completionMetadata = completion.input?.metadata as Record<string, string> || {};
            const completionId = completionMetadata.completion_id;
            
            if (!completionId) {
              console.warn("Completion ID not found in metadata");
              return;
            }
            
            await db.completion.update({
              where: { id: completionId },
              data: {
                anthropicId: completion.id,
                status: mapAnthropicCompletionStatus(completion.status),
                completedAt: completion.status === "completed" ? new Date() : undefined,
                inputTokens: completion.output?.input_tokens,
                outputTokens: completion.output?.output_tokens,
                output: completion.output || undefined,
                error: completion.error || undefined,
              },
            });
          })
        );
      }
      
      return updatedBatch;
    }
    
    // Status didn't change, but still update the lastSyncedAt time
    await db.batch.update({
      where: { id: batchId },
      data: {
        metadata: {
          ...batch.metadata as object,
          lastSyncedAt: new Date().toISOString(),
          lastAnthropicStatus: anthropicBatch.status,
        },
      },
    });
    
    console.log(`Batch ${batchId} status unchanged: ${batch.status}`);
    return batch;
  } catch (error: unknown) {
    // Log the error
    console.error(`Error syncing batch ${batchId} with Anthropic:`, error);
    
    // Check if this is a 404 error (batch not found in Anthropic)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const is404Error = errorMessage.includes('404') && errorMessage.includes('not found');
    
    if (is404Error) {
      console.log(`Batch ${batchId} not found in Anthropic - marking as FAILED`);
      
      // Mark the batch as FAILED since it doesn't exist in Anthropic
      const updatedBatch = await db.batch.update({
        where: { id: batchId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          metadata: {
            ...batch.metadata as object,
            lastSyncedAt: new Date().toISOString(),
            lastSyncError: {
              message: "Batch not found in Anthropic system",
              type: "not_found_error",
              timestamp: new Date().toISOString(),
            },
          },
        },
      });
      
      return updatedBatch;
    }
    
    // For other errors, update metadata with error info but don't change status
    await db.batch.update({
      where: { id: batchId },
      data: {
        metadata: {
          ...batch.metadata as object,
          lastSyncedAt: new Date().toISOString(),
          lastSyncError: {
            message: error instanceof Error ? error.message : "Unknown error",
            type: "api_error",
            timestamp: new Date().toISOString(),
          },
        },
      },
    });
    
    throw error;
  }
}

/**
 * Syncs all in-progress batches with Anthropic
 */
export async function syncAllInProgressBatches() {
  const inProgressBatches = await db.batch.findMany({
    where: {
      status: "IN_PROGRESS",
      anthropicId: { not: null },
    },
  });
  
  console.log(`Syncing ${inProgressBatches.length} in-progress batches`);
  
  const results = await Promise.allSettled(
    inProgressBatches.map((batch: Batch) => syncBatchWithAnthropic(batch.id))
  );
  
  // Log results
  const succeeded = results.filter((r: PromiseSettledResult<Batch | null>) => r.status === "fulfilled").length;
  const failed = results.filter((r: PromiseSettledResult<Batch | null>) => r.status === "rejected").length;
  
  console.log(`Batch sync complete: ${succeeded} succeeded, ${failed} failed`);
  
  return {
    total: inProgressBatches.length,
    succeeded,
    failed,
  };
} 