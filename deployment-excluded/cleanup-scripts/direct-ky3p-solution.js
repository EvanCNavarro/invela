/**
 * Direct KY3P Demo Auto-Fill Solution
 * 
 * This script implements a fix for the "Invalid field ID format" error
 * that occurs when using the Demo Auto-Fill functionality for KY3P forms.
 * 
 * The issue is that the KY3P form is sending a fieldIdRaw of "bulk" instead
 * of proper field IDs, and the server rejects this format.
 */

const express = require('express');
const router = express.Router();

// Add a special batch-update endpoint that accepts string field keys
// This endpoint will be used by the standardized bulk update function
router.post('/api/ky3p/batch-update/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        message: 'Invalid task ID'
      });
    }
    
    // Validate responses
    const { responses } = req.body;
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({
        message: 'Invalid request: responses is required and must be an object'
      });
    }
    
    // Log the request details
    console.log(`[KY3P Batch Update] Received batch update for task ${taskId} with ${Object.keys(responses).length} fields`);
    
    // Get all fields for field type validation and ID mapping
    const fields = await db.select().from(ky3pFields);
    
    // Create useful maps for field lookup by key
    const fieldKeyToIdMap = new Map(fields.map(field => [field.field_key, field.id]));
    const fieldIdToTypeMap = new Map(fields.map(field => [field.id, field.field_type]));
    
    // Process all responses as a batch
    const responseEntries = [];
    
    // Convert responses with string keys to array format with explicit fieldId
    for (const [fieldKey, value] of Object.entries(responses)) {
      const fieldId = fieldKeyToIdMap.get(fieldKey);
      
      if (fieldId !== undefined) {
        // Ensure field ID is a number
        const numericFieldId = typeof fieldId === 'string' ? parseInt(fieldId, 10) : fieldId;
        
        if (!isNaN(numericFieldId)) {
          responseEntries.push({
            taskId,
            fieldId: numericFieldId,
            value: value
          });
        }
      }
    }
    
    if (responseEntries.length === 0) {
      return res.status(400).json({
        message: 'No valid field IDs found in the request'
      });
    }
    
    // Insert all responses in a single transaction
    await db.transaction(async (tx) => {
      // First delete existing responses
      await tx.delete(ky3pResponses)
        .where(and(
          eq(ky3pResponses.taskId, taskId),
          inArray(ky3pResponses.fieldId, responseEntries.map(entry => entry.fieldId))
        ));
      
      // Then insert new responses
      await tx.insert(ky3pResponses).values(responseEntries);
    });
    
    // Update task progress
    await updateTaskProgress(taskId);
    
    return res.status(200).json({
      success: true,
      message: `Successfully updated ${responseEntries.length} responses`,
      updatedCount: responseEntries.length
    });
  } catch (error) {
    console.error('[KY3P Batch Update] Error:', error);
    return res.status(500).json({
      message: 'An error occurred while processing the batch update',
      error: error.message
    });
  }
});

// Create special demo-autofill endpoint for KY3P forms
router.post('/api/ky3p/demo-autofill/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        message: 'Invalid task ID'
      });
    }
    
    // Get demo data for KY3P
    const demoData = await getDemoDataForKy3p();
    
    // Get all fields for mapping
    const fields = await db.select().from(ky3pFields);
    const fieldKeyToIdMap = new Map(fields.map(field => [field.field_key, field.id]));
    
    // Process all demo data as a batch
    const responseEntries = [];
    
    // Convert demo data with string keys to array format with explicit fieldId
    for (const [fieldKey, value] of Object.entries(demoData)) {
      const fieldId = fieldKeyToIdMap.get(fieldKey);
      
      if (fieldId !== undefined && value !== undefined && value !== null && value !== '') {
        // Ensure field ID is a number
        const numericFieldId = typeof fieldId === 'string' ? parseInt(fieldId, 10) : fieldId;
        
        if (!isNaN(numericFieldId)) {
          responseEntries.push({
            taskId,
            fieldId: numericFieldId,
            value: value
          });
        }
      }
    }
    
    // Insert all responses in a single transaction
    await db.transaction(async (tx) => {
      // First delete all existing responses for this task
      await tx.delete(ky3pResponses)
        .where(eq(ky3pResponses.taskId, taskId));
      
      // Then insert new responses
      await tx.insert(ky3pResponses).values(responseEntries);
    });
    
    // Update task progress
    await updateTaskProgress(taskId);
    
    return res.status(200).json({
      success: true,
      message: `Successfully populated ${responseEntries.length} fields with demo data`,
      fieldsPopulated: responseEntries.length
    });
  } catch (error) {
    console.error('[KY3P Demo Auto-Fill] Error:', error);
    return res.status(500).json({
      message: 'An error occurred while auto-filling demo data',
      error: error.message
    });
  }
});

// Helper function to get demo data for KY3P forms
async function getDemoDataForKy3p() {
  // TODO: Replace with actual demo data generation logic
  // This is just a placeholder for the actual implementation
  return {
    'company_name': 'DevTest35',
    'contact_email': 'support@devtest35.com',
    'contact_phone': '+1-555-123-4567',
    // ... other fields with demo values
  };
}

// Helper function to update task progress
async function updateTaskProgress(taskId) {
  try {
    // Call the existing progress calculation endpoint
    const response = await fetch(`http://localhost:5000/api/tasks/${taskId}/update-progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ taskId })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update task progress: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`[KY3P] Task progress updated:`, result);
    
    return result;
  } catch (error) {
    console.error('[KY3P] Error updating task progress:', error);
    throw error;
  }
}

module.exports = router;