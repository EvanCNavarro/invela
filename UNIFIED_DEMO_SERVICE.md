# Unified Demo Service

## Overview

The Unified Demo Service provides a centralized approach for handling demo data across different form types in the application. This solution ensures consistent application of demo data with proper progress calculation and persistence, resolving inconsistencies in the previous implementation where each form type had its own distinct handling.

## Problem Statement

Previously, the application suffered from inconsistencies in how demo data was generated and applied across different form types (KYB, KY3P, Open Banking):

1. Different implementations with duplicated code
2. Inconsistent status strings used (case sensitivity issues with 'COMPLETE' vs 'complete')
3. Progress calculations performed differently for each form type
4. Transaction boundaries not properly managed, leading to partial updates
5. Duplicate tracking of progress in different fields

These issues caused progress to sometimes reset to 0% or not update correctly when using demo data features.

## Solution Architecture

The unified approach follows the OODA framework (Observe, Orient, Decide, Act) and uses the KISS principle (Keep It Simple, Stupid) to provide a standardized implementation across all form types.

### Key Components

1. **Specialized Demo Data Services**: Individual service modules for each form type.
   - `kybDemoData.ts`: Generates realistic demo data for KYB forms
   - `ky3pDemoData.ts`: Generates realistic demo data for KY3P forms
   - `openBankingDemoData.ts`: Generates realistic demo data for Open Banking forms

2. **Unified Demo Service**: Central service that integrates all form-specific services.
   - `unifiedDemoService.ts`: Orchestrates demo data generation and application

3. **API Routes**: Standardized routes for accessing the unified service.
   - `unified-demo-service-routes.ts`: Exposes REST endpoints for applying and clearing demo data

### Key Design Principles

1. **Single Source of Truth**: Progress calculation is done in one place using the same algorithm.
2. **Transaction Support**: All database operations are wrapped in transactions to ensure atomicity.
3. **Type Safety**: Proper TypeScript typing for all interfaces and functions.
4. **Consistent Status Handling**: Standardized status strings used across all form types.
5. **Proper WebSocket Notifications**: Consistent format for broadcasting updates to connected clients.

## API Endpoints

### Get Demo Data
```
GET /api/unified-demo/data/:taskType
```
Returns demo data for a specific task type without applying it to any task.

### Apply Demo Data
```
POST /api/unified-demo/apply/:taskId
```
Applies demo data to the specified task, setting progress to 100% and status to 'ready_for_submission'.

### Clear Responses
```
POST /api/unified-demo/clear/:taskId
```
Clears all responses for the specified task. Optional query parameter `resetProgress=false` to preserve progress value.

## Progress Calculation Rules

The service guarantees consistent progress calculation using these rules:

1. **Status Thresholds**
   - 0% → NOT_STARTED
   - 1-99% → IN_PROGRESS
   - 100% (not submitted) → READY_FOR_SUBMISSION
   - 100% (with submission flag) → SUBMITTED

2. **Progress Value**
   - Calculated as: (completedFields / totalFields) * 100
   - For demo data, always set to 100% as all fields are marked COMPLETE

## WebSocket Notifications

When changes are made through this service, WebSocket notifications are sent to all connected clients with the updated progress and status information. This ensures the UI immediately reflects the changes without requiring a page refresh.

## Usage Examples

### Applying Demo Data

```typescript
// On the server
const demoService = new UnifiedDemoService();
const result = await demoService.applyDemoDataToTask(taskId);
```

### Clearing Responses

```typescript
// On the server
const demoService = new UnifiedDemoService();
// Reset progress to 0
const result = await demoService.clearTaskResponses(taskId, true);
// Keep current progress
const result = await demoService.clearTaskResponses(taskId, false);
```

## Benefits

1. **Consistency**: All form types handle demo data in exactly the same way
2. **Maintainability**: Central implementation makes future changes easier
3. **Reliability**: Transaction support prevents partial updates
4. **Better User Experience**: UI always reflects the actual state of the data