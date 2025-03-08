import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getBatches, BatchSortField } from "@/lib/api/batches";
import { BatchStatus } from "@prisma/client";

// Define the query schema
const querySchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELED"]).optional(),
  model: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["name", "model", "status", "createdAt", "completedAt"]).optional(),
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
    
    // Get batches with filtering
    const batches = await getBatches({
      status: validatedQuery.status as BatchStatus | undefined,
      model: validatedQuery.model,
      search: validatedQuery.search,
      dateFrom: validatedQuery.dateFrom ? new Date(validatedQuery.dateFrom) : undefined,
      dateTo: validatedQuery.dateTo ? new Date(validatedQuery.dateTo) : undefined,
      sortField: validatedQuery.sort || BatchSortField.CREATED_AT,
      sortOrder: validatedQuery.order || "desc",
      limit: validatedQuery.limit ? parseInt(validatedQuery.limit, 10) : 50,
      offset: validatedQuery.offset ? parseInt(validatedQuery.offset, 10) : 0,
    });

    return NextResponse.json(batches);
  } catch (error) {
    console.error("[BATCHES_GET]", error);
    
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    
    return new NextResponse("Internal error", { status: 500 });
  }
} 