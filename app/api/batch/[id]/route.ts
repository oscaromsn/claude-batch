import { getServerSession } from "next-auth/next";
import { type NextRequest, NextResponse } from "next/server";

import { anthropicClient } from "@/lib/api/anthropic";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db/prisma";

/**
 * Retrieves a specific batch with its completions
 */
export async function GET(
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

        const { id } = params;

        const batch = await db.batch.findUnique({
            where: {
                id,
                userId: session.user.id,
            },
            include: {
                completions: true,
            },
        });

        if (!batch) {
            return NextResponse.json(
                { error: "Batch not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(batch);
    } catch (error) {
        console.error("Error fetching batch:", error);

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 },
        );
    }
}

/**
 * Cancels a batch in progress
 */
export async function DELETE(
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

        const { id } = params;

        // Get the batch
        const batch = await db.batch.findUnique({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (!batch) {
            return NextResponse.json(
                { error: "Batch not found" },
                { status: 404 },
            );
        }

        // Only allow cancellation of batches in progress
        if (batch.status !== "IN_PROGRESS" && batch.status !== "PENDING") {
            return NextResponse.json(
                { error: "Batch cannot be canceled" },
                { status: 400 },
            );
        }

        // Cancel the batch in Anthropic if it has an Anthropic ID
        if (batch.anthropicId) {
            try {
                await anthropicClient.cancelBatch(batch.anthropicId);
            } catch (error: any) {
                console.error("Error canceling batch in Anthropic:", error);
                // Continue even if Anthropic cancellation fails
            }
        }

        // Update batch status in database
        await db.batch.update({
            where: { id },
            data: {
                status: "CANCELED",
                completedAt: new Date(),
            },
        });

        return NextResponse.json({ status: "CANCELED" });
    } catch (error) {
        console.error("Error canceling batch:", error);

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 },
        );
    }
}
