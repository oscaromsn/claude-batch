import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import * as crypto from "crypto";

/**
 * @name BATCH_WEBHOOK_HANDLER
 * @description Handles webhook notifications from Anthropic API
 */
export async function POST(req: Request) {
  try {
    // Clone the request to get both the text body and JSON
    const clonedReq = req.clone();
    
    // Verify webhook signature if webhook secret is set
    if (process.env.ANTHROPIC_WEBHOOK_SECRET) {
      const signature = req.headers.get("anthropic-signature");
      const timestamp = req.headers.get("anthropic-timestamp");
      
      if (!signature || !timestamp) {
        console.error("Missing webhook signature headers");
        return new Response("Unauthorized", { status: 401 });
      }
      
      const body = await clonedReq.text();
      
      // Verify signature
      const hmac = crypto.createHmac("sha256", process.env.ANTHROPIC_WEBHOOK_SECRET);
      const data = `${timestamp}.${body}`;
      const expectedSignature = hmac.update(data).digest("hex");
      
      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature");
        return new Response("Unauthorized", { status: 401 });
      }
    }
    
    // Parse webhook payload
    const payload = await req.json();
    console.log("Received webhook from Anthropic:", payload.type);
    
    // Handle different webhook types
    switch (payload.type) {
      case "batch.completed":
      case "batch.failed":
      case "batch.canceled":
      case "batch.in_progress":
        return await handleBatchUpdate(payload);
      default:
        console.warn(`Unhandled webhook type: ${payload.type}`);
        return new Response("OK");
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
async function handleBatchUpdate(payload: any) {
  const { batch_id, status, completions } = payload;
  
  // Find batch in database
  const batch = await prisma.batch.findUnique({
    where: { anthropicId: batch_id },
  });
  
  if (!batch) {
    console.error(`Batch not found for ID: ${batch_id}`);
    return new Response("Batch not found", { status: 404 });
  }
  
  console.log(`Updating batch ${batch.id} status to ${mapAnthropicStatus(status)}`);
  
  // Update batch status
  await prisma.batch.update({
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
        
        await prisma.completion.update({
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