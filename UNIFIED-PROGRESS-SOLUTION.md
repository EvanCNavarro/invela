# Unified Task Progress System

## Overview

This document explains the unified approach implemented to address progress calculation inconsistencies across different task types (KYB, KY3P, Open Banking) in the application. The solution follows the OODA framework (Observe, Orient, Decide, Act) and KISS principle to create a systematic approach without special case handling or bandaid fixes.

## Problem Statement

We identified several core issues in the original progress calculation system:

1. Multiple independent code paths with different logic
2. Case sensitivity in status comparisons (code checking for 'complete' but DB storing 'COMPLETE')
3. No standardized status constants 
4. Transaction boundary issues (operations that should be atomic are split)
5. Duplicate tracking of progress (primary field vs. metadata.progressValue)
6. Inconsistent status determination logic across frontend/backend
7. Data inconsistency where stored progress doesn't match actual form responses
8. WebSocket initialization failures causing progress updates to not be broadcasted
9. KY3P progress not persisted to database despite correct calculation

## Solution Architecture

The solution consists of several key components designed to work together:

### 1. Unified Progress Calculation (`unified-task-progress.ts`)

Centralizes all progress calculation logic in a single module:

- Standardized status constants
- Proper transaction boundaries for atomic operations
- Consistent status determination based on progress
- Unified approach for all task types
- Detailed logging for troubleshooting

### 2. Unified WebSocket Server (`unified-websocket.ts`)

Provides reliable WebSocket broadcasts for progress updates:

- Single, consistent WebSocket server initialization
- Standardized message format
- Proper error handling and connection management
- Event-based broadcast for task updates

### 3. Task Update Utility (`task-update.ts`)

Coordinates progress updates and WebSocket broadcasts:

- Calls the unified progress calculation
- Updates database with calculated progress
- Broadcasts updates via WebSocket

### 4. Debug Endpoints (`debug-endpoints.js`)

Provides testing capabilities for the unified system:

- Direct API access to test progress calculation
- Debug information for troubleshooting
- Comparative validation of progress values

## Key Improvements

### 1. Standardized Status Determination

Progress values now map consistently to status values:

```javascript
// 0% → NOT_STARTED
// 1-99% → IN_PROGRESS
// 100% (not submitted) → READY_FOR_SUBMISSION
// 100% (with submission flag) → SUBMITTED
```

### 2. Atomic Transactions

All database operations are now wrapped in transactions to ensure data consistency:

```javascript
async function updateTaskProgressInDatabase(taskId, progress, status, options = {}) {
  return await db.transaction(async (tx) => {
    // Update task record in a transaction
    const [updatedTask] = await tx.update(tasks)
      .set({
        progress,
        status,
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId))
      .returning();
      
    return updatedTask;
  });
}
```

### 3. Eliminate Duplicate Progress Tracking

Removed redundant `metadata.progressValue` and centralized progress tracking in the primary `progress` field.

### 4. Reliable WebSocket Broadcasts

Implemented a centralized WebSocket broadcast system:

```javascript
export function broadcastTaskUpdate(taskId, data) {
  return broadcast('task_updated', {
    taskId,
    ...data,
    timestamp: new Date().toISOString()
  });
}
```

## Testing Tools

The solution includes comprehensive testing utilities:

### 1. API Test Script (`api-test-unified-ky3p.js`)

Tests progress calculation, persistence, and consistency via API calls.

### 2. Browser WebSocket Test (`websocket-test.js`)

Tests WebSocket connection and real-time updates for task progress changes.

### 3. Debug Endpoints

Provides direct API access to test the unified system:

- `/api/debug/test-unified-progress` - Test progress calculation and updates
- `/api/debug/ky3p-tasks` - List available KY3P tasks for testing
- `/api/debug/ky3p-fields` - List KY3P field definitions

## Future Recommendations

1. **Add Unit Tests**: Implement formal unit tests for the unified progress calculation system
2. **Expand to Other Form Types**: Apply the same unified approach to any new form types
3. **Progress History**: Consider adding a progress history table to track changes over time
4. **Frontend Alignment**: Update frontend components to use the same status constants
5. **Performance Monitoring**: Add metrics to monitor performance of the unified system

## Conclusion

By implementing a unified approach to task progress calculation, we've addressed multiple inconsistencies and reliability issues. The solution provides a systematic, maintainable approach that follows software engineering best practices, eliminating special case handling and providing a consistent experience across all task types.
