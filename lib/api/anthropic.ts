import { Anthropic } from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/utils/env";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export interface BatchInput {
  messages: Message[];
  system?: string;
  max_tokens?: number;
  temperature?: number;
  stop_sequences?: string[];
  metadata?: Record<string, string>;
}

export interface BatchCompletion {
  id: string;
  status: "completed" | "failed" | "in_progress";
  input: BatchInput;
  output?: {
    message: Message;
    stop_reason: string;
    input_tokens: number;
    output_tokens: number;
  };
  error?: {
    type: string;
    message: string;
  };
}

export interface BatchResponse {
  id: string;
  object: "batch";
  status: "in_progress" | "completed" | "failed" | "canceled";
  input_tokens?: number;
  output_tokens?: number;
  completion_count: number;
  error_count: number;
  created_at: number;
  model: string;
  completions: BatchCompletion[];
}

export interface BatchCreationParams {
  name: string;
  description?: string;
  model: string;
  messages: Message[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  metadata?: Record<string, string>;
}

export interface BatchListParams {
  limit?: number;
  order?: "desc" | "asc";
  after?: string;
  before?: string;
  status?: "in_progress" | "completed" | "failed" | "canceled";
}

export class AnthropicClient {
  private client: Anthropic;
  private readonly maxRetries: number;
  
  constructor(apiKey?: string, maxRetries = 3) {
    const env = getEnv();
    this.client = new Anthropic({
      apiKey: apiKey || env.ANTHROPIC_API_KEY,
    });
    this.maxRetries = maxRetries;
  }
  
  /**
   * Create a new batch
   */
  async createBatch(params: BatchCreationParams): Promise<BatchResponse> {
    const { name, description, model, messages, system, temperature, maxTokens, stopSequences, metadata } = params;
    
    // Transform messages to Anthropic format
    const formattedMessages = messages.map(message => ({
      role: message.role,
      content: message.content,
    }));
    
    try {
      // Note: The SDK types might be outdated, using any here and casting to our interface
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (this.client as any).batches.create({
        model,
        inputs: [
          {
            messages: formattedMessages,
            system,
            max_tokens: maxTokens,
            temperature,
            stop_sequences: stopSequences,
            metadata,
          },
        ],
        metadata: {
          name,
          description,
          ...metadata,
        },
      });
      
      return response as BatchResponse;
    } catch (error) {
      console.error("Error creating batch:", error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get batch details
   */
  async getBatch(batchId: string): Promise<BatchResponse> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (this.client as any).batches.retrieve(batchId) as BatchResponse;
    } catch (error) {
      console.error(`Error retrieving batch ${batchId}:`, error);
      throw this.handleError(error);
    }
  }
  
  /**
   * List all batches
   */
  async listBatches(params: BatchListParams = {}): Promise<{ data: BatchResponse[]; has_more: boolean }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (this.client as any).batches.list({
        limit: params.limit,
        order: params.order,
        after: params.after,
        before: params.before,
        status: params.status,
      }) as { data: BatchResponse[]; has_more: boolean };
    } catch (error) {
      console.error("Error listing batches:", error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Cancel a batch
   */
  async cancelBatch(batchId: string): Promise<BatchResponse> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (this.client as any).batches.cancel(batchId) as BatchResponse;
    } catch (error) {
      console.error(`Error canceling batch ${batchId}:`, error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Handle API errors
   */
  private handleError(error: unknown): Error {
    // Type guard for API errors
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const apiError = error as { status: number; message?: string };
      
      if (apiError.status === 401) {
        return new Error("Invalid API key. Please check your Anthropic API key.");
      }
      
      if (apiError.status === 429) {
        return new Error("Rate limit exceeded. Please try again later.");
      }
      
      if (apiError.status >= 500) {
        return new Error("Anthropic API server error. Please try again later.");
      }
      
      // If it has a message property, use it
      if ('message' in error && typeof apiError.message === 'string') {
        return new Error(apiError.message);
      }
    }
    
    return error instanceof Error 
      ? error 
      : new Error("An unknown error occurred with the Anthropic API.");
  }
}

// Create singleton instance
export const anthropicClient = new AnthropicClient();
