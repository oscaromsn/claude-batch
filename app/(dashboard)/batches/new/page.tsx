import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/auth";
import BatchCreationForm from "./batch-creation-form";

export default async function NewBatchPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-bold text-3xl tracking-tight">
                    Create New Batch
                </h1>
                <p className="text-muted-foreground">
                    Create a new batch of Claude completions
                </p>
            </div>

            <BatchCreationForm />
        </div>
    );
}
