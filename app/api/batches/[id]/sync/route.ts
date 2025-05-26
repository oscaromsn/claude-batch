import { getServerSession } from "next-auth/next";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { syncBatchWithAnthropic } from "@/lib/services/batchSyncService";

/**
 * @api {post} /api/batches/:id/sync Sync batch status with Anthropic
 * @apiDescription Manually sync a batch's status with the Anthropic API
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } },
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Fix for Next.js 15.2.1 params access
        // Params must be awaited before accessing its properties
        const paramsResolved = await params;
        const batchId = Array.isArray(paramsResolved.id)
            ? paramsResolved.id[0]
            : paramsResolved.id.toString();

        // Check if batch exists and belongs to the user
        const batch = await db.batch.findUnique({
            where: {
                id: batchId,
                userId: session.user.id,
            },
        });

        if (!batch) {
            return NextResponse.json(
                { error: "Batch not found" },
                { status: 404 },
            );
        }

        // Sync batch with Anthropic
        try {
            const updatedBatch = await syncBatchWithAnthropic(batchId);

            if (!updatedBatch) {
                return NextResponse.json(
                    { error: "Batch could not be synced" },
                    { status: 400 },
                );
            }

            return NextResponse.json({
                ...updatedBatch,
                message: "Batch synced successfully",
            });
        } catch (error: unknown) {
            console.error("Error syncing batch with Anthropic:", error);

            // Provide more descriptive error message
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred";

            return NextResponse.json(
                {
                    error: "Failed to sync batch with Anthropic",
                    message: errorMessage,
                },
                { status: 500 },
            );
        }
    } catch (error) {
        console.error("Error in batch sync API:", error);

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 },
        );
    }
}
