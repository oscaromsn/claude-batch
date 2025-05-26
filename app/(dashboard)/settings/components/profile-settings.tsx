"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import type { User } from "next-auth";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Input } from "@/components/ui/input";

const profileFormSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    email: z.string().email({
        message: "Please enter a valid email address.",
    }),
    image: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileSettingsProps {
    user: User;
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: user.name || "",
            email: user.email || "",
            image: user.image || "",
        },
    });

    async function onSubmit(data: ProfileFormValues) {
        setIsLoading(true);

        try {
            await axios.patch("/api/user/settings", {
                type: "profile",
                data,
            });

            toast.success("Your profile has been updated.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update profile. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                    Manage your public profile information.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                    <Avatar className="w-24 h-24">
                        <AvatarImage
                            src={user.image || ""}
                            alt={user.name || "User"}
                        />
                        <AvatarFallback>
                            {user.name
                                ? user.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                : "U"}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-medium text-lg">{user.name}</h3>
                        <p className="text-muted-foreground text-sm">
                            {user.email}
                        </p>
                    </div>
                </div>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Your name"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Your email"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="image"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Profile Image URL</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="https://example.com/image.jpg"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Enter a URL to a profile image
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save changes"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
