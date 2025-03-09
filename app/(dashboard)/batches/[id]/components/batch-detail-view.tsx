"use client";
 
import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  Clock, 
  Download, 
  Info, 
  LucideIcon, 
  PauseCircle, 
  RefreshCw,
  Trash2, 
  XCircle 
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";

import { type Batch, type BatchStatus } from "@prisma/client";
import { capitalize } from "@/lib/utils";

// Status definitions for UI representation
const STATUS_CONFIG: Record<BatchStatus, {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}> = {
  PENDING: {
    label: "Pending",
    description: "Batch is queued and waiting to be processed",
    icon: Clock,
    color: "text-muted-foreground"
  },
  IN_PROGRESS: {
    label: "In Progress",
    description: "Batch is currently being processed",
    icon: Info,
    color: "text-blue-500 dark:text-blue-400"
  },
  COMPLETED: {
    label: "Completed",
    description: "All completions in this batch have finished successfully",
    icon: CheckCircle2,
    color: "text-green-500 dark:text-green-400"
  },
  FAILED: {
    label: "Failed",
    description: "Batch processing encountered errors",
    icon: XCircle,
    color: "text-destructive"
  },
  CANCELED: {
    label: "Canceled",
    description: "Batch was manually canceled",
    icon: PauseCircle,
    color: "text-amber-500 dark:text-amber-400"
  }
};

// Client component to receive batch data from server component
export function BatchDetailView({ batch }: { batch: Batch }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Batch status info
  const statusInfo = STATUS_CONFIG[batch.status];
  
  // Calculate token usage
  const inputTokens = batch.inputTokens || 0;
  const outputTokens = batch.outputTokens || 0;
  const totalTokens = inputTokens + outputTokens;
  
  // Format timestamps
  const createdDate = format(new Date(batch.createdAt), "PPP");
  const createdTime = format(new Date(batch.createdAt), "p");
  const completedDate = batch.completedAt 
    ? format(new Date(batch.completedAt), "PPP") 
    : null;
  const completedTime = batch.completedAt 
    ? format(new Date(batch.completedAt), "p") 
    : null;
  
  // Format model name
  const modelName = batch.model.split("-").slice(0, 3).join(" ");
  
  // Handle batch cancellation
  const cancelBatch = async () => {
    setIsCanceling(true);
    try {
      const response = await fetch(`/api/batches/${batch.id}/cancel`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to cancel batch");
      }
      
      toast({
        title: "Batch canceled",
        description: `Batch "${batch.name}" has been canceled.`,
      });
      
      router.refresh();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to cancel batch.",
        variant: "destructive",
      });
    } finally {
      setIsCanceling(false);
    }
  };
  
  // Handle batch deletion
  const deleteBatch = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/batches/${batch.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete batch");
      }
      
      toast({
        title: "Batch deleted",
        description: `Batch "${batch.name}" has been deleted.`,
      });
      
      router.push("/batches");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to delete batch.",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };
  
  // Handle batch export
  const exportBatch = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/batches/${batch.id}/export`, {
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
      a.download = `batch-${batch.id}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Batch exported",
        description: `Batch "${batch.name}" has been exported.`,
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to export batch.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle batch sync with Anthropic
  const syncWithAnthropic = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/batches/${batch.id}/sync`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to sync batch with Anthropic");
      }
      
      const updatedBatch = await response.json();
      
      toast({
        title: "Batch synced",
        description: `Batch "${batch.name}" has been synced with Anthropic.`,
      });
      
      router.refresh();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to sync batch with Anthropic.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Get the last synced time from metadata
  const metadata = batch.metadata as Record<string, any> || {};
  const lastSyncedAt = metadata.lastSyncedAt ? new Date(metadata.lastSyncedAt) : null;
  const lastSyncedTime = lastSyncedAt 
    ? `Last synced: ${format(lastSyncedAt, 'MMM d, yyyy h:mm a')}`
    : 'Not synced yet';
  
  return (
    <div className="space-y-6">
      <div className="flex lg:flex-row flex-col lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="font-bold text-2xl">{batch.name}</h1>
          {batch.description && (
            <p className="mt-1 text-muted-foreground">{batch.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Sync with Anthropic button */}
          {(batch.status === "PENDING" || batch.status === "IN_PROGRESS") && (
            <Button 
              variant="outline" 
              onClick={syncWithAnthropic}
              disabled={isSyncing}
              className="space-x-2"
            >
              {isSyncing ? (
                <RefreshCw className="mr-2 w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 w-4 h-4" />
              )}
              Sync with Anthropic
            </Button>
          )}
          
          {/* Cancel button (only for pending or in_progress batches) */}
          {(batch.status === "PENDING" || batch.status === "IN_PROGRESS") && (
            <Button 
              variant="outline" 
              onClick={cancelBatch}
              disabled={isCanceling}
            >
              {isCanceling ? (
                <Clock className="mr-2 w-4 h-4 animate-spin" />
              ) : (
                <PauseCircle className="mr-2 w-4 h-4" />
              )}
              Cancel Batch
            </Button>
          )}
          
          {/* Export button */}
          <Button 
            variant="outline" 
            onClick={exportBatch}
            disabled={isExporting}
          >
            {isExporting ? (
              <Clock className="mr-2 w-4 h-4 animate-spin" />
            ) : (
              <Download className="mr-2 w-4 h-4" />
            )}
            Export
          </Button>
          
          {/* Delete button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Clock className="mr-2 w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 w-4 h-4" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the batch "{batch.name}" and all its completions.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteBatch} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {/* Status and metadata cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Status card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <statusInfo.icon className={`w-5 h-5 ${statusInfo.color}`} />
              <span className="font-medium">{statusInfo.label}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{statusInfo.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {/* Display last synced info */}
            {batch.anthropicId && (
              <p className="mt-2 text-muted-foreground text-xs">
                {lastSyncedTime}
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Model card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{capitalize(modelName)}</div>
            <p className="mt-1 font-mono text-muted-foreground text-xs">{batch.model}</p>
          </CardContent>
        </Card>
        
        {/* Completion stats card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{batch.totalCompletions} total</div>
            <div className="flex items-center gap-2 mt-1">
              {batch.errorCount > 0 ? (
                <Badge variant="destructive" className="text-xs">
                  {batch.errorCount} failed
                </Badge>
              ) : batch.status === "COMPLETED" ? (
                <Badge variant="default" className="text-xs">
                  All successful
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
        
        {/* Token usage card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Token Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {(inputTokens > 0 || outputTokens > 0) ? (
              <div>
                <div className="font-semibold">{totalTokens.toLocaleString()} total</div>
                <div className="flex items-center gap-2 mt-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-xs">
                          Input: {inputTokens.toLocaleString()}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tokens used in prompt messages</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-xs">
                          Output: {outputTokens.toLocaleString()}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tokens used in completions</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">Not available</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Timestamps */}
      <div className="flex items-center gap-6 text-muted-foreground text-sm">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>Created: {createdDate} at {createdTime}</span>
        </div>
        
        {completedDate && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Completed: {completedDate} at {completedTime}</span>
            </div>
          </>
        )}
      </div>
      
      {/* Batch settings */}
      {batch.settings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Batch Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(batch.settings as Record<string, any>).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="font-medium text-sm">{capitalize(key)}</div>
                  <div className="text-sm">
                    {typeof value === "object" 
                      ? JSON.stringify(value) 
                      : String(value)
                    }
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
 