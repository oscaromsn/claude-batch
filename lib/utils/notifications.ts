import { toast } from "sonner";

type NotificationType = "success" | "error" | "warning" | "info";

interface NotificationOptions {
    title?: string;
    description: string;
    type: NotificationType;
    duration?: number;
}

/**
 * Show a notification toast
 */
export function showNotification({
    title,
    description,
    type,
    duration = 5000,
}: NotificationOptions): void {
    switch (type) {
        case "success":
            toast.success(description, {
                id: title,
                duration,
            });
            break;
        case "error":
            toast.error(description, {
                id: title,
                duration,
            });
            break;
        case "warning":
            toast.warning(description, {
                id: title,
                duration,
            });
            break;
        case "info":
            toast.info(description, {
                id: title,
                duration,
            });
            break;
        default:
            toast(description, {
                id: title,
                duration,
            });
    }
}

/**
 * Show a success notification
 */
export function showSuccess(description: string, title?: string): void {
    showNotification({
        title,
        description,
        type: "success",
    });
}

/**
 * Show an error notification
 */
export function showError(description: string, title?: string): void {
    showNotification({
        title,
        description,
        type: "error",
    });
}

/**
 * Show a warning notification
 */
export function showWarning(description: string, title?: string): void {
    showNotification({
        title,
        description,
        type: "warning",
    });
}

/**
 * Show an info notification
 */
export function showInfo(description: string, title?: string): void {
    showNotification({
        title,
        description,
        type: "info",
    });
}
