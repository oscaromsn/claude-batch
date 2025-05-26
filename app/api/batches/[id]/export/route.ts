import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

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

        // Get the batch with completions
        const batch = await prisma.batch.findUnique({
            where: {
                id: params.id,
                userId,
            },
            include: {
                completions: true,
            },
        });

        // Check if the batch exists
        if (!batch) {
            return new NextResponse("Batch not found", { status: 404 });
        }

        // Return the batch data as JSON
        return NextResponse.json(batch, {
            headers: {
                "Content-Disposition": `attachment; filename="batch-${batch.id}.json"`,
            },
        });
    } catch (error) {
        console.error("[BATCH_EXPORT]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
