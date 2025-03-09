import { NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import * as crypto from "crypto";
import { anthropicClient } from "@/lib/api/anthropic";
import { syncBatchWithAnthropic } from "@/lib/services/batchSyncService";

/**
 * @name BATCH_WEBHOOK_HANDLER
 * @description Handles webhook notifications from Anthropic API
 */
export async function POST(req: Request) {
  try {
    // Clone the request to get both the text body and JSON
    const clonedReq = req.clone();
    const signature = req.headers.get("anthropic-signature");
    const timestamp = req.headers.get("anthropic-timestamp");
    const webhookId = req.headers.get("anthropic-webhook-id") || "unknown";
    
    console.log(`Received Anthropic webhook: ${webhookId}`);
    
    if (!signature || !timestamp) {
      console.error(`Missing webhook signature headers for webhook ${webhookId}`);
      return new Response("Unauthorized", { status: 401 });
    }
    
    const body = await clonedReq.text();
    const payload = JSON.parse(body);
    
    // Extract batch ID
    const batchId = payload.batch_id;
    if (!batchId) {
      console.error(`Missing batch ID in webhook payload for webhook ${webhookId}`);
      return new Response("Missing batch ID", { status: 400 });
    }
    
    // Find batch in database to get user's webhook secret
    const batch = await db.batch.findUnique({
      where: { anthropicId: batchId },
      include: { user: true }
    });
    
    if (!batch) {
      console.error(`Batch not found for Anthropic ID: ${batchId} (webhook ${webhookId})`);
      return new Response("Batch not found", { status: 404 });
    }
    
    // Log webhook event
    console.log(`Processing webhook ${webhookId} for batch ${batch.id} (${batch.name}): ${payload.type}`);
    
    // Verify the webhook signature using either the user's webhook secret or the default one
    const webhookSecret = batch.user.anthropicWebhookSecret || process.env.ANTHROPIC_WEBHOOK_SECRET;
    let signatureValid = false;
    
    if (webhookSecret) {
      const hmac = crypto.createHmac("sha256", webhookSecret);
      const data = `${timestamp}.${body}`;
      const expectedSignature = hmac.update(data).digest("hex");
      signatureValid = signature === expectedSignature;
    } else {
      // Fall back to the anthropicClient's verification method
      signatureValid = anthropicClient.verifyWebhookSignature(signature, timestamp, body);
    }
    
    if (!signatureValid) {
      console.error(`Invalid webhook signature for webhook ${webhookId}`);
      return new Response("Unauthorized", { status: 401 });
    }
    
    // Add webhook info to batch metadata
    await db.batch.update({
      where: { id: batch.id },
      data: {
        metadata: {
          ...batch.metadata as object,
          webhooks: [
            ...((batch.metadata as Record<string, any>)?.webhooks || []),
            {
              id: webhookId,
              type: payload.type,
              timestamp: new Date().toISOString(),
            }
          ]
        }
      }
    });
    
    // Handle different webhook types
    try {
      switch (payload.type) {
        case "batch.completed":
        case "batch.failed":
        case "batch.canceled":
        case "batch.in_progress":
          // Use our improved sync service to handle the update
          await syncBatchWithAnthropic(batch.id);
          console.log(`Successfully processed webhook ${webhookId} for batch ${batch.id}`);
          return new Response("OK");
        default:
          console.warn(`Unhandled webhook type: ${payload.type} for webhook ${webhookId}`);
          return new Response("OK");
      }
    } catch (error) {
      console.error(`Error processing webhook ${webhookId} for batch ${batch.id}:`, error);
      // We still return 200 OK to acknowledge receipt of the webhook
      // This prevents Anthropic from retrying unnecessarily
      return new Response("Webhook received, but processing failed", { status: 200 });
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * Maps Anthropic API status to database status
 */
function mapAnthropicStatus(status: string) {
  switch (status) {
    case "completed": return "COMPLETED";
    case "failed": return "FAILED";
    case "canceled": return "CANCELED";
    case "in_progress": return "IN_PROGRESS";
    case "pending": return "PENDING";
    default: return "IN_PROGRESS";
  }
}

/**
 * Maps Anthropic completion status to database status
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
 * Process batch update webhook
 */
async function handleBatchUpdate(payload: any, batch?: any) {
  const { batch_id, status, completions } = payload;
  
  // If batch is not provided, find it in the database
  if (!batch) {
    batch = await db.batch.findUnique({
      where: { anthropicId: batch_id },
    });
    
    if (!batch) {
      console.error(`Batch not found for ID: ${batch_id}`);
      return new Response("Batch not found", { status: 404 });
    }
  }
  
  console.log(`Updating batch ${batch.id} status to ${mapAnthropicStatus(status)}`);
  
  // Update batch status
  await db.batch.update({
    where: { id: batch.id },
    data: {
      status: mapAnthropicStatus(status),
      completedAt: ["completed", "failed", "canceled"].includes(status) ? new Date() : undefined,
      inputTokens: payload.input_tokens,
      outputTokens: payload.output_tokens,
      totalCompletions: payload.completion_count,
      errorCount: payload.error_count,
    },
  });
  
  // Update individual completions
  if (completions && Array.isArray(completions)) {
    await Promise.all(
      completions.map(async (completion) => {
        // Find completion by ID in metadata
        const completionId = completion.metadata?.completion_id;
        
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
  
  return new Response("OK");
}