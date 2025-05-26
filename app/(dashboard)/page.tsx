import { ArrowRight, Bot, History, ListPlus, Settings } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth/auth";
import { Button } from "../../components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {session?.user?.name || "User"}
                </p>
            </div>

            <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
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
                            Completions
                        </CardTitle>
                        <Bot className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">0</div>
                        <p className="text-muted-foreground text-xs">
                            Total processed
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">
                            API Keys
                        </CardTitle>
                        <Settings className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">0</div>
                        <p className="text-muted-foreground text-xs">
                            Active keys
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Batch</CardTitle>
                        <CardDescription>
                            Process multiple prompts with Claude AI
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <ListPlus className="w-16 h-16 text-muted-foreground" />
                    </CardContent>
                    <div className="p-6 pt-0">
                        <Link href="/batches/new">
                            <Button className="w-full">
                                Create Batch{" "}
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>View Batch History</CardTitle>
                        <CardDescription>
                            Browse and manage your previous batches
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <History className="w-16 h-16 text-muted-foreground" />
                    </CardContent>
                    <div className="p-6 pt-0">
                        <Link href="/batches">
                            <Button variant="outline" className="w-full">
                                View History{" "}
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Manage API Keys</CardTitle>
                        <CardDescription>
                            Configure your Anthropic API keys
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Settings className="w-16 h-16 text-muted-foreground" />
                    </CardContent>
                    <div className="p-6 pt-0">
                        <Link href="/settings/api-keys">
                            <Button variant="outline" className="w-full">
                                Manage Keys{" "}
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
