"use client";

import { format } from "date-fns";
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    CheckCircle2,
    Clock,
    Download,
    Info,
    MoreHorizontal,
    PauseCircle,
    Trash2,
    XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";

import { cn } from "@/lib/utils";
import type { Batch, BatchStatus } from "@prisma/client";

// Enum for sort fields
enum SortField {
    NAME = "name",
    MODEL = "model",
    STATUS = "status",
    CREATED_AT = "createdAt",
    COMPLETED_AT = "completedAt",
}

// Define batch data with client actions
interface BatchWithActions extends Batch {
    cancelBatch: () => Promise<void>;
    deleteBatch: () => Promise<void>;
    exportBatch: () => Promise<void>;
}

// Status badge component
function StatusBadge({ status }: { status: BatchStatus }) {
    const statusConfig = {
        PENDING: { label: "Pending", icon: Clock, variant: "outline" as const },
        IN_PROGRESS: {
            label: "In Progress",
            icon: Info,
            variant: "secondary" as const,
        },
        COMPLETED: {
            label: "Completed",
            icon: CheckCircle2,
            variant: "default" as const,
        },
        FAILED: {
            label: "Failed",
            icon: XCircle,
            variant: "destructive" as const,
        },
        CANCELED: {
            label: "Canceled",
            icon: PauseCircle,
            variant: "outline" as const,
        },
    };

    const config = statusConfig[status];

    return (
        <Badge variant={config.variant} className="gap-1">
            <config.icon className="w-3 h-3" />
            {config.label}
        </Badge>
    );
}

// Client component that receives data from server component
export function BatchListTable({ batches }: { batches: Batch[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Parse sorting parameters
    const sortField =
        (searchParams.get("sort") as SortField) || SortField.CREATED_AT;
    const sortOrder = searchParams.get("order") === "asc" ? "asc" : "desc";

    // Define action handlers
    async function cancelBatch(id: string) {
        try {
            const response = await fetch(`/api/batches/${id}/cancel`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to cancel batch");
            }

            router.refresh();
            return response.json();
        } catch (error) {
            console.error("Error canceling batch:", error);
            throw error;
        }
    }

    async function deleteBatch(id: string) {
        try {
            const response = await fetch(`/api/batches/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete batch");
            }

            router.refresh();
            return response.json();
        } catch (error) {
            console.error("Error deleting batch:", error);
            throw error;
        }
    }

    async function exportBatch(id: string) {
        try {
            const response = await fetch(`/api/batches/${id}/export`, {
                method: "GET",
            });

            if (!response.ok) {
                throw new Error("Failed to export batch");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `batch-${id}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting batch:", error);
            throw error;
        }
    }

    // Augment batches with actions
    const batchesWithActions = batches.map((batch) => ({
        ...batch,
        cancelBatch: async () => {
            try {
                await cancelBatch(batch.id);
                toast({
                    title: "Batch canceled",
                    description: `Batch "${batch.name}" has been canceled.`,
                });
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to cancel batch.",
                    variant: "destructive",
                });
            }
        },
        deleteBatch: async () => {
            try {
                await deleteBatch(batch.id);
                toast({
                    title: "Batch deleted",
                    description: `Batch "${batch.name}" has been deleted.`,
                });
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to delete batch.",
                    variant: "destructive",
                });
            }
        },
        exportBatch: async () => {
            try {
                await exportBatch(batch.id);
                toast({
                    title: "Batch exported",
                    description: `Batch "${batch.name}" has been exported.`,
                });
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to export batch.",
                    variant: "destructive",
                });
            }
        },
    }));

    return (
        <BatchListTableClient
            batches={batchesWithActions}
            sortField={sortField}
            sortOrder={sortOrder}
        />
    );
}

// Client-side table component for handling interactions
function BatchListTableClient({
    batches,
    sortField,
    sortOrder,
}: {
    batches: BatchWithActions[];
    sortField: SortField;
    sortOrder: "asc" | "desc";
}) {
    const router = useRouter();
    const searchParams = useSearchParams();

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

        router.push(`/batches?${params.toString()}`);
    };

    // Get sort direction for header icons
    const getSortDirection = (field: SortField) => {
        if (field !== sortField) return null;
        return sortOrder === "asc" ? "asc" : "desc";
    };

    // Display message if no batches
    if (batches.length === 0) {
        return (
            <Card className="py-8 border-dashed text-center">
                <CardHeader>
                    <CardTitle>No batches found</CardTitle>
                    <CardDescription>
                        No batches match your current filters.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="justify-center">
                    <Button asChild>
                        <Link href="/batches/new">Create a new batch</Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead
                            onClick={() => handleSort(SortField.NAME)}
                            className="w-[200px] cursor-pointer"
                        >
                            <div className="flex items-center gap-1">
                                Name
                                {getSortDirection(SortField.NAME) === "asc" ? (
                                    <ArrowUp className="w-4 h-4" />
                                ) : getSortDirection(SortField.NAME) ===
                                  "desc" ? (
                                    <ArrowDown className="w-4 h-4" />
                                ) : (
                                    <ArrowUpDown className="w-4 h-4" />
                                )}
                            </div>
                        </TableHead>
                        <TableHead
                            onClick={() => handleSort(SortField.MODEL)}
                            className="cursor-pointer"
                        >
                            <div className="flex items-center gap-1">
                                Model
                                {getSortDirection(SortField.MODEL) === "asc" ? (
                                    <ArrowUp className="w-4 h-4" />
                                ) : getSortDirection(SortField.MODEL) ===
                                  "desc" ? (
                                    <ArrowDown className="w-4 h-4" />
                                ) : (
                                    <ArrowUpDown className="w-4 h-4" />
                                )}
                            </div>
                        </TableHead>
                        <TableHead
                            onClick={() => handleSort(SortField.STATUS)}
                            className="cursor-pointer"
                        >
                            <div className="flex items-center gap-1">
                                Status
                                {getSortDirection(SortField.STATUS) ===
                                "asc" ? (
                                    <ArrowUp className="w-4 h-4" />
                                ) : getSortDirection(SortField.STATUS) ===
                                  "desc" ? (
                                    <ArrowDown className="w-4 h-4" />
                                ) : (
                                    <ArrowUpDown className="w-4 h-4" />
                                )}
                            </div>
                        </TableHead>
                        <TableHead
                            onClick={() => handleSort(SortField.CREATED_AT)}
                            className="cursor-pointer"
                        >
                            <div className="flex items-center gap-1">
                                Created
                                {getSortDirection(SortField.CREATED_AT) ===
                                "asc" ? (
                                    <ArrowUp className="w-4 h-4" />
                                ) : getSortDirection(SortField.CREATED_AT) ===
                                  "desc" ? (
                                    <ArrowDown className="w-4 h-4" />
                                ) : (
                                    <ArrowUpDown className="w-4 h-4" />
                                )}
                            </div>
                        </TableHead>
                        <TableHead
                            onClick={() => handleSort(SortField.COMPLETED_AT)}
                            className="cursor-pointer"
                        >
                            <div className="flex items-center gap-1">
                                Completed
                                {getSortDirection(SortField.COMPLETED_AT) ===
                                "asc" ? (
                                    <ArrowUp className="w-4 h-4" />
                                ) : getSortDirection(SortField.COMPLETED_AT) ===
                                  "desc" ? (
                                    <ArrowDown className="w-4 h-4" />
                                ) : (
                                    <ArrowUpDown className="w-4 h-4" />
                                )}
                            </div>
                        </TableHead>
                        <TableHead>Completions</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {batches.map((batch) => (
                        <TableRow key={batch.id}>
                            <TableCell className="font-medium">
                                <Link
                                    href={`/batches/${batch.id}`}
                                    className="hover:underline"
                                >
                                    {batch.name}
                                </Link>
                                {batch.description && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="inline-block ml-1 w-4 h-4 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">
                                                    {batch.description}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </TableCell>
                            <TableCell>
                                <span className="font-mono text-xs">
                                    {batch.model
                                        .split("-")
                                        .slice(0, 3)
                                        .join(" ")}
                                </span>
                            </TableCell>
                            <TableCell>
                                <StatusBadge status={batch.status} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {format(
                                    new Date(batch.createdAt),
                                    "MMM d, yyyy",
                                )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {batch.completedAt
                                    ? format(
                                          new Date(batch.completedAt),
                                          "MMM d, yyyy",
                                      )
                                    : "-"}
                            </TableCell>
                            <TableCell>
                                <div className="flex space-x-1">
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        {batch.totalCompletions} total
                                    </Badge>
                                    {batch.errorCount > 0 && (
                                        <Badge
                                            variant="destructive"
                                            className="text-xs"
                                        >
                                            {batch.errorCount} failed
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                            <Link href={`/batches/${batch.id}`}>
                                                View details
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => batch.exportBatch()}
                                        >
                                            <Download className="mr-2 w-4 h-4" />
                                            Export
                                        </DropdownMenuItem>
                                        {(batch.status === "PENDING" ||
                                            batch.status === "IN_PROGRESS") && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    batch.cancelBatch()
                                                }
                                                className="text-amber-600 dark:text-amber-400"
                                            >
                                                <PauseCircle className="mr-2 w-4 h-4" />
                                                Cancel batch
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => batch.deleteBatch()}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="mr-2 w-4 h-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
