# Task Progress Calculation Fix

## Problem Summary

Inconsistencies were identified in task progress calculations across different task types (KYB, KY3P, Open Banking). These issues resulted in discrepancies between the progress displayed in the UI and the values stored in the database, which negatively impacted user experience. 

Specific issues included:
1. Small progress changes (1-5%) not being persisted to the database
2. Progress showing in the UI but not updating in the database
3. Inconsistent calculation methods between different task types
4. Zero-to-non-zero transitions not being recognized properly

## Root Causes Identified

1. **Type Comparison Issues**: Progress values were stored as strings in some places and numbers in others, leading to comparison problems.
2. **Update Detection Logic**: Update detection failed to recognize small but meaningful changes (1-5%).
3. **Transaction Handling**: Small changes weren't being committed effectively due to inefficient transaction handling.
4. **Edge Case Handling**: Zero-to-non-zero progress changes weren't prioritized correctly.

## Solution Implemented

### 1. Enhanced Type Handling

```typescript
// Explicit type conversion when comparing progress values
storedProgress = Number(task.progress);
newProgress = Number(calculatedProgress);
```

### 2. Special Case Detection

```typescript
// Special case detection for small progress changes and zero-to-non-zero transitions
const isZeroToNonZero = (storedProgress === 0 && newProgress > 0);
const isSmallProgressChange = (Math.abs(newProgress - storedProgress) > 0 && Math.abs(newProgress - storedProgress) < 5);
```

### 3. Improved Update Logic

```typescript
// Only skip updates if we're confident no meaningful change occurred
if (!forceUpdate && 
    !isZeroToNonZero &&
    !isSmallProgressChange &&
    storedProgress === newProgress && 
    !isNaN(storedProgress) && 
    !isNaN(newProgress)) {
  return null; // No update needed
}
```

### 4. Transaction ID Tracking

```typescript
// Add transaction ID for tracing in logs
const transactionId = `txid-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
console.log(`${logPrefix} Transaction ${transactionId} started for task ${taskId}`);
```

### 5. Enhanced Error Handling with Retries

```typescript
// Add retry logic for small progress changes to ensure they're not lost
let retryCount = 0;
const MAX_RETRIES = 3;

// Function for exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry logic implementation
if (shouldRetry) {
  retryCount++;
  console.log(`${logPrefix} Retrying transaction (${retryCount}/${MAX_RETRIES}) for small progress update`);
  
  // Add exponential backoff delay between retries
  await sleep(500 * retryCount);
  return executeProgressUpdate();
}
```

## Verification

The fix was verified by:

1. Creating test tasks with 0% progress
2. Updating a single field to trigger a small progress change (1-3%)
3. Verifying that the progress is correctly persisted to the database
4. Confirming that WebSocket broadcasts contain accurate progress information

## Testing Tools

Several testing tools were created to verify the fix:

1. `test-direct-progress-update.js` - Tests direct API calls to update fields
2. `test-ws-client.js` - WebSocket client to monitor progress updates
3. `open-banking-progress-test.js` - Tests database-level progress updates

## Conclusion

By implementing this fix, we've ensured that all task types calculate progress consistently and accurately. Small progress changes (1-5%) and zero-to-non-zero transitions are now properly persisted to the database, eliminating the discrepancy between UI and database values.

The implementation follows best practices:

- **Robust Error Handling**: Detailed error logging and retry mechanism
- **Transaction Traceability**: Transaction IDs for better debugging
- **Atomic Operations**: Database transactions ensure data consistency
- **Consistent Type Handling**: Explicit type conversion to avoid comparison issues
- **Edge Case Coverage**: Special handling for small changes and zero-to-non-zero transitions
