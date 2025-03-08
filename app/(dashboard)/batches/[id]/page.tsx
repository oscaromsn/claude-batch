import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Download, PauseCircle, Trash2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PageHeader, PageHeaderDescription, PageHeaderHeading } from "@/components/page-header";
import { BatchDetailView } from "./components/batch-detail-view";
import { CompletionsList } from "./components/completions-list";

export const metadata = {
  title: "Batch Details",
  description: "View details and manage batch completions",
};

export default function BatchDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6 py-6 container">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/batches">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <PageHeader>
          <PageHeaderHeading>Batch Details</PageHeaderHeading>
          <PageHeaderDescription>
            View and manage this batch's completions
          </PageHeaderDescription>
        </PageHeader>
      </div>
      <Separator />
      
      <Suspense fallback={<BatchDetailSkeleton />}>
        <BatchDetailView batchId={params.id} />
      </Suspense>
      
      <Suspense fallback={<CompletionsListSkeleton />}>
        <CompletionsList batchId={params.id} />
      </Suspense>
    </div>
  );
}

function BatchDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="w-64 h-8" />
        <div className="flex gap-2">
          <Skeleton className="w-24 h-9" />
          <Skeleton className="w-24 h-9" />
        </div>
      </div>
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2 p-4 border rounded-lg">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-full h-8" />
          </div>
        ))}
      </div>
      <div className="space-y-4 p-6 border rounded-lg">
        <Skeleton className="w-32 h-5" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="w-full h-4" />
          ))}
        </div>
      </div>
    </div>
  );
}

function CompletionsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="w-40 h-6" />
        <Skeleton className="w-32 h-9" />
      </div>
      <div className="border rounded-md">
        <div className="flex items-center px-4 border-b h-12">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="mx-2 w-32 h-4" />
          ))}
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center px-4 last:border-0 border-b h-16">
            {[...Array(4)].map((_, j) => (
              <Skeleton key={j} className="mx-2 w-32 h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
} 