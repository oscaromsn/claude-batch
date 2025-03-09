"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowDown, 
  ArrowUp, 
  ArrowUpDown, 
  CheckCircle2, 
  Clock, 
  Download, 
  ExternalLink, 
  Info, 
  MoreHorizontal, 
  XCircle 
} from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { type Completion, type CompletionStatus } from "@prisma/client";

// Enum for sort fields
enum SortField {
  STATUS = "status",
  CREATED_AT = "createdAt",
  COMPLETED_AT = "completedAt",
}

// Status badge component
function StatusBadge({ status }: { status: CompletionStatus }) {
  const statusConfig = {
    PENDING: { label: "Pending", icon: Clock, variant: "outline" as const },
    IN_PROGRESS: { label: "In Progress", icon: Info, variant: "secondary" as const },
    COMPLETED: { label: "Completed", icon: CheckCircle2, variant: "default" as const },
    FAILED: { label: "Failed", icon: XCircle, variant: "destructive" as const },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className="gap-1">
      <config.icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

// Client component
export function CompletionsList({ 
  completions,
  batchId
}: { 
  completions: Completion[];
  batchId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get sort fields from URL (or defaults)
  const sortField = (searchParams.get("sort") as SortField) || SortField.CREATED_AT;
  const sortOrder = searchParams.get("order") === "asc" ? "asc" : "desc";
  
  // Handle sort change
  const handleSort = (field: SortField) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Toggle order if same field, otherwise default to asc
    if (field === sortField) {
      params.set("order", sortOrder === "asc" ? "desc" : "asc");
    } else {
      params.set("sort", field);
      params.set("order", "asc");
    }
    
    router.push(`/batches/${batchId}?${params.toString()}`);
  };
  
  // Get sort direction for header icons
  const getSortDirection = (field: SortField) => {
    if (field !== sortField) return null;
    return sortOrder === "asc" ? "asc" : "desc";
  };

  // Handle export of a single completion
  const handleExport = (completion: Completion) => {
    try {
      // Create export data
      const data = {
        id: completion.id,
        batchId: completion.batchId,
        anthropicId: completion.anthropicId,
        status: completion.status,
        createdAt: completion.createdAt,
        updatedAt: completion.updatedAt,
        completedAt: completion.completedAt,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        input: completion.input,
        output: completion.output,
        error: completion.error,
      };
      
      // Create and download the file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `completion-${completion.id}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Completion exported",
        description: "Completion has been exported successfully.",
      });
    } catch (_error: unknown) {
      toast({
        title: "Export failed",
        description: "Could not export completion.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl">Completions</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Export all completions as a single JSON file
            const data = completions.map(c => ({
              id: c.id,
              status: c.status,
              input: c.input,
              output: c.output,
              error: c.error,
              inputTokens: c.inputTokens,
              outputTokens: c.outputTokens,
              createdAt: c.createdAt,
              completedAt: c.completedAt,
            }));
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `batch-${batchId}-completions.json`;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            toast({
              title: "All completions exported",
              description: `Exported ${completions.length} completions.`
            });
          }}
        >
          <Download className="mr-2 w-4 h-4" />
          Export All
        </Button>
      </div>
      
      {completions && completions.length === 0 ? (
        <div className="p-8 border rounded-md text-center">
          <p className="text-muted-foreground">No completions found for this batch.</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead onClick={() => handleSort(SortField.STATUS)} className="cursor-pointer">
                  <div className="flex items-center gap-1">
                    Status
                    {getSortDirection(SortField.STATUS) === "asc" ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : getSortDirection(SortField.STATUS) === "desc" ? (
                      <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort(SortField.CREATED_AT)} className="cursor-pointer">
                  <div className="flex items-center gap-1">
                    Created
                    {getSortDirection(SortField.CREATED_AT) === "asc" ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : getSortDirection(SortField.CREATED_AT) === "desc" ? (
                      <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completions && completions.map((completion) => (
                <TableRow key={completion.id}>
                  <TableCell className="font-mono text-xs">
                    {completion.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={completion.status} />
                  </TableCell>
                  <TableCell>
                    {format(new Date(completion.createdAt), "Pp")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExport(completion)}>
                          <Download className="mr-2 w-4 h-4" />
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href={`/completions/${completion.id}`} className="flex items-center w-full">
                            <ExternalLink className="mr-2 w-4 h-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 