# Unified Progress Solution

## Overview

This document outlines the unified approach to task progress calculation in our system, focusing on consistency between different task types (KYB, KY3P, Open Banking) and ensuring proper SQL type handling for all operations.

## Key Improvements

1. **Single Source of Truth**: All progress calculations now flow through the unified `unified-task-progress.ts` module
2. **Consistent SQL Type Handling**: Explicit SQL type casting with `CAST(${validatedProgress} AS INTEGER)` for all task types
3. **Transaction Integrity**: All progress updates are wrapped in SQL transactions for atomicity
4. **Robust Error Handling**: Detailed error reporting and diagnostics for troubleshooting
5. **KY3P Dual Identifier Support**: Proper handling of KY3P's mixed field_id (numeric) and field_key (string) identifiers
6. **WebSocket Broadcasting**: Consistent real-time updates to connected clients

## The KY3P Challenge

KY3P forms posed a unique challenge due to several factors:

1. **Dual Field Identification**: KY3P tasks use both numeric `field_id` and string `field_key` identifiers
2. **SQL Type Mismatches**: PostgreSQL had issues with implicit type conversions for progress values
3. **Inconsistent Reset Behavior**: KY3P forms would reset progress to 0% during editing operations

These challenges were addressed by:
- Using explicit SQL type casting for all database operations
- Adding diagnostic logging specific to KY3P progress calculation
- Making the clear field operation preserve progress when appropriate

## How Progress Calculation Works

### 1. Progress Calculation Flow

```
UI Request → Task Routes → Unified Progress Calculator → Database Transaction → WebSocket Broadcast → UI Update
```

### 2. SQL Type Handling

The critical fix for SQL type handling is in how we update the progress value in the database:

```typescript
progress: getProgressSqlValue(validatedProgress)
// Which returns: sql`CAST(${validatedProgress} AS INTEGER)`
```

This ensures that regardless of the input type, the progress value is always properly stored as an integer in the database.

### 3. Status Determination

Task status is determined based on the progress percentage:

- 0% → NOT_STARTED
- 1-99% → IN_PROGRESS
- 100% → READY_FOR_SUBMISSION
- Terminal states (SUBMITTED, APPROVED, REJECTED) remain unchanged

## Verification and Testing

To verify the system is working correctly:

1. Use the `verify-unified-progress.js` script to validate all routes are using the unified calculator
2. Check that KY3P task 739 shows 3% progress instead of 0%
3. Observe proper WebSocket broadcasts when progress changes
4. Confirm progress history is being tracked in task metadata

## Future Considerations

1. **Schema Unification**: Consider unifying KY3P schema to use consistent field identifiers
2. **Progress Audit Trail**: Expand the progress history tracking for auditing purposes
3. **Client-Side Reconciliation**: Enhance client-side handling of progress updates to reduce server load

## Conclusion

This unified approach follows the KISS principle by providing a single source of truth for progress calculation while addressing the specific challenges of the KY3P system. By using explicit SQL type casting and proper transaction boundaries, we ensure consistency across all task types and prevent progress calculation errors.
