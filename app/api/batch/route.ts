import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { anthropicClient } from "@/lib/api/anthropic";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db/prisma";
import { batchCreationSchema } from "@/lib/validation/batch.schema";

/**
 * @name BATCH_CREATION_FLOW
 * @description Creates a new batch job and submits it to Anthropic API
 */
export async function POST(req: Request) {
    try {
        // Get authenticated user
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Parse and validate request body
        const body = await req.json();
        const validatedData = batchCreationSchema.parse(body);

        // Get user with API credentials
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                anthropicApiKey: true,
                anthropicWebhookSecret: true,
            },
        });

        // Update Anthropic client with user's credentials if available
        if (user?.anthropicApiKey) {
            anthropicClient.updateCredentials({
                apiKey: user.anthropicApiKey,
                webhookSecret: user.anthropicWebhookSecret || undefined,
            });
        }

        // Format messages for API
        const messages = validatedData.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));

        // Create batch in database
        const batch = await db.batch.create({
            data: {
                name: validatedData.name,
                description: validatedData.description || null,
                model: validatedData.model,
                status: "PENDING",
                userId: session.user.id,
                settings: {
                    temperature: validatedData.temperature,
                    maxTokens: validatedData.maxTokens,
                    stopSequences: validatedData.stopSequences || [],
                    system: validatedData.system || null,
                    thinkingBudget: validatedData.thinkingBudget || null,
                },
                metadata: validatedData.metadata || {},
            },
        });

        // Create completions
        const completions = await Promise.all(
            [messages].map((input) =>
                db.completion.create({
                    data: {
                        batchId: batch.id,
                        status: "PENDING",
                        input: {
                            messages: input,
                            system: validatedData.system,
                        },
                    },
                }),
            ),
        );

        // Submit to Anthropic API
        try {
            console.log("Creating batch with Anthropic API:", {
                name: validatedData.name,
                model: validatedData.model,
                completion_id: completions[0].id,
            });

            const anthropicBatch = await anthropicClient.createBatch({
                name: validatedData.name,
                description: validatedData.description,
                model: validatedData.model,
                messages: validatedData.messages,
                system: validatedData.system,
                temperature: validatedData.temperature,
                maxTokens: validatedData.maxTokens,
                stopSequences: validatedData.stopSequences,
                // Remove all metadata fields as they're not permitted by Anthropic API
                metadata: {
                    // Metadata fields are not permitted by Anthropic API
                },
                betaHeaders: validatedData.betaHeaders,
                anthropicVersion: validatedData.anthropicVersion,
                thinkingBudget: validatedData.thinkingBudget,
            });

            console.log("Anthropic batch created:", {
                anthropicId: anthropicBatch.id,
                custom_id: anthropicBatch.custom_id,
                processing_status: anthropicBatch.processing_status,
                id_format: anthropicBatch.id.split("_")[0], // Extract the prefix
            });

            // Update batch with Anthropic ID
            await db.batch.update({
                where: { id: batch.id },
                data: {
                    anthropicId: anthropicBatch.id,
                    status: "IN_PROGRESS",
                    metadata: {
                        ...(batch.metadata as object),
                        anthropicCustomId:
                            anthropicBatch.custom_id || undefined,
                        createdAt: new Date().toISOString(),
                    },
                },
            });

            console.log("Database batch updated:", {
                batchId: batch.id,
                anthropicId: anthropicBatch.id,
                status: "IN_PROGRESS",
            });

            return NextResponse.json(batch, { status: 201 });
        } catch (error: unknown) {
            // Handle Anthropic API errors
            console.error("Anthropic API error:", error);

            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            const errorType = (error as { type?: string }).type || "api_error";

            // Update batch status to FAILED
            await db.batch.update({
                where: { id: batch.id },
                data: {
                    status: "FAILED",
                    metadata: {
                        ...(batch.metadata as object),
                        error: {
                            message: errorMessage,
                            type: errorType,
                        },
                    },
                },
            });

            return NextResponse.json(
                {
                    error: "Failed to create batch",
                    message: errorMessage,
                },
                { status: 500 },
            );
        }
    } catch (error) {
        console.error("Error creating batch:", error);

        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    error: "Validation error",
                    issues: error.errors,
                },
                { status: 400 },
            );
        }

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 },
        );
    }
}
