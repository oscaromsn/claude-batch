// @jest-environment node
import { syncBatchWithAnthropic } from '../batchSyncService';
import { db } from '@/lib/db/prisma';
import { anthropicClient } from '@/lib/api/anthropic';

// Mock the AnthropicClient module
jest.mock('@/lib/api/anthropic', () => {
  const mockGetBatch = jest.fn();
  return {
    __esModule: true,
    AnthropicClient: jest.fn().mockImplementation(() => ({
      getBatch: mockGetBatch
    })),
    anthropicClient: {
      getBatch: mockGetBatch
    }
  };
});

// Mock the database
jest.mock('@/lib/db/prisma', () => ({
  db: {
    batch: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('batchSyncService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should skip syncing if batch is in terminal state', async () => {
    // Setup
    const mockBatch = {
      id: 'test-batch-id',
      anthropicId: 'msgbatch_123',
      status: 'COMPLETED',
      metadata: {},
    };
    
    // Mock database return
    (db.batch.findUnique as jest.Mock).mockResolvedValue(mockBatch);
    
    // Run test
    const result = await syncBatchWithAnthropic('test-batch-id');
    
    // Assertions
    expect(db.batch.findUnique).toHaveBeenCalledWith({
      where: { id: 'test-batch-id' },
    });
    expect(anthropicClient.getBatch).not.toHaveBeenCalled();
    expect(result).toEqual(mockBatch);
  });

  it('should update batch status based on Anthropic API response', async () => {
    // Setup
    const mockBatch = {
      id: 'test-batch-id',
      anthropicId: 'msgbatch_123',
      status: 'IN_PROGRESS',
      metadata: {
        app_version: '1.0.0',
      },
    };
    
    const mockAnthropicResponse = {
      id: 'msgbatch_123',
      processing_status: 'completed',
      request_counts: {
        processing: 0,
        succeeded: 5,
        errored: 0,
        canceled: 0,
        expired: 0,
      },
    };
    
    const mockUpdatedBatch = {
      ...mockBatch,
      status: 'COMPLETED',
      completedAt: expect.any(Date),
      totalCompletions: 5,
      errorCount: 0,
      metadata: {
        ...mockBatch.metadata,
        lastSyncedAt: expect.any(String),
        anthropicStatus: 'completed',
        requestCounts: mockAnthropicResponse.request_counts,
        anthropicId: 'msgbatch_123',
      },
    };
    
    // Mock returns
    (db.batch.findUnique as jest.Mock).mockResolvedValue(mockBatch);
    (anthropicClient.getBatch as jest.Mock).mockResolvedValue(mockAnthropicResponse);
    (db.batch.update as jest.Mock).mockResolvedValue(mockUpdatedBatch);
    
    // Run test
    const result = await syncBatchWithAnthropic('test-batch-id');
    
    // Assertions
    expect(db.batch.findUnique).toHaveBeenCalledWith({
      where: { id: 'test-batch-id' },
    });
    expect(anthropicClient.getBatch).toHaveBeenCalledWith('msgbatch_123');
    expect(db.batch.update).toHaveBeenCalledWith({
      where: { id: 'test-batch-id' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        completedAt: expect.any(Date),
        totalCompletions: 5,
        errorCount: 0,
      }),
    });
    expect(result).toEqual(mockUpdatedBatch);
  });

  it('should handle when batch is not found in Anthropic', async () => {
    // Setup
    const mockBatch = {
      id: 'test-batch-id',
      anthropicId: 'msgbatch_123',
      status: 'IN_PROGRESS',
      metadata: {},
    };
    
    const mockError = new Error('Batch not found');
    // Add status property to error
    Object.defineProperty(mockError, 'status', { value: 404, enumerable: true });
    
    const mockUpdatedBatch = {
      ...mockBatch,
      status: 'FAILED',
      metadata: {
        lastSyncedAt: expect.any(String),
        lastSyncError: {
          type: 'not_found_error',
          message: 'Batch not found in Anthropic system',
          timestamp: expect.any(String),
        },
      },
    };
    
    // Mock returns
    (db.batch.findUnique as jest.Mock).mockResolvedValue(mockBatch);
    (anthropicClient.getBatch as jest.Mock).mockRejectedValue(mockError);
    (db.batch.update as jest.Mock).mockResolvedValue(mockUpdatedBatch);
    
    // Run test
    const result = await syncBatchWithAnthropic('test-batch-id');
    
    // Assertions
    expect(db.batch.findUnique).toHaveBeenCalledWith({
      where: { id: 'test-batch-id' },
    });
    expect(anthropicClient.getBatch).toHaveBeenCalledWith('msgbatch_123');
    expect(db.batch.update).toHaveBeenCalledWith({
      where: { id: 'test-batch-id' },
      data: expect.objectContaining({
        status: 'FAILED',
        metadata: expect.objectContaining({
          lastSyncedAt: expect.any(String),
          lastSyncError: expect.objectContaining({
            type: 'not_found_error',
          }),
        }),
      }),
    });
    expect(result).toBeNull();
  });
});
