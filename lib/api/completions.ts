import { prisma } from "@/lib/db";
import { type Completion, type CompletionStatus } from "@prisma/client";

// Define the sort field type
export enum CompletionSortField {
  STATUS = "status",
  CREATED_AT = "createdAt",
  COMPLETED_AT = "completedAt",
}

// Interface for getCompletions parameters
interface GetCompletionsParams {
  status?: CompletionStatus;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/**
 * Get completions for a batch with sorting
 */
export async function getCompletions(
  batchId: string,
  {
    status,
    sortField = CompletionSortField.CREATED_AT,
    sortOrder = "desc",
    limit = 100,
    offset = 0,
  }: GetCompletionsParams = {}
): Promise<Completion[]> {
  // Build filter object
  const where: Record<string, any> = {
    batchId,
  };
  
  if (status) {
    where.status = status;
  }
  
  // Build order object
  const orderBy: Record<string, string> = {};
  orderBy[sortField] = sortOrder;
  
  // Perform query with pagination
  const completions = await prisma.completion.findMany({
    where,
    orderBy,
    take: limit,
    skip: offset,
  });
  
  return completions;
}

/**
 * Get a single completion by ID
 */
export async function getCompletionById(id: string): Promise<Completion | null> {
  return prisma.completion.findUnique({
    where: { id },
  });
}

/**
 * Count completions with specific status for a batch
 */
export async function countCompletionsByStatus(
  batchId: string,
  status: CompletionStatus
): Promise<number> {
  return prisma.completion.count({
    where: {
      batchId,
      status,
    },
  });
}

/**
 * Update batch completion stats
 */
export async function updateBatchCompletionStats(batchId: string): Promise<void> {
  // Get counts of all completion statuses
  const completedCount = await countCompletionsByStatus(batchId, "COMPLETED");
  const failedCount = await countCompletionsByStatus(batchId, "FAILED");
  const pendingCount = await countCompletionsByStatus(batchId, "PENDING");
  const inProgressCount = await countCompletionsByStatus(batchId, "IN_PROGRESS");
  
  // Calculate total count
  const totalCount = completedCount + failedCount + pendingCount + inProgressCount;
  
  // Determine batch status based on completion statuses
  let status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  
  if (pendingCount === totalCount) {
    status = "PENDING";
  } else if (inProgressCount > 0) {
    status = "IN_PROGRESS";
  } else if (failedCount === totalCount) {
    status = "FAILED";
  } else if (completedCount > 0 && pendingCount === 0 && inProgressCount === 0) {
    status = "COMPLETED";
  } else {
    status = "IN_PROGRESS"; // Default case
  }
  
  // Calculate token usage
  const completions = await prisma.completion.findMany({
    where: {
      batchId,
      status: "COMPLETED",
    },
    select: {
      inputTokens: true,
      outputTokens: true,
    },
  });
  
  const inputTokens = completions.reduce((sum, comp) => sum + (comp.inputTokens || 0), 0);
  const outputTokens = completions.reduce((sum, comp) => sum + (comp.outputTokens || 0), 0);
  
  // Update batch with new stats
  await prisma.batch.update({
    where: { id: batchId },
    data: {
      status,
      totalCompletions: totalCount,
      errorCount: failedCount,
      inputTokens,
      outputTokens,
      completedAt: status === "COMPLETED" || status === "FAILED" ? new Date() : undefined,
    },
  });
} 