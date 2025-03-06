# Batch Processing Patterns

## Purpose
This module handles the creation, management, and monitoring of batch processing jobs using the Anthropic API.

## Schema
- `Batch`: Main batch job container with status tracking and metadata
- `Completion`: Individual completion requests within a batch
- `BatchStatus`: Enum for tracking job status (PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELED)
- `CompletionStatus`: Enum for tracking completion status (PENDING, IN_PROGRESS, COMPLETED, FAILED)

## Implementation Patterns

### Batch Creation
```typescript
// Create a new batch job
async function createBatch(data: BatchCreation, userId: string) {
  // Validation with Zod schema
  const validatedData = batchCreationSchema.parse(data);
  
  // Create batch record in database
  const batch = await prisma.batch.create({
    data: {
      name: validatedData.name,
      description: validatedData.description,
      model: validatedData.model,
      status: "PENDING", // Initial status
      userId,
      settings: {
        temperature: validatedData.temperature,
        maxTokens: validatedData.maxTokens,
        stopSequences: validatedData.stopSequences,
        system: validatedData.system,
      },
      metadata: validatedData.metadata || {},
    },
  });
  
  // Create completion records for each input
  const completions = await Promise.all(
    inputs.map(input => 
      prisma.completion.create({
        data: {
          batchId: batch.id,
          status: "PENDING",
          input,
        },
      })
    )
  );
  
  // Submit to Anthropic API
  const anthropicBatch = await anthropicClient.batches.create({
    model: validatedData.model,
    completions: completions.map(c => ({
      input: c.input,
      max_tokens: validatedData.maxTokens,
      // Other parameters...
    })),
  });
  
  // Update batch with Anthropic ID
  await prisma.batch.update({
    where: { id: batch.id },
    data: {
      anthropicId: anthropicBatch.id,
      status: "IN_PROGRESS",
    },
  });
  
  return batch;
}
```

### Webhook Handler
```typescript
// Process webhook updates from Anthropic
async function handleAnthropicWebhook(req: Request) {
  const payload = await req.json();
  
  // Validate webhook signature
  // ...
  
  const { batch_id, status, completions } = payload;
  
  // Find batch in database
  const batch = await prisma.batch.findUnique({
    where: { anthropicId: batch_id },
  });
  
  if (!batch) {
    return new Response("Batch not found", { status: 404 });
  }
  
  // Update batch status
  await prisma.batch.update({
    where: { id: batch.id },
    data: {
      status: mapAnthropicStatus(status),
      completedAt: status === "completed" ? new Date() : undefined,
      inputTokens: payload.input_tokens,
      outputTokens: payload.output_tokens,
      totalCompletions: payload.completion_count,
      errorCount: payload.error_count,
    },
  });
  
  // Update individual completions
  await Promise.all(
    completions.map(async (completion) => {
      await prisma.completion.update({
        where: { anthropicId: completion.id },
        data: {
          status: mapAnthropicCompletionStatus(completion.status),
          completedAt: completion.status === "completed" ? new Date() : undefined,
          inputTokens: completion.output?.input_tokens,
          outputTokens: completion.output?.output_tokens,
          output: completion.output || undefined,
          error: completion.error || undefined,
        },
      });
    })
  );
  
  return new Response("OK");
}
```

### Batch Monitoring
```typescript
// Fetch batch with completions
async function getBatchWithCompletions(batchId: string, userId: string) {
  const batch = await prisma.batch.findUnique({
    where: {
      id: batchId,
      userId,
    },
    include: {
      completions: true,
    },
  });
  
  if (!batch) {
    throw new Error("Batch not found");
  }
  
  return batch;
}
```

## Error Handling
- API errors: Store error details in completion.error field
- Validation failures: Return zod validation errors
- Processing failures: Update batch status to FAILED with error details

## Interface Points
- Creation: POST /api/batch
- Retrieval: GET /api/batch/[id]
- Updates: POST /api/webhook/anthropic
- Cancellation: DELETE /api/batch/[id]

## Memory Anchors
- `BATCH_CREATION_FLOW`: Main batch creation process
- `BATCH_WEBHOOK_HANDLER`: Webhook processing logic
- `BATCH_STATUS_MAPPING`: Status conversion between API and database