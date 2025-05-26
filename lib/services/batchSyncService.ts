import { AnthropicClient } from "@/lib/api/anthropic";
import { db } from "@/lib/db/prisma";
import type { Batch, BatchStatus } from "@prisma/client";

// Create a new anthropic client
const anthropicClient = new AnthropicClient();

// This function is kept for reference but marked as unused
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mapAnthropicStatus(status: string): BatchStatus {
    switch (status) {
        case "in_progress":
            return "IN_PROGRESS";
        case "completed":
            return "COMPLETED";
        case "failed":
            return "FAILED";
        case "canceled":
            return "CANCELED";
        default:
            return "PENDING";
    }
}

// This function is kept for reference but marked as unused
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mapAnthropicCompletionStatus(
    status: string,
): "PENDING" | "COMPLETED" | "FAILED" {
    switch (status) {
        case "completed":
            return "COMPLETED";
        case "failed":
            return "FAILED";
        default:
            return "PENDING";
    }
}

/**
 * Syncs a single batch's status with Anthropic API
 */
export async function syncBatchWithAnthropic(
    batchId: string,
): Promise<Batch | null> {
    // Get batch from database
    const batch = await db.batch.findUnique({
        where: { id: batchId },
    });

    // Return early if batch doesn't exist or has no Anthropic ID
    if (!batch) {
        console.error(`Cannot sync batch ${batchId}: Not found in database`);
        return null;
    }

    console.log(`Batch details from database:`, {
        batchId: batch.id,
        anthropicId: batch.anthropicId,
        status: batch.status,
        metadata: batch.metadata,
    });

    // Skip if batch is already in a terminal state
    if (
        batch.status === "COMPLETED" ||
        batch.status === "FAILED" ||
        batch.status === "CANCELED"
    ) {
        console.log(
            `Batch ${batchId} is already in terminal state: ${batch.status}`,
        );
        return batch;
    }

    try {
        // Extract metadata or initialize as empty object if null
        const metadata = (batch.metadata as Record<string, unknown>) || {};

        // Check if this batch was created very recently (within the last 15 seconds)
        const createdAt = metadata.createdAt
            ? new Date(metadata.createdAt as string)
            : batch.createdAt;
        const now = new Date();
        const fifteenSecondsAgo = new Date(now.getTime() - 15 * 1000);

        // If the batch was created within the last 15 seconds, add a small delay
        // This gives Anthropic's system time to fully register the batch in their system
        if (createdAt && createdAt > fifteenSecondsAgo) {
            const secsSinceCreation = Math.max(
                1,
                Math.floor((now.getTime() - createdAt.getTime()) / 1000),
            );
            const delayMs = Math.min(5000, (15 - secsSinceCreation) * 500); // Gradually reduce delay as time passes

            console.log(
                `Batch ${batchId} was created ${secsSinceCreation} seconds ago. Adding ${delayMs}ms delay before sync to allow propagation.`,
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        // Determine which ID to use for Anthropic API
        const anthropicIdToUse = batch.anthropicId;
        const customId = metadata.anthropicCustomId as string;

        console.log(`Syncing batch ${batchId} with Anthropic`);
        console.log(
            `Available IDs - Anthropic ID: ${anthropicIdToUse}, Custom ID: ${customId}`,
        );

        // Try all available IDs to find the batch
        // Priority: 1. anthropicId, 2. customId
        const idsToTry = [
            { id: anthropicIdToUse, type: "anthropicId" },
            { id: customId, type: "customId" },
        ].filter((item) => !!item.id); // Filter out undefined/null IDs

        let anthropicBatch;
        let successfulId;
        let lastError = {
            type: "not_found_error",
            message: "Batch not found in Anthropic system",
            timestamp: new Date().toISOString(),
        };

        // Try each ID in sequence until one works
        for (const { id, type } of idsToTry) {
            try {
                console.log(`Attempting to get batch with ${type}: ${id}`);
                // Type assertion to ensure id is treated as string
                anthropicBatch = await anthropicClient.getBatch(id as string);
                successfulId = { id, type };
                console.log(`Successfully retrieved batch with ${type}: ${id}`);
                break; // Exit the loop if successful
            } catch (error) {
                // Extract the detailed error message if available
                let errorMessage = "Unknown error";
                let errorType = "unknown_error";

                if (error instanceof Error) {
                    errorMessage = error.message;

                    // Try to extract more detailed error information if available
                    const errorObj = JSON.parse(JSON.stringify(error));
                    if (errorObj.status) {
                        errorType = `http_${errorObj.status}_error`;
                    }

                    if (errorObj.body && errorObj.body.error) {
                        errorType = errorObj.body.error.type || errorType;
                        errorMessage =
                            errorObj.body.error.message || errorMessage;
                    }
                }

                console.error(
                    `Error retrieving batch with ${type} ${id}:`,
                    error,
                );
                console.log(
                    `Error details: type=${errorType}, message=${errorMessage}`,
                );
                console.log(`Full error:`, JSON.stringify(error, null, 2));

                // Store the detailed error information for later
                lastError = {
                    type: errorType,
                    message: errorMessage,
                    timestamp: new Date().toISOString(),
                };
                // Continue to the next ID
            }
        }

        // If we found the batch but used a different ID than what's stored, update the record
        if (
            anthropicBatch &&
            successfulId &&
            successfulId.type === "customId" &&
            (!batch.anthropicId || batch.anthropicId !== anthropicBatch.id)
        ) {
            console.log(
                `Updating batch record with Anthropic ID: ${anthropicBatch.id} (found via ${successfulId.type})`,
            );
            await db.batch.update({
                where: { id: batchId },
                data: {
                    anthropicId: anthropicBatch.id,
                    metadata: {
                        ...metadata,
                        lastSyncedAt: new Date().toISOString(),
                    },
                },
            });
        }

        // If we couldn't find the batch with any ID, update the status and return null
        if (!anthropicBatch) {
            console.error(`Batch not found with any available ID`);

            // Update the batch with the error
            await db.batch.update({
                where: { id: batchId },
                data: {
                    status: "FAILED",
                    metadata: {
                        ...metadata,
                        lastSyncedAt: new Date().toISOString(),
                        lastSyncError: {
                            type: lastError.type,
                            message: lastError.message,
                            timestamp: lastError.timestamp,
                        },
                    },
                },
            });

            return null;
        }

        // Map Anthropic processing_status to our status
        let newStatus: BatchStatus = batch.status;

        // Map processing_status to our status format
        if (anthropicBatch.processing_status === "in_progress") {
            newStatus = "IN_PROGRESS";
        } else if (anthropicBatch.processing_status === "completed") {
            newStatus = "COMPLETED";
        } else if (
            anthropicBatch.processing_status === "failed" ||
            anthropicBatch.processing_status === "canceled"
        ) {
            newStatus = "FAILED";
        }

        // Calculate token counts and completion counts from request_counts
        const inputTokens = null; // Not available in new API
        const outputTokens = null; // Not available in new API
        const totalCompletions = anthropicBatch.request_counts.succeeded;
        const errorCount = anthropicBatch.request_counts.errored;

        // Update batch in database
        const updatedBatch = await db.batch.update({
            where: { id: batchId },
            data: {
                status: newStatus,
                completedAt:
                    newStatus === "COMPLETED" || newStatus === "FAILED"
                        ? new Date()
                        : null,
                inputTokens,
                outputTokens,
                totalCompletions,
                errorCount,
                metadata: {
                    ...metadata,
                    lastSyncedAt: new Date().toISOString(),
                    anthropicStatus: anthropicBatch.processing_status,
                    requestCounts: anthropicBatch.request_counts,
                    // Store both IDs for reference
                    anthropicId: anthropicBatch.id,
                    anthropicCustomId:
                        anthropicBatch.custom_id ||
                        metadata.anthropicCustomId ||
                        null,
                },
            },
        });

        console.log(
            `Updated batch ${batchId} status: ${batch.status} -> ${newStatus}`,
        );

        return updatedBatch;
    } catch (error: unknown) {
        // Log the error
        console.error(`Error syncing batch ${batchId} with Anthropic:`, error);

        // Check if this is a 404 error (batch not found in Anthropic)
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        const is404Error =
            errorMessage.includes("404") && errorMessage.includes("not found");

        if (is404Error) {
            // Check if this batch was created recently (within the last 5 minutes)
            const metadata = (batch.metadata as Record<string, unknown>) || {};
            const createdAt = metadata.createdAt
                ? new Date(metadata.createdAt as string)
                : batch.createdAt || new Date();
            const now = new Date();

            // Get the number of minutes since batch creation
            const minutesSinceCreation =
                (now.getTime() - createdAt.getTime()) / (60 * 1000);
            console.log(
                `Batch ${batchId} was created ${minutesSinceCreation.toFixed(2)} minutes ago.`,
            );

            // For very recent batches (less than 30 seconds old), we'll assume this is a propagation delay
            // and just return the current batch without updating its status
            if (minutesSinceCreation < 0.5) {
                console.log(`Batch ${batchId} was created very recently (${(minutesSinceCreation * 60).toFixed(1)} seconds ago).
                    Likely a propagation delay, not marking as failed.`);

                // Update metadata with the sync attempt but don't change status
                const updatedBatch = await db.batch.update({
                    where: { id: batchId },
                    data: {
                        metadata: {
                            ...(batch.metadata as Record<string, unknown>),
                            lastSyncedAt: new Date().toISOString(),
                            lastSyncError: {
                                type: "propagation_delay",
                                message:
                                    "Batch not found in Anthropic system - propagation delay",
                                timestamp: new Date().toISOString(),
                            },
                        },
                    },
                });

                return updatedBatch;
            }

            // For batches less than 5 minutes old, don't mark as failed yet
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            if (createdAt > fiveMinutesAgo) {
                console.log(
                    `Batch ${batchId} not found in Anthropic, but was created ${minutesSinceCreation.toFixed(2)} minutes ago. Will retry later.`,
                );

                // Update metadata with the sync attempt but don't change status
                const updatedBatch = await db.batch.update({
                    where: { id: batchId },
                    data: {
                        metadata: {
                            ...(batch.metadata as Record<string, unknown>),
                            lastSyncedAt: new Date().toISOString(),
                            lastSyncError: {
                                type: "not_found_retry",
                                message:
                                    "Batch not found in Anthropic system - will retry later",
                                timestamp: new Date().toISOString(),
                            },
                            notFoundRetryCount:
                                ((metadata.notFoundRetryCount as number) || 0) +
                                1,
                        },
                    },
                });

                return updatedBatch;
            }

            // If the batch is older or we've already retried several times, mark it as failed
            const notFoundRetryCount =
                (metadata.notFoundRetryCount as number) || 0;
            if (notFoundRetryCount > 5) {
                console.log(
                    `Batch ${batchId} not found in Anthropic after ${notFoundRetryCount} retries - marking as FAILED`,
                );
            } else {
                console.log(
                    `Batch ${batchId} not found in Anthropic and is not recent - marking as FAILED`,
                );
            }

            // Mark the batch as FAILED since it doesn't exist in Anthropic
            const updatedBatch = await db.batch.update({
                where: { id: batchId },
                data: {
                    status: "FAILED",
                    completedAt: new Date(),
                    metadata: {
                        ...(batch.metadata as Record<string, unknown>),
                        lastSyncedAt: new Date().toISOString(),
                        lastSyncError: {
                            type: "not_found_error",
                            message:
                                "Batch not found in Anthropic system after retries",
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
                    ...(batch.metadata as Record<string, unknown>),
                    lastSyncedAt: new Date().toISOString(),
                    lastSyncError: {
                        type: "api_error",
                        message:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
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
        inProgressBatches.map((batch: Batch) =>
            syncBatchWithAnthropic(batch.id),
        ),
    );

    // Log results
    const succeeded = results.filter(
        (r: PromiseSettledResult<Batch | null>) => r.status === "fulfilled",
    ).length;
    const failed = results.filter(
        (r: PromiseSettledResult<Batch | null>) => r.status === "rejected",
    ).length;

    console.log(
        `Batch sync complete: ${succeeded} succeeded, ${failed} failed`,
    );

    return {
        total: inProgressBatches.length,
        succeeded,
        failed,
    };
}
