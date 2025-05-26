import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import {
    PageHeader,
    PageHeaderDescription,
    PageHeaderHeading,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BatchFilters } from "./components/batch-filters";
import { BatchListServer } from "./components/batch-list-server";

export const metadata = {
    title: "Batch History",
    description: "Manage your Claude batch completions",
};

export default function BatchesPage() {
    return (
        <div className="space-y-6 py-6 container">
            <div className="flex justify-between items-center">
                <PageHeader>
                    <PageHeaderHeading>Batch History</PageHeaderHeading>
                    <PageHeaderDescription>
                        View, filter, and manage your Claude batch completions
                    </PageHeaderDescription>
                </PageHeader>
                <Button asChild size="sm">
                    <Link href="/batches/new">
                        <Plus className="mr-2 w-4 h-4" />
                        New Batch
                    </Link>
                </Button>
            </div>
            <Separator />

            <BatchFilters />

            <Suspense fallback={<BatchListTableSkeleton />}>
                <BatchListServer />
            </Suspense>
        </div>
    );
}

function BatchListTableSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="w-48 h-8" />
                <Skeleton className="w-24 h-8" />
            </div>
            <div className="border rounded-md">
                <div className="flex items-center px-4 border-b h-12">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="mx-2 w-32 h-4" />
                    ))}
                </div>
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center px-4 last:border-0 border-b h-16"
                    >
                        {[...Array(5)].map((_, j) => (
                            <Skeleton key={j} className="mx-2 w-32 h-4" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
