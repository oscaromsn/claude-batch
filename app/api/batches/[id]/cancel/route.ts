import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { cancelBatch } from "@/lib/api/batches";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
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

    // Check if the batch can be canceled
    if (batch.status !== "PENDING" && batch.status !== "IN_PROGRESS") {
      return new NextResponse("Batch cannot be canceled", { status: 400 });
    }

    // Cancel the batch
    const updatedBatch = await cancelBatch(params.id);

    return NextResponse.json(updatedBatch);
  } catch (error) {
    console.error("[BATCH_CANCEL]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 