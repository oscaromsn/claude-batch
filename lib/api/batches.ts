import { prisma } from "@/lib/db";
import type { Batch, BatchStatus } from "@prisma/client";

// Define the sort field type
export enum BatchSortField {
    NAME = "name",
    MODEL = "model",
    STATUS = "status",
    CREATED_AT = "createdAt",
    COMPLETED_AT = "completedAt",
}

// Interface for getBatches parameters
interface GetBatchesParams {
    status?: BatchStatus;
    model?: string;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sortField?: string;
    sortOrder?: "asc" | "desc";
    limit?: number;
    offset?: number;
}

/**
 * Get batches with filtering and sorting
 */
export async function getBatches({
    status,
    model,
    search,
    dateFrom,
    dateTo,
    sortField = BatchSortField.CREATED_AT,
    sortOrder = "desc",
    limit = 50,
    offset = 0,
}: GetBatchesParams = {}): Promise<Batch[]> {
    // Build filter object
    const where: any = {};

    if (status) {
        where.status = status;
    }

    if (model) {
        where.model = model;
    }

    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
        ];
    }

    if (dateFrom) {
        where.createdAt = { ...where.createdAt, gte: dateFrom };
    }

    if (dateTo) {
        // Add one day to include the end date
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        where.createdAt = { ...where.createdAt, lt: endDate };
    }

    // Build order object
    const orderBy: any = {};
    orderBy[sortField] = sortOrder;

    // Perform query with pagination
    const batches = await prisma.batch.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
    });

    return batches;
}

/**
 * Get a single batch by ID
 */
export async function getBatchById(id: string): Promise<Batch | null> {
    return prisma.batch.findUnique({
        where: { id },
    });
}

/**
 * Cancel a batch
 */
export async function cancelBatch(id: string): Promise<Batch> {
    return prisma.batch.update({
        where: { id },
        data: {
            status: "CANCELED",
            completedAt: new Date(),
        },
    });
}

/**
 * Delete a batch and its completions
 */
export async function deleteBatch(id: string): Promise<void> {
    await prisma.$transaction([
        prisma.completion.deleteMany({
            where: { batchId: id },
        }),
        prisma.batch.delete({
            where: { id },
        }),
    ]);
}

/**
 * Update batch token counts and status
 */
export async function updateBatchStatus(
    id: string,
    status: BatchStatus,
    completedAt?: Date | null,
    inputTokens?: number | null,
    outputTokens?: number | null,
): Promise<Batch> {
    const data: any = { status };

    if (completedAt) {
        data.completedAt = completedAt;
    }

    if (inputTokens !== undefined && inputTokens !== null) {
        data.inputTokens = inputTokens;
    }

    if (outputTokens !== undefined && outputTokens !== null) {
        data.outputTokens = outputTokens;
    }

    return prisma.batch.update({
        where: { id },
        data,
    });
}
