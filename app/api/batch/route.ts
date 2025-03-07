import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth/auth";
import { anthropicClient } from "@/lib/api/anthropic";
import { prisma } from "@/lib/db/prisma";
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
        { status: 401 }
      );
    }
    
    // Parse and validate request body
    const body = await req.json();
    const validatedData = batchCreationSchema.parse(body);
    
    // Format messages for API
    const messages = validatedData.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Create batch in database
    const batch = await prisma.batch.create({
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
      [messages].map(input => 
        prisma.completion.create({
          data: {
            batchId: batch.id,
            status: "PENDING",
            input: { messages: input, system: validatedData.system },
          },
        })
      )
    );
    
    // Submit to Anthropic API
    try {
      const anthropicBatch = await anthropicClient.createBatch({
        name: validatedData.name,
        description: validatedData.description,
        model: validatedData.model,
        messages: validatedData.messages,
        system: validatedData.system,
        temperature: validatedData.temperature,
        maxTokens: validatedData.maxTokens,
        stopSequences: validatedData.stopSequences,
        metadata: {
          completion_id: completions[0].id,
        },
        betaHeaders: validatedData.betaHeaders,
        anthropicVersion: validatedData.anthropicVersion,
        thinkingBudget: validatedData.thinkingBudget,
      });
      
      // Update batch with Anthropic ID
      await prisma.batch.update({
        where: { id: batch.id },
        data: {
          anthropicId: anthropicBatch.id,
          status: "IN_PROGRESS",
        },
      });
      
      return NextResponse.json(batch, { status: 201 });
    } catch (error: any) {
      // Handle Anthropic API errors
      console.error("Anthropic API error:", error);
      
      // Update batch status to FAILED
      await prisma.batch.update({
        where: { id: batch.id },
        data: {
          status: "FAILED",
          metadata: {
            ...batch.metadata as object,
            error: {
              message: error.message || "Unknown error",
              type: error.type || "api_error",
            },
          },
        },
      });
      
      return NextResponse.json(
        { 
          error: "Failed to create batch",
          message: error.message || "Unknown error",
        },
        { status: 500 }
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
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}