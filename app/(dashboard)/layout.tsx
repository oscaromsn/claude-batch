import {
    Bot,
    History,
    LayoutDashboard,
    ListPlus,
    Menu,
    Settings,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { authOptions } from "@/lib/auth/auth";
import { Button } from "../../components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "../../components/ui/sheet";
import { SignOutButton } from "./components/signout-button";

interface DashboardLayoutProps {
    children: ReactNode;
}

export default async function DashboardLayout({
    children,
}: DashboardLayoutProps) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="flex flex-col min-h-screen">
            <header className="top-0 z-40 sticky bg-background border-b">
                <div className="mx-auto container">
                    <div className="flex justify-between items-center py-4 h-16">
                        <div className="flex items-center gap-2">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="md:hidden"
                                        aria-label="Toggle menu"
                                    >
                                        <Menu className="w-5 h-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent
                                    side="left"
                                    className="w-[240px] sm:w-[300px]"
                                >
                                    <SheetHeader>
                                        <SheetTitle>
                                            <div className="flex items-center gap-2">
                                                <Bot className="w-5 h-5" />
                                                <span>Claude Batch</span>
                                            </div>
                                        </SheetTitle>
                                    </SheetHeader>
                                    <nav className="flex flex-col gap-2 mt-8">
                                        <Link href="/dashboard">
                                            <Button
                                                variant="ghost"
                                                className="justify-start gap-2 w-full"
                                            >
                                                <LayoutDashboard className="w-4 h-4" />
                                                Dashboard
                                            </Button>
                                        </Link>
                                        <Link href="/batches/new">
                                            <Button
                                                variant="ghost"
                                                className="justify-start gap-2 w-full"
                                            >
                                                <ListPlus className="w-4 h-4" />
                                                New Batch
                                            </Button>
                                        </Link>
                                        <Link href="/batches">
                                            <Button
                                                variant="ghost"
                                                className="justify-start gap-2 w-full"
                                            >
                                                <History className="w-4 h-4" />
                                                Batch History
                                            </Button>
                                        </Link>
                                        <Link href="/settings">
                                            <Button
                                                variant="ghost"
                                                className="justify-start gap-2 w-full"
                                            >
                                                <Settings className="w-4 h-4" />
                                                Settings
                                            </Button>
                                        </Link>
                                    </nav>
                                </SheetContent>
                            </Sheet>
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2"
                            >
                                <Bot className="w-6 h-6" />
                                <span className="font-bold text-xl">
                                    Claude Batch
                                </span>
                            </Link>
                        </div>
                        <nav className="flex items-center gap-4">
                            <div className="hidden md:flex md:gap-2">
                                <Link href="/dashboard">
                                    <Button variant="ghost" size="sm">
                                        Dashboard
                                    </Button>
                                </Link>
                                <Link href="/batches/new">
                                    <Button variant="ghost" size="sm">
                                        New Batch
                                    </Button>
                                </Link>
                                <Link href="/batches">
                                    <Button variant="ghost" size="sm">
                                        Batch History
                                    </Button>
                                </Link>
                                <Link href="/settings">
                                    <Button variant="ghost" size="sm">
                                        Settings
                                    </Button>
                                </Link>
                            </div>
                            <ThemeToggle />
                            <SignOutButton />
                        </nav>
                    </div>
                </div>
            </header>
            <main className="flex-1 py-6">
                <div className="mx-auto container">{children}</div>
            </main>
        </div>
    );
}
