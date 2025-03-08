import { getBatches } from "@/lib/api/batches";
import { type BatchStatus } from "@prisma/client";
import { BatchListTable } from "./batch-list-table";

// Server component that fetches data
export async function BatchListServer() {
  const searchParams = new URL(
    typeof window === "undefined" 
      ? "http://localhost" // Dummy URL for server
      : window.location.href
  ).searchParams;
  
  // Parse search parameters
  const status = searchParams.get("status") || undefined;
  const model = searchParams.get("model") || undefined;
  const search = searchParams.get("search") || undefined;
  const dateFrom = searchParams.get("dateFrom") 
    ? new Date(searchParams.get("dateFrom")!) 
    : undefined;
  const dateTo = searchParams.get("dateTo") 
    ? new Date(searchParams.get("dateTo")!) 
    : undefined;
  
  // Parse sorting parameters
  const sortField = searchParams.get("sort") || "createdAt";
  const sortOrder = searchParams.get("order") === "asc" ? "asc" : "desc";
  
  // Fetch batches based on filters
  const batches = await getBatches({
    status: status as BatchStatus | undefined,
    model,
    search,
    dateFrom,
    dateTo,
    sortField,
    sortOrder,
  });

  // Pass the data to the client component
  return <BatchListTable batches={batches} />;
} 