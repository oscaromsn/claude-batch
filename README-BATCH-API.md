# Anthropic Batch API Integration

This README provides documentation on how we've integrated with Anthropic's Batch API to ensure reliable batch processing and status synchronization.

## Overview

The integration consists of multiple components:

1. **Batch Sync Service**: Core service for syncing batch status with Anthropic
2. **Manual Sync API**: Endpoint for manually triggering batch status synchronization
3. **Webhook Handler**: Enhanced webhook processing for status updates
4. **Scheduled Sync Job**: Background job to periodically sync batch statuses
5. **UI Components**: Added manual sync button and status display to the UI

## Implementation Details

### Batch Sync Service

The core functionality is implemented in `lib/services/batchSyncService.ts`. This service:

- Syncs a single batch's status with Anthropic
- Updates batch and completion records in the database
- Handles error cases gracefully
- Provides functions for syncing all in-progress batches

### Manual Sync API

Endpoint: `POST /api/batches/[id]/sync`

This API endpoint allows manually triggering a sync for a specific batch:
- Authenticates the user
- Verifies batch ownership
- Calls the batch sync service
- Returns updated batch data

### Webhook Handler

Endpoint: `POST /api/webhook/anthropic`

The webhook handler has been enhanced to:
- Better validate webhook signatures
- Log detailed webhook information
- Store webhook history in batch metadata
- Use the batch sync service for consistency
- Handle error cases while acknowledging receipt

### Scheduled Sync Job

Endpoint: `GET /api/cron/sync-batches`

This endpoint can be called by a cron/scheduled job service to periodically sync all in-progress batches:
- Verifies authentication via secret token
- Syncs all in-progress batches with Anthropic
- Returns statistics on sync results

### UI Components

The UI has been enhanced to:
- Add a "Sync with Anthropic" button for manual syncing
- Display last sync time in the batch details
- Show more detailed status information

## Environment Setup

The following environment variables are used:
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `ANTHROPIC_WEBHOOK_SECRET`: Secret for validating webhooks
- `CRON_SECRET`: Secret for authenticating cron job requests

## Best Practices

To ensure reliable batch processing:

1. **Monitor Regularly**: Check batch status through the UI or use the API
2. **Set Up Webhooks**: Configure Anthropic to send webhooks for batch status changes
3. **Configure Scheduled Sync**: Set up a cron job to call the sync endpoint regularly
4. **Use Unique IDs**: Ensure each batch has a unique name and ID for tracking
5. **Check Logs**: Monitor logs for any sync failures or webhook issues

## Troubleshooting

If batches are showing incorrect status:

1. Use the "Sync with Anthropic" button to manually sync status
2. Check the batch metadata for any sync errors
3. Verify webhook configuration in the Anthropic console
4. Ensure the cron job is running correctly
5. Check server logs for any errors in the sync process

## Limitations

- Anthropic batches can take up to 24 hours to process
- Webhooks may occasionally fail to deliver
- The sync process relies on Anthropic's API being available
- Batches expire and may not complete if they exceed the 24-hour window 