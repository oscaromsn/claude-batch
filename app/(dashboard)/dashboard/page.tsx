import { Bot, History, ListPlus, Settings } from "lucide-react";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../../components/ui/card";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {session?.user?.name || "User"}
                </p>
            </div>

            <div className="gap-6 grid md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            Total Batches
                        </CardTitle>
                        <History className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">0</div>
                        <p className="text-muted-foreground text-xs">
                            Across all time
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            Active Batches
                        </CardTitle>
                        <Bot className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">0</div>
                        <p className="text-muted-foreground text-xs">
                            Currently processing
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            New Batch
                        </CardTitle>
                        <ListPlus className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <Link href="/batches/new">
                            <Button variant="outline" className="w-full">
                                Create Batch
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            Settings
                        </CardTitle>
                        <Settings className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <Link href="/settings">
                            <Button variant="outline" className="w-full">
                                Manage Settings
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
