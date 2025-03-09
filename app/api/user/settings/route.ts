import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth/auth";

// Profile schema
const profileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  image: z.string().optional(),
});

// Preferences schema
const preferencesSchema = z.object({
  enableNotifications: z.boolean(),
  defaultModel: z.string(),
  autoSave: z.boolean(),
});

// Defaults schema
const defaultsSchema = z.object({
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().min(100).max(100000),
  systemPrompt: z.string().optional(),
  anthropicApiVersion: z.string(),
  concurrentRequests: z.number().min(1).max(10),
});

// API schema
const apiSchema = z.object({
  anthropicApiKey: z
    .string()
    .min(1)
    .refine((value) => value.startsWith("sk-ant-"), {
      message: "Must be a valid Anthropic API key starting with 'sk-ant-'",
    }),
  anthropicWebhookSecret: z
    .string()
    .min(1)
    .refine((value) => value.startsWith("sk-ant-admin"), {
      message: "Must be a valid Anthropic Webhook Secret starting with 'sk-ant-admin'",
    }),
});

// Update profile
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    if (!type) {
      return new NextResponse("Missing type parameter", { status: 400 });
    }

    if (type === "profile") {
      const { data } = body;
      const validatedData = profileSchema.parse(data);

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          name: validatedData.name,
          email: validatedData.email,
          image: validatedData.image,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (type === "preferences") {
      const { data } = body;
      const validatedData = preferencesSchema.parse(data);

      // In a real app, you would store these in a UserPreferences table
      console.log("Updated preferences:", validatedData);

      return NextResponse.json({ success: true });
    }

    if (type === "defaults") {
      const { data } = body;
      const validatedData = defaultsSchema.parse(data);

      // In a real app, you would store these in a UserDefaults table
      console.log("Updated defaults:", validatedData);

      return NextResponse.json({ success: true });
    }

    if (type === "api") {
      const { data } = body;
      const validatedData = apiSchema.parse(data);

      // Store the API keys in the database
      // This would typically be encrypted in a production application
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          anthropicApiKey: validatedData.anthropicApiKey,
          anthropicWebhookSecret: validatedData.anthropicWebhookSecret,
        },
      });

      // Update environment variables (this is just for demonstration)
      // In a production app, you would use these values from the database directly
      // when making API calls, not update process.env
      process.env.ANTHROPIC_API_KEY = validatedData.anthropicApiKey;
      process.env.ANTHROPIC_WEBHOOK_SECRET = validatedData.anthropicWebhookSecret;

      return NextResponse.json({ success: true });
    }

    return new NextResponse("Invalid type parameter", { status: 400 });
  } catch (error) {
    console.error("[USER_SETTINGS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 