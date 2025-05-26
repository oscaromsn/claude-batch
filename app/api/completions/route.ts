import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { CompletionSortField, getCompletions } from "@/lib/api/completions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { CompletionStatus } from "@prisma/client";

// Define the query schema
const querySchema = z.object({
    batchId: z.string().min(1, "Batch ID is required"),
    status: z
        .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"])
        .optional(),
    sort: z.enum(["status", "createdAt", "completedAt"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
});

export async function GET(req: Request) {
    try {
        // Get the session
        const session = await getServerSession(authOptions);

        // Check if the user is authenticated
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;

        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const queryParams: Record<string, string | undefined> = {};

        searchParams.forEach((value, key) => {
            queryParams[key] = value;
        });

        // Validate and transform query parameters
        const validatedQuery = querySchema.parse(queryParams);

        // Check if the batch exists and belongs to the user
        const batch = await prisma.batch.findUnique({
            where: {
                id: validatedQuery.batchId,
                userId,
            },
        });

        if (!batch) {
            return new NextResponse("Batch not found", { status: 404 });
        }

        // Get completions with filtering
        const completions = await getCompletions(validatedQuery.batchId, {
            status: validatedQuery.status as CompletionStatus | undefined,
            sortField: validatedQuery.sort || CompletionSortField.CREATED_AT,
            sortOrder: validatedQuery.order || "desc",
            limit: validatedQuery.limit
                ? Number.parseInt(validatedQuery.limit, 10)
                : 100,
            offset: validatedQuery.offset
                ? Number.parseInt(validatedQuery.offset, 10)
                : 0,
        });

        return NextResponse.json(completions);
    } catch (error) {
        console.error("[COMPLETIONS_GET]", error);

        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.errors), {
                status: 400,
            });
        }

        return new NextResponse("Internal error", { status: 500 });
    }
}
