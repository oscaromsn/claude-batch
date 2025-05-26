import { format, formatDistanceToNow } from "date-fns";

/**
 * Format a date with the specified format
 */
export function formatDate(date: Date | number, formatString = "PPP"): string {
    return format(date, formatString);
}

/**
 * Format a date as a relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(date: Date | number): string {
    return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Format a date as a short date (e.g., "Jan 1, 2023")
 */
export function formatShortDate(date: Date | number): string {
    return format(date, "MMM d, yyyy");
}

/**
 * Format a date as a time (e.g., "12:34 PM")
 */
export function formatTime(date: Date | number): string {
    return format(date, "h:mm a");
}

/**
 * Format a date as a date and time (e.g., "Jan 1, 2023 12:34 PM")
 */
export function formatDateTime(date: Date | number): string {
    return format(date, "MMM d, yyyy h:mm a");
}
