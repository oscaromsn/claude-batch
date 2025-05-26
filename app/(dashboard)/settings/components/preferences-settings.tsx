"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CLAUDE_MODELS, DEFAULT_MODEL } from "@/lib/constants/models";

const preferencesFormSchema = z.object({
    enableNotifications: z.boolean().default(true),
    defaultModel: z.string().min(1, {
        message: "Please select a default model.",
    }),
    autoSave: z.boolean().default(true),
});

type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

export function PreferencesSettings() {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<PreferencesFormValues>({
        resolver: zodResolver(preferencesFormSchema),
        defaultValues: {
            enableNotifications: true,
            defaultModel: DEFAULT_MODEL,
            autoSave: true,
        },
    });

    async function onSubmit(data: PreferencesFormValues) {
        setIsLoading(true);

        try {
            await axios.patch("/api/user/settings", {
                type: "preferences",
                data,
            });

            toast.success("Your preferences have been updated.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update preferences. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                    Manage your application preferences and settings.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                    >
                        <FormField
                            control={form.control}
                            name="enableNotifications"
                            render={({ field }) => (
                                <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">
                                            Notifications
                                        </FormLabel>
                                        <FormDescription>
                                            Receive email notifications about
                                            your batch completions.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="defaultModel"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Default Claude Model</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a model" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem
                                                value={CLAUDE_MODELS.OPUS_4}
                                            >
                                                Claude Opus 4
                                            </SelectItem>
                                            <SelectItem
                                                value={CLAUDE_MODELS.SONNET_4}
                                            >
                                                Claude Sonnet 4
                                            </SelectItem>
                                            <SelectItem
                                                value={CLAUDE_MODELS.SONNET_3_7}
                                            >
                                                Claude 3.7 Sonnet
                                            </SelectItem>
                                            <SelectItem
                                                value={
                                                    CLAUDE_MODELS.SONNET_3_5_V2
                                                }
                                            >
                                                Claude 3.5 Sonnet (Oct 2024)
                                            </SelectItem>
                                            <SelectItem
                                                value={CLAUDE_MODELS.HAIKU_3_5}
                                            >
                                                Claude 3.5 Haiku
                                            </SelectItem>
                                            <SelectItem
                                                value={CLAUDE_MODELS.OPUS_3}
                                            >
                                                Claude 3 Opus
                                            </SelectItem>
                                            <SelectItem
                                                value={CLAUDE_MODELS.SONNET_3}
                                            >
                                                Claude 3 Sonnet
                                            </SelectItem>
                                            <SelectItem
                                                value={CLAUDE_MODELS.HAIKU_3}
                                            >
                                                Claude 3 Haiku
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Select the default model for new batch
                                        requests.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="autoSave"
                            render={({ field }) => (
                                <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">
                                            Auto-Save
                                        </FormLabel>
                                        <FormDescription>
                                            Automatically save drafts of your
                                            batch requests.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save preferences"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
