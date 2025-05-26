import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { deleteBatch, getBatchById } from "@/lib/api/batches";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
    req: Request,
    { params }: { params: { id: string } },
) {
    try {
        // Get the session
        const session = await getServerSession(authOptions);

        // Check if the user is authenticated
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;

        // Get the batch
        const batch = await getBatchById(params.id);

        // Check if the batch exists and belongs to the user
        if (!batch || batch.userId !== userId) {
            return new NextResponse("Batch not found", { status: 404 });
        }

        return NextResponse.json(batch);
    } catch (error) {
        console.error("[BATCH_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } },
) {
    try {
        // Get the session
        const session = await getServerSession(authOptions);

        // Check if the user is authenticated
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;

        // Check if the batch exists and belongs to the user
        const batch = await prisma.batch.findUnique({
            where: {
                id: params.id,
                userId,
            },
        });

        // Check if the batch exists
        if (!batch) {
            return new NextResponse("Batch not found", { status: 404 });
        }

        // Delete the batch
        await deleteBatch(params.id);

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[BATCH_DELETE]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
