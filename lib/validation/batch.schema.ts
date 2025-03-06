import { z } from "zod";

// Common message schema
export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1, "Message content is required"),
});

export type Message = z.infer<typeof messageSchema>;

// Batch creation schema
export const batchCreationSchema = z.object({
  name: z.string().min(1, "Batch name is required"),
  description: z.string().optional(),
  messages: z.array(messageSchema).min(1, "At least one message is required"),
  model: z.enum([
    "claude-3-opus-20240229", 
    "claude-3-sonnet-20240229", 
    "claude-3-haiku-20240307"
  ]),
  temperature: z.number().min(0).max(1).default(0.7),
  maxTokens: z.number().int().positive().default(4096),
  stopSequences: z.array(z.string()).optional(),
  system: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export type BatchCreation = z.infer<typeof batchCreationSchema>;

// Batch response schema
export const batchResponseSchema = z.object({
  id: z.string(),
  object: z.literal("batch"),
  status: z.enum([
    "in_progress",
    "completed",
    "failed",
    "canceled",
  ]),
  input_tokens: z.number().int().optional(),
  output_tokens: z.number().int().optional(),
  completion_count: z.number().int(),
  error_count: z.number().int(),
  created_at: z.number(),
  model: z.string(),
  completions: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["completed", "failed", "in_progress"]),
      input: z.object({
        messages: z.array(messageSchema),
        system: z.string().optional(),
        temperature: z.number().optional(),
        max_tokens: z.number().int().optional(),
        stop_sequences: z.array(z.string()).optional(),
        metadata: z.record(z.string()).optional(),
      }),
      output: z
        .object({
          message: messageSchema,
          stop_reason: z.enum(["end_turn", "stop_sequence", "max_tokens"]),
          input_tokens: z.number().int(),
          output_tokens: z.number().int(),
        })
        .optional(),
      error: z
        .object({
          type: z.string(),
          message: z.string(),
        })
        .optional(),
    })
  ),
});

export type BatchResponse = z.infer<typeof batchResponseSchema>;

// API Key schema
export const apiKeySchema = z.object({
  name: z.string().min(1, "API key name is required"),
  expiresAt: z.date().optional(),
});

export type ApiKeyCreation = z.infer<typeof apiKeySchema>;

// Error schema
export const errorSchema = z.object({
  type: z.string(),
  message: z.string(),
  param: z.string().optional(),
  code: z.string().optional(),
});

export type ApiError = z.infer<typeof errorSchema>;
