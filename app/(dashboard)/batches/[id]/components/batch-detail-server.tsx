import { getBatchById } from "@/lib/api/batches";
import { BatchDetailView } from "./batch-detail-view";

export async function BatchDetailServer({ batchId }: { batchId: string }) {
    const batch = await getBatchById(batchId);

    if (!batch) {
        throw new Error("Batch not found");
    }

    return <BatchDetailView batch={batch} />;
}
