import * as crypto from "node:crypto";
import { DEFAULT_MODEL } from "@/lib/constants/models";
import { getEnv } from "@/lib/utils/env";
import { Anthropic } from "@anthropic-ai/sdk";

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
    type: string;
    processing_status: "in_progress" | "completed" | "failed" | "canceled";
    request_counts: {
        processing: number;
        succeeded: number;
        errored: number;
        canceled: number;
        expired: number;
    };
    ended_at: string | null;
    created_at: string;
    expires_at: string;
    archived_at: string | null;
    cancel_initiated_at: string | null;
    results_url: string | null;
    custom_id?: string;
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
    metadata?: Record<string, string | number | boolean>;
    betaHeaders?: boolean | Array<{ name: string; value: string }>;
    anthropicVersion?: string;
    thinkingBudget?: number;
}

export interface BatchListParams {
    limit?: number;
    after?: string;
    order?: "asc" | "desc";
    [key: string]: string | number | undefined;
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

export interface BatchCreateParams {
    requests: Array<{
        custom_id: string;
        params: {
            model: string;
            messages: Array<{
                role: string;
                content: string;
            }>;
            system?: string;
            max_tokens?: number;
            temperature?: number;
            stop_sequences?: string[];
            metadata?: Record<string, string>;
        };
    }>;
}

/**
 * @name ANTHROPIC_API_CLIENT
 * @description Client for interacting with Anthropic API
 */
export class AnthropicClient {
    private client?: Anthropic;
    private readonly retryOptions: RetryOptions;
    private webhookSecret?: string;
    private customHeaders: Record<string, string> = {};

    constructor(
        options?: AnthropicClientOptions,
        retryOptions?: Partial<RetryOptions>,
    ) {
        const env = getEnv();
        const apiKey = options?.apiKey || env.ANTHROPIC_API_KEY;
        this.webhookSecret =
            options?.webhookSecret || env.ANTHROPIC_WEBHOOK_SECRET;

        // Handle client creation and initialization
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
            ...retryOptions,
        };

        // Check if beta features are enabled and the client is properly configured
        if (!this.client?.beta?.messages?.batches) {
            console.warn(
                "Anthropic client doesn't have beta.messages.batches support. Batch operations may fail.",
            );
        }
    }

    /**
     * Get the Anthropic client instance
     * @returns The Anthropic client
     */
    private getClient(): Anthropic {
        if (!this.client) {
            throw new Error("Anthropic client is not initialized");
        }
        return this.client;
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
    async createBatch({
        name,
        // These parameters are kept for API compatibility but not used
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        description,
        model,
        messages,
        system = "",
        temperature,
        maxTokens,
        stopSequences,
        metadata = {},
        betaHeaders = false,
        anthropicVersion,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        thinkingBudget,
    }: BatchCreationParams): Promise<BatchResponse> {
        // Transform messages to Anthropic format
        const formattedMessages = messages.map((message) => ({
            role: message.role,
            content: message.content,
        }));

        const operation = async () => {
            // Prepare client options with custom headers if provided
            const clientToUse = this.getClient();

            // Add beta headers if provided
            if (betaHeaders) {
                if (Array.isArray(betaHeaders)) {
                    // Add each custom header
                    for (const header of betaHeaders) {
                        this.customHeaders[header.name] = header.value;
                    }
                } else if (betaHeaders === true) {
                    // Default beta header if true is passed
                    this.customHeaders["anthropic-beta"] =
                        "messages-2023-12-15";
                }
            }

            // Add Anthropic version if provided
            if (anthropicVersion) {
                this.customHeaders["anthropic-version"] = anthropicVersion;
            }

            // Generate a unique custom_id by appending a timestamp to the name
            // Ensure it matches the pattern '^[a-zA-Z0-9_-]{1,64}$'
            const timestamp = Date.now();
            const randomSuffix = Math.floor(Math.random() * 100000000);
            const finalId = `${name.replace(/[^\w-]/g, "-")}-${timestamp}-${randomSuffix}`;

            // Store original metadata plus our custom ID for database storage
            // We'll return this later to the caller
            const appMetadata = {
                ...metadata,
                anthropicCustomId: finalId,
            };

            // Prepare parameters for the batch request
            const params = {
                model,
                messages: formattedMessages,
                ...(system ? { system } : {}),
                // Provide a default value for max_tokens if undefined
                max_tokens: maxTokens !== undefined ? Number(maxTokens) : 1024,
                ...(temperature !== undefined ? { temperature } : {}),
                ...(stopSequences && stopSequences.length > 0
                    ? { stop_sequences: stopSequences }
                    : {}),
                // Do not include any metadata as Anthropic API no longer accepts it
            };

            // Create the batch request with the correct structure
            const requestBody = {
                requests: [
                    {
                        custom_id: finalId,
                        params,
                    },
                ],
            };

            // Create the batch
            try {
                // Access the create method via prototype chain (it's not a direct property)
                const createBatchFunction =
                    clientToUse.beta.messages.batches.create;

                if (typeof createBatchFunction !== "function") {
                    throw new Error(
                        "Anthropic client missing beta.messages.batches.create function",
                    );
                }

                console.log("Sending batch request to Anthropic:");
                console.log(JSON.stringify(requestBody, null, 2));

                const response = await createBatchFunction.call(
                    clientToUse.beta.messages.batches,
                    requestBody,
                    Object.keys(this.customHeaders).length > 0
                        ? { headers: this.customHeaders }
                        : undefined,
                );

                // Log the full response for debugging
                console.log("Full Anthropic batch creation response:");
                console.log(JSON.stringify(response, null, 2));
                console.log(`Generated custom_id: ${finalId}`);
                console.log(`Actual batch ID from Anthropic: ${response.id}`);

                // Add our custom_id to the metadata for database storage
                // We'll use this in our application to track the relation between our
                // app's batch ID and Anthropic's batch ID
                await this.storeBatchMetadata(response.id, appMetadata);

                // Convert response to BatchResponse type
                return response as BatchResponse;
            } catch (error: unknown) {
                console.error("Error creating batch with Anthropic:", error);

                // Check for model not found error
                if (error instanceof Error) {
                    const errorObj: { message: string } = error;
                    const errorMessage = errorObj.message;

                    // Enhanced error detection
                    if (
                        errorMessage.includes("not_found_error") &&
                        errorMessage.includes("model:")
                    ) {
                        // This is a model not found error
                        console.error(`Invalid model specified: ${model}`);
                        throw new Error(
                            `Model '${model}' not found or not accessible. Please verify the model name is correct and you have access to it.`,
                        );
                    }
                }

                // Rethrow with more context
                throw new Error(
                    `Failed to create batch with Anthropic: ${error instanceof Error ? error.message : "Unknown error"}`,
                );
            }
        };

        try {
            return await this.withRetry(operation);
        } catch (error: unknown) {
            console.error("Error creating batch after retries:", error);
            throw this.handleError(error);
        }
    }

    /**
     * Store batch metadata separately for our application
     * This is a helper method to keep track of application-specific metadata
     * that we don't want to send to Anthropic
     */
    private async storeBatchMetadata(
        batchId: string,
        metadata: Record<string, unknown>,
    ): Promise<void> {
        // This is a placeholder method - in a real application, you would store this
        // metadata in your database associated with the batch ID
        console.log(`Storing metadata for batch ${batchId}:`, metadata);

        // In a real implementation, you would do something like:
        // await db.batchMetadata.upsert({
        //   where: { batchId },
        //   update: { metadata },
        //   create: { batchId, metadata },
        // });
    }

    /**
     * Get batch details with automatic retries
     */
    async getBatch(batchId: string): Promise<BatchResponse> {
        const operation = async () => {
            try {
                // Access the retrieve method via prototype chain
                const retrieveBatchFunction =
                    this.getClient().beta.messages.batches.retrieve;

                if (typeof retrieveBatchFunction !== "function") {
                    throw new Error(
                        "Anthropic client missing beta.messages.batches.retrieve function",
                    );
                }

                const response = await retrieveBatchFunction.call(
                    this.getClient().beta.messages.batches,
                    batchId,
                    Object.keys(this.customHeaders).length > 0
                        ? { headers: this.customHeaders }
                        : undefined,
                );

                return response as BatchResponse;
            } catch (error: unknown) {
                console.error(
                    `Error retrieving batch with ID ${batchId}:`,
                    error,
                );

                if (error instanceof Error) {
                    // Handle specific error types
                    const errorObj: { status?: number; message?: string } =
                        error;
                    if (
                        errorObj.message?.includes("not found") ||
                        errorObj.message?.includes("404") ||
                        errorObj.status === 404
                    ) {
                        console.log(
                            `Batch not found with direct ID: ${batchId}`,
                        );

                        // Throw a specific error type that can be easily identified by the batchSyncService
                        const notFoundError = new Error(
                            `Batch \`${batchId}\` not found in Anthropic API. This could be due to a propagation delay if the batch was recently created.`,
                        );
                        type ExtendedError = Error & {
                            status: number;
                            isAnthropicPropagationDelay: boolean;
                        };
                        (notFoundError as ExtendedError).status = 404;
                        (
                            notFoundError as ExtendedError
                        ).isAnthropicPropagationDelay = true;
                        throw notFoundError;
                    }

                    // For other errors, just rethrow
                    throw error;
                }

                // If we got here, we couldn't find the batch by any means
                throw new Error(`Batch \`${batchId}\` not found.`);
            }
        };

        try {
            return await this.withRetry(operation);
        } catch (error: unknown) {
            console.error(
                `Error retrieving batch ${batchId} after retries:`,
                error,
            );
            throw this.handleError(error);
        }
    }

    /**
     * Get batch results
     * @deprecated Use the new Anthropic API format
     */
    async getBatchResults(batchId: string): Promise<BatchCompletion[]> {
        try {
            // Get the batch first to check if it's completed
            const batch = await this.getBatch(batchId);

            // If the batch is not completed, return an empty array
            if (batch.processing_status !== "completed") {
                console.log(
                    `Batch ${batchId} is not completed yet. Status: ${batch.processing_status}`,
                );
                return [];
            }

            // Use the results_url from the batch response if available
            if (batch.results_url) {
                console.log(`Fetching batch results from ${batch.results_url}`);

                try {
                    // Make a fetch request to get the results
                    const response = await fetch(batch.results_url);

                    if (!response.ok) {
                        throw new Error(
                            `Failed to fetch results: ${response.status} ${response.statusText}`,
                        );
                    }

                    // The results are in JSONL format (one JSON object per line)
                    const text = await response.text();
                    const lines = text.trim().split("\n");

                    // Parse each line as JSON
                    const results = lines
                        .map((line) => {
                            try {
                                return JSON.parse(line);
                            } catch {
                                console.error(
                                    `Failed to parse result line: ${line}`,
                                );
                                return null;
                            }
                        })
                        .filter(Boolean);

                    console.log(
                        `Successfully fetched ${results.length} results`,
                    );

                    // Convert to BatchCompletion format for backward compatibility
                    return results.map((result) => {
                        // Map the new API format to the old format
                        return {
                            id:
                                result.request_id ||
                                result.custom_id ||
                                `result-${Math.random().toString(36).substring(2, 9)}`,
                            status: result.error ? "failed" : "completed",
                            input: {
                                messages: result.input?.messages || [],
                                system: result.input?.system || "",
                                max_tokens: result.input?.max_tokens,
                                temperature: result.input?.temperature,
                                stop_sequences: result.input?.stop_sequences,
                                metadata: result.input?.metadata || {},
                            },
                            output: result.error
                                ? undefined
                                : {
                                      message: result.content || {
                                          role: "assistant",
                                          content: result.output || "",
                                      },
                                      stop_reason:
                                          result.stop_reason || "stop_sequence",
                                      input_tokens:
                                          result.usage?.input_tokens || 0,
                                      output_tokens:
                                          result.usage?.output_tokens || 0,
                                  },
                            error: result.error
                                ? {
                                      type:
                                          result.error.type || "unknown_error",
                                      message:
                                          result.error.message ||
                                          "Unknown error",
                                  }
                                : undefined,
                        };
                    });
                } catch (error: unknown) {
                    console.error(
                        `Error fetching results from ${batch.results_url}:`,
                        error,
                    );
                    throw error;
                }
            }

            console.log(`No results_url available for batch ${batchId}`);
            return [];
        } catch (error: unknown) {
            console.error(`Error getting batch results for ${batchId}:`, error);
            throw this.handleError(error);
        }
    }

    /**
     * List batches with automatic retries
     */
    async listBatches(params?: BatchListParams): Promise<BatchResponse[]> {
        const operation = async () => {
            try {
                // Access the list method via prototype chain
                const listBatchesFunction =
                    this.getClient().beta.messages.batches.list;

                if (typeof listBatchesFunction !== "function") {
                    throw new Error(
                        "Anthropic client missing beta.messages.batches.list function",
                    );
                }

                const response = await listBatchesFunction.call(
                    this.getClient().beta.messages.batches,
                    {
                        ...(params || {}),
                        ...(Object.keys(this.customHeaders).length > 0
                            ? { headers: this.customHeaders }
                            : {}),
                    },
                );

                return response.data as BatchResponse[];
            } catch (error: unknown) {
                console.error("Error listing batches:", error);
                throw error;
            }
        };

        try {
            return await this.withRetry(operation);
        } catch (error: unknown) {
            console.error("Error listing batches:", error);
            throw error;
        }
    }

    /**
     * Cancel a batch with automatic retries
     */
    async cancelBatch(batchId: string): Promise<BatchResponse> {
        const operation = async () => {
            try {
                // Access the cancel method via prototype chain
                const cancelBatchFunction =
                    this.getClient().beta.messages.batches.cancel;

                if (typeof cancelBatchFunction !== "function") {
                    throw new Error(
                        "Anthropic client missing beta.messages.batches.cancel function",
                    );
                }

                const response = await cancelBatchFunction.call(
                    this.getClient().beta.messages.batches,
                    batchId,
                    Object.keys(this.customHeaders).length > 0
                        ? { headers: this.customHeaders }
                        : undefined,
                );

                return response as BatchResponse;
            } catch (error: unknown) {
                console.error(`Error canceling batch ${batchId}:`, error);
                throw error;
            }
        };

        try {
            return await this.withRetry(operation);
        } catch (error: unknown) {
            console.error(
                `Error canceling batch ${batchId} after retries:`,
                error,
            );
            throw this.handleError(error);
        }
    }

    /**
     * Clone an existing batch with modifications
     */
    async cloneBatch(
        batchId: string,
        modifications: Partial<BatchCreationParams> = {},
    ): Promise<BatchResponse> {
        try {
            // We'll create a new batch with the provided modifications and reference to the original

            // Create a new batch with the modifications
            return await this.createBatch({
                name: modifications.name || `Clone of ${batchId}`,
                model: modifications.model || DEFAULT_MODEL, // Default to a standard model
                messages: modifications.messages || [], // This needs to be provided
                system: modifications.system || "",
                temperature: modifications.temperature,
                maxTokens: modifications.maxTokens,
                stopSequences: modifications.stopSequences,
                metadata: {
                    ...modifications.metadata,
                    cloned_from: batchId,
                },
                betaHeaders: modifications.betaHeaders,
                anthropicVersion: modifications.anthropicVersion,
            });
        } catch (error: unknown) {
            console.error(`Error cloning batch ${batchId}:`, error);
            throw this.handleError(error);
        }
    }

    /**
     * Verify webhook signature from Anthropic
     */
    verifyWebhookSignature(
        signature: string,
        timestamp: string,
        body: string,
        customWebhookSecret?: string,
    ): boolean {
        const webhookSecret = customWebhookSecret || this.webhookSecret;

        if (!webhookSecret) {
            console.warn(
                "Webhook secret not configured. Skipping signature verification.",
            );
            return true;
        }

        const hmac = crypto.createHmac("sha256", webhookSecret);
        const data = `${timestamp}.${body}`;
        const expectedSignature = hmac.update(data).digest("hex");

        return signature === expectedSignature;
    }

    /**
     * List batch completions
     * @deprecated This method is deprecated as the API has changed
     */
    async listBatchCompletions(batchId: string): Promise<BatchCompletion[]> {
        try {
            // With the new API, we need to implement a different way to get completions
            console.warn("listBatchCompletions is deprecated with the new API");
            return [];
        } catch (error: unknown) {
            console.error(
                `Error listing batch completions for ${batchId}:`,
                error,
            );
            throw this.handleError(error);
        }
    }

    /**
     * Retry mechanism for API calls
     */
    private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
        const {
            maxRetries,
            initialDelay,
            maxDelay,
            factor,
            retryableStatusCodes,
        } = this.retryOptions;

        let attempt = 0;
        let delay = initialDelay;

        while (attempt < maxRetries) {
            try {
                return await operation();
            } catch (error: unknown) {
                attempt++;

                // Check if we should retry based on status code
                // First check if error is an object with a status property
                if (
                    !(
                        error &&
                        typeof error === "object" &&
                        "status" in error
                    ) ||
                    !retryableStatusCodes.includes(
                        Number((error as { status: number }).status),
                    ) ||
                    attempt >= maxRetries
                ) {
                    throw error;
                }

                const errorStatus = (error as { status: number }).status;
                console.warn(
                    `Anthropic API call failed with status ${errorStatus}. Retrying (${attempt}/${maxRetries}) in ${delay}ms...`,
                );

                // Wait before retrying
                await new Promise((resolve) => setTimeout(resolve, delay));

                // Exponential backoff with jitter
                const jitter = Math.random() * 0.3 + 0.85; // Random value between 0.85 and 1.15
                delay = Math.min(delay * factor * jitter, maxDelay);
            }
        }

        throw new Error(`Operation failed after ${maxRetries} retries`);
    }

    /**
     * Handle API errors
     */
    private handleError(error: unknown): Error {
        // Type guard for API errors
        if (typeof error === "object" && error !== null && "status" in error) {
            const apiError = error as { status: number; message?: string };

            if (apiError.status === 401) {
                return new Error(
                    "Invalid API key. Please check your Anthropic API key.",
                );
            }

            if (apiError.status === 429) {
                return new Error(
                    "Rate limit exceeded. Please try again later.",
                );
            }

            if (apiError.status >= 500) {
                return new Error(
                    "Anthropic API server error. Please try again later.",
                );
            }

            // If it has a message property, use it
            if ("message" in error && typeof apiError.message === "string") {
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
