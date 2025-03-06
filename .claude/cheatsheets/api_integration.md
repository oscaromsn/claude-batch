# API Integration Cheatsheet

## Anthropic Batch API

### Client Setup
```typescript
// In lib/api/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";

export const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Creating a Batch
```typescript
const batch = await anthropicClient.batches.create({
  model: "claude-3-opus-20240229", // or other model variant
  completions: [
    {
      input: {
        messages: [
          { role: "user", content: "Tell me a joke" }
        ],
        system: "You are a helpful assistant",
        temperature: 0.7,
        max_tokens: 1024,
      }
    },
    // More completions...
  ]
});
```

### Retrieving a Batch
```typescript
const batch = await anthropicClient.batches.retrieve(batchId);
```

### Canceling a Batch
```typescript
await anthropicClient.batches.cancel(batchId);
```

## Common Errors

### API Key Errors
- `401 Unauthorized`: Invalid or expired API key
- Solution: Check `ANTHROPIC_API_KEY` environment variable

### Rate Limiting
- `429 Too Many Requests`: Rate limit exceeded
- Solution: Implement exponential backoff retry logic

### Input Validation
- `400 Bad Request`: Invalid input parameters
- Check: message format, model name, max_tokens value

### Webhook Issues
- Webhook not receiving updates
- Check: URL accessibility, signature verification

## Debugging Tips

### Request ID Tracking
Each API request has a unique request ID in the response headers. Log this ID for troubleshooting.

### Webhook Testing
Use a test endpoint (like ngrok) during development to verify webhook payload structure and delivery.

### Timeout Handling
Batch processing can take time. Implement timeouts and status polling as fallback.

## Security Best Practices

### API Key Management
- Store API keys in environment variables
- Use different keys for development and production
- Implement key rotation mechanism

### Webhook Verification
```typescript
// Verify webhook signature
const signature = req.headers.get("anthropic-signature");
const timestamp = req.headers.get("anthropic-timestamp");
const body = await req.text();

const hmac = crypto.createHmac("sha256", process.env.ANTHROPIC_WEBHOOK_SECRET);
const data = `${timestamp}.${body}`;
const expectedSignature = hmac.update(data).digest("hex");

if (signature !== expectedSignature) {
  return new Response("Invalid signature", { status: 401 });
}
```