import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
    className?: string;
    children: ReactNode;
}

export function PageHeader({ className, children }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col gap-1", className)}>{children}</div>
    );
}

interface PageHeaderHeadingProps {
    className?: string;
    children: ReactNode;
}

export function PageHeaderHeading({
    className,
    children,
}: PageHeaderHeadingProps) {
    return (
        <h1 className={cn("text-3xl font-bold tracking-tight", className)}>
            {children}
        </h1>
    );
}

interface PageHeaderDescriptionProps {
    className?: string;
    children: ReactNode;
}

export function PageHeaderDescription({
    className,
    children,
}: PageHeaderDescriptionProps) {
    return <p className={cn("text-muted-foreground", className)}>{children}</p>;
}
