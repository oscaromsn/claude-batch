import { Anthropic } from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/utils/env";
import * as crypto from "crypto";

// Add this interface for custom headers
export interface CustomHeaders {
  [key: string]: string;
}

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
  betaHeaders?: Array<{ name: string; value: string }>;
  anthropicVersion?: string;
  thinkingBudget?: number;
}

export interface BatchListParams {
  limit?: number;
  order?: "desc" | "asc";
  after?: string;
  before?: string;
  status?: "in_progress" | "completed" | "failed" | "canceled";
}

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
  retryableStatusCodes: number[];
}

export interface AnthropicClientOptions {
  apiKey?: string;
  webhookSecret?: string;
  headers?: CustomHeaders;
}

/**
 * @name ANTHROPIC_API_CLIENT
 * @description Client for interacting with Anthropic API
 */
export class AnthropicClient {
  private client: Anthropic;
  private readonly retryOptions: RetryOptions;
  private webhookSecret?: string;
  
  constructor(options?: AnthropicClientOptions, retryOptions?: Partial<RetryOptions>) {
    const env = getEnv();
    const apiKey = options?.apiKey || env.ANTHROPIC_API_KEY;
    this.webhookSecret = options?.webhookSecret || env.ANTHROPIC_WEBHOOK_SECRET;
    
    this.client = new Anthropic({
      apiKey,
    });
    
    // Default retry options
    this.retryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 60000,
      factor: 2,
      retryableStatusCodes: [429, 500, 502, 503, 504],
      ...retryOptions
    };
  }
  
  /**
   * Update API credentials
   */
  updateCredentials(options: AnthropicClientOptions): void {
    if (options.apiKey) {
      this.client = new Anthropic({
        apiKey: options.apiKey,
      });
    }
    
    if (options.webhookSecret) {
      this.webhookSecret = options.webhookSecret;
    }
  }
  
  /**
   * Create a new batch with automatic retries
   */
  async createBatch(params: BatchCreationParams): Promise<BatchResponse> {
    const { name, description, model, messages, system, temperature, maxTokens, stopSequences, metadata, betaHeaders, anthropicVersion, thinkingBudget } = params;
    
    // Transform messages to Anthropic format
    const formattedMessages = messages.map(message => ({
      role: message.role,
      content: message.content,
    }));
    
    const operation = async () => {
      // Prepare client options with custom headers if provided
      const clientOptions: AnthropicClientOptions = {};
      
      // Add beta headers if provided
      if (betaHeaders && betaHeaders.length > 0) {
        clientOptions.headers = {};
        
        betaHeaders.forEach(header => {
          if (clientOptions.headers) {
            clientOptions.headers[header.name] = header.value;
          }
        });
      }
      
      // Add Anthropic API version if provided
      if (anthropicVersion) {
        if (!clientOptions.headers) {
          clientOptions.headers = {};
        }
        clientOptions.headers["anthropic-version"] = anthropicVersion;
      }
      
      // Create a new client instance with the custom headers if needed
      const clientToUse = (betaHeaders && betaHeaders.length > 0 || anthropicVersion) 
        ? new Anthropic({
            apiKey: this.client.apiKey,
            ...clientOptions
          })
        : this.client;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (clientToUse as any).batches.create({
        model,
        inputs: [
          {
            messages: formattedMessages,
            system,
            max_tokens: maxTokens,
            temperature,
            stop_sequences: stopSequences,
            metadata,
            thinking_budget: thinkingBudget,
          },
        ],
        metadata: {
          name,
          description,
          ...metadata,
        },
      });
      
      return response as BatchResponse;
    };
    
    try {
      return await this.withRetry(operation);
    } catch (error) {
      console.error("Error creating batch after retries:", error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get batch details with automatic retries
   */
  async getBatch(batchId: string): Promise<BatchResponse> {
    const operation = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (this.client as any).batches.retrieve(batchId) as BatchResponse;
    };
    
    try {
      return await this.withRetry(operation);
    } catch (error) {
      console.error(`Error retrieving batch ${batchId} after retries:`, error);
      throw this.handleError(error);
    }
  }
  
  /**
   * List all batches with automatic retries
   */
  async listBatches(params: BatchListParams = {}): Promise<{ data: BatchResponse[]; has_more: boolean }> {
    const operation = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (this.client as any).batches.list({
        limit: params.limit,
        order: params.order,
        after: params.after,
        before: params.before,
        status: params.status,
      }) as { data: BatchResponse[]; has_more: boolean };
    };
    
    try {
      return await this.withRetry(operation);
    } catch (error) {
      console.error("Error listing batches after retries:", error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Cancel a batch with automatic retries
   */
  async cancelBatch(batchId: string): Promise<BatchResponse> {
    const operation = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (this.client as any).batches.cancel(batchId) as BatchResponse;
    };
    
    try {
      return await this.withRetry(operation);
    } catch (error) {
      console.error(`Error canceling batch ${batchId} after retries:`, error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Clone an existing batch with modifications
   */
  async cloneBatch(batchId: string, modifications: Partial<BatchCreationParams> = {}): Promise<BatchResponse> {
    // Get the original batch
    const originalBatch = await this.getBatch(batchId);
    
    // Extract first completion's input as template
    const firstCompletion = originalBatch.completions[0];
    if (!firstCompletion) {
      throw new Error("Original batch has no completions to clone");
    }
    
    // Create new batch parameters based on original
    const newParams: BatchCreationParams = {
      name: modifications.name || `Clone of ${originalBatch.id}`,
      description: modifications.description || `Cloned from batch ${originalBatch.id}`,
      model: modifications.model || originalBatch.model,
      messages: modifications.messages || (firstCompletion.input.messages as Message[]),
      system: modifications.system || firstCompletion.input.system,
      temperature: modifications.temperature || firstCompletion.input.temperature,
      maxTokens: modifications.maxTokens || firstCompletion.input.max_tokens,
      stopSequences: modifications.stopSequences || firstCompletion.input.stop_sequences,
      metadata: {
        ...firstCompletion.input.metadata,
        originalBatchId: originalBatch.id,
        ...(modifications.metadata || {})
      }
    };
    
    // Create the new batch
    return this.createBatch(newParams);
  }
  
  /**
   * Verify webhook signature from Anthropic
   */
  verifyWebhookSignature(signature: string, timestamp: string, body: string, customWebhookSecret?: string): boolean {
    const webhookSecret = customWebhookSecret || this.webhookSecret;
    
    if (!webhookSecret) {
      console.warn("Webhook secret not configured. Skipping signature verification.");
      return true;
    }
    
    const hmac = crypto.createHmac("sha256", webhookSecret);
    const data = `${timestamp}.${body}`;
    const expectedSignature = hmac.update(data).digest("hex");
    
    return signature === expectedSignature;
  }
  
  /**
   * Retry mechanism for API calls
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    const { maxRetries, initialDelay, maxDelay, factor, retryableStatusCodes } = this.retryOptions;
    
    let attempt = 0;
    let delay = initialDelay;
    
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (error: any) {
        attempt++;
        
        // Check if we should retry based on status code
        if (!error.status || !retryableStatusCodes.includes(error.status) || attempt >= maxRetries) {
          throw error;
        }
        
        console.warn(`Anthropic API call failed with status ${error.status}. Retrying (${attempt}/${maxRetries}) in ${delay}ms...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Calculate next delay with exponential backoff, capped at maxDelay
        delay = Math.min(delay * factor, maxDelay);
      }
    }
    
    // This should never be reached because the last attempt will either return or throw
    throw new Error("Retry loop exited unexpectedly");
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
