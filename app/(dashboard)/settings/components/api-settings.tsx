"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import axios from "axios";

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
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const apiFormSchema = z.object({
  anthropicApiKey: z
    .string()
    .min(1, { message: "API key is required" })
    .refine(
      (value) => value.startsWith("sk-ant-"),
      { message: "Must be a valid Anthropic API key starting with 'sk-ant-'" }
    ),
  anthropicWebhookSecret: z
    .string()
    .min(1, { message: "Webhook secret is required" })
    .refine(
      (value) => value.startsWith("sk-ant-admin"),
      { message: "Must be a valid Anthropic Webhook Secret starting with 'sk-ant-admin'" }
    ),
});

type ApiFormValues = z.infer<typeof apiFormSchema>;

export function ApiSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);
  const [credentials, setCredentials] = useState<{
    anthropicApiKey: string;
    anthropicWebhookSecret: string;
    hasApiKey: boolean;
    hasWebhookSecret: boolean;
  } | null>(null);

  const form = useForm<ApiFormValues>({
    resolver: zodResolver(apiFormSchema),
    defaultValues: {
      anthropicApiKey: "",
      anthropicWebhookSecret: "",
    },
  });

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const response = await axios.get("/api/user/credentials");
        setCredentials(response.data);
        
        // Only set form values if they exist
        if (response.data.anthropicApiKey) {
          form.setValue("anthropicApiKey", response.data.anthropicApiKey);
        }
        
        if (response.data.anthropicWebhookSecret) {
          form.setValue("anthropicWebhookSecret", response.data.anthropicWebhookSecret);
        }
      } catch (error) {
        console.error("Failed to fetch credentials", error);
        toast.error("Failed to load API credentials");
      } finally {
        setIsLoadingCredentials(false);
      }
    };

    fetchCredentials();
  }, [form]);

  async function onSubmit(data: ApiFormValues) {
    setIsLoading(true);

    try {
      await axios.patch("/api/user/settings", {
        type: "api",
        data,
      });
      
      toast.success("Your API settings have been updated.");
      
      // Update credentials state
      setCredentials({
        anthropicApiKey: data.anthropicApiKey,
        anthropicWebhookSecret: data.anthropicWebhookSecret,
        hasApiKey: true,
        hasWebhookSecret: true,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update API settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Settings</CardTitle>
        <CardDescription>
          Manage your Anthropic API credentials for batch processing.
          {credentials?.hasApiKey && credentials?.hasWebhookSecret && (
            <p className="mt-2 text-green-600 text-sm">
              ✓ API credentials are configured
            </p>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingCredentials ? (
          <div className="space-y-4">
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-40 h-10" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="anthropicApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anthropic API Key</FormLabel>
                    <div className="flex">
                      <FormControl>
                        <div className="relative w-full">
                          <Input 
                            type={showApiKey ? "text" : "password"} 
                            placeholder="sk-ant-..." 
                            {...field} 
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="top-0 right-0 absolute h-full"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                          </Button>
                        </div>
                      </FormControl>
                    </div>
                    <FormDescription>
                      Your Anthropic API key for Claude Batch processing
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="anthropicWebhookSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anthropic Webhook Secret</FormLabel>
                    <div className="flex">
                      <FormControl>
                        <div className="relative w-full">
                          <Input 
                            type={showWebhookSecret ? "text" : "password"} 
                            placeholder="sk-ant-admin..." 
                            {...field} 
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="top-0 right-0 absolute h-full"
                            onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                          >
                            {showWebhookSecret ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                          </Button>
                        </div>
                      </FormControl>
                    </div>
                    <FormDescription>
                      Your Anthropic Webhook Secret for processing batch results
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save API Settings"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
} 