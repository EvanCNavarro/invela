# KY3P Form Progress Preservation

## Overview

This document describes the implementation of progress preservation during KY3P form editing. A critical bug in the KY3P system was causing task progress to reset to 0% whenever a form was edited. This implementation fixes that issue by adding a `preserveProgress` parameter to relevant endpoints.

## Problem Statement

Previously, when editing a KY3P form, the system would first clear all field values to prepare the form for editing. This clearing operation would trigger a progress recalculation, which would reset the task's progress to 0% and change its status to `not_started`. This behavior was inconsistent with user expectations and other form types (KYB, Open Banking) where progress was preserved during editing.

## Solution

We've implemented a comprehensive solution that adds a `preserveProgress` parameter to the KY3P clear endpoints. When this parameter is set to `true`, the system will:

1. Clear all field values as requested
2. Keep the original progress value instead of recalculating it
3. Maintain the current task status

## Implementation Details

### Server-Side Components

1. **KY3P Clear Route**
   - Modified `/api/ky3p/clear-fields/:taskId` endpoint to accept a `preserveProgress` parameter
   - When `preserveProgress=true`, the endpoint skips progress recalculation
   - The preserved progress value is returned in the response

2. **Unified Progress Calculation**
   - Updated unified-task-progress.ts to support progress preservation
   - Added standard string status values instead of enum constants
   - Fixed inconsistent SQL syntax for status comparisons

### Client-Side Components

1. **Form Clearing Service**
   - Enhanced handleClearFields.ts to automatically detect form editing mode
   - When editing is detected, the preserveProgress parameter is automatically set to true
   - Multiple fallback approaches ensure reliable form clearing

2. **Standardized KY3P Update**
   - Updated standardized-ky3p-update.ts to include preserveProgress parameter in batch updates
   - Defaults to preserving progress unless explicitly disabled

3. **Direct KY3P Clear**
   - Added preserveProgress support to all direct KY3P clear functions
   - The parameter can be passed in query string and request body

## Usage Examples

### Form Editing (Automatic Progress Preservation)

When editing a form, the client code automatically detects edit mode and preserves progress:

```typescript
// The form clearing utility detects edit mode and preserves progress
const isFormEditing = !!(formService as any)?.isEditing || 
                     !!(formService as any)?.formContext?.isEditing ||
                     document.location.href.includes('/edit');
                   
// The preserveProgress flag is set based on edit mode
const preserveProgress = isFormEditing;
```

### Direct API Calls

When calling the KY3P clear API directly, you can specify the preserveProgress parameter:

```typescript
// Clear fields but preserve progress
const response = await fetch(`/api/ky3p/clear-fields/${taskId}?preserveProgress=true`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ preserveProgress: true })
});

// Clear fields and reset progress (default behavior)
const response = await fetch(`/api/ky3p/clear-fields/${taskId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
```

## Testing

A test page is available at `/test-preserve-progress.html` that demonstrates the functionality of progress preservation during form clearing. The test shows:

1. Clearing with `preserveProgress=true` maintains the current progress value
2. Clearing without the parameter (or with `preserveProgress=false`) resets progress to 0%

## Related Files

- server/routes/ky3p-clear.ts
- server/utils/unified-task-progress.ts
- client/src/components/forms/handleClearFields.ts
- client/src/components/forms/standardized-ky3p-update.ts
- client/src/services/formClearingService.ts
- client/src/components/forms/UniversalForm.tsx
