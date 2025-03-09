import { CompletionsList } from "./completions-list";
import { getCompletions } from "@/lib/api/completions";

export async function CompletionsServer({ batchId }: { batchId: string }) {
  try {
    // Default sort parameters if not provided
    const sortField = "createdAt";
    const sortOrder = "desc";
    
    // Fetch completions
    const completions = await getCompletions(batchId, {
      sortField,
      sortOrder,
    });
    
    // Pass completions data directly, without adding functions
    return (
      <CompletionsList 
        completions={completions} 
        batchId={batchId}
      />
    );
  } catch (_error: unknown) {
    return <div>Error loading completions</div>;
  }
} 