/**
 * KY3P Batch Update Routes
 * 
 * This module provides a new batch update endpoint for KY3P forms
 * that accepts string field keys instead of requiring numeric IDs.
 */

import express from 'express';
import { db } from '@db';
import { ky3pFields, ky3pResponses } from '@db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { Logger } from '../utils/logger';

const router = express.Router();
const logger = new Logger('KY3P-BatchUpdate');

/**
 * Special batch-update endpoint that accepts string field keys
 * This is used by the standardized KY3P bulk update implementation
 */
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
    logger.info(`Received batch update for task ${taskId} with ${Object.keys(responses).length} fields`);
    logger.debug('First few responses:', Object.entries(responses).slice(0, 3));
    
    // Get all fields for field type validation and ID mapping
    const fields = await db.select().from(ky3pFields);
    
    // Create useful maps for field lookup by key
    const fieldKeyToIdMap = new Map(fields.map(field => [field.field_key, field.id]));
    
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
        } else {
          logger.warn(`Invalid field ID for key ${fieldKey}:`, fieldId);
        }
      } else {
        logger.warn(`Field key not found: ${fieldKey}`);
      }
    }
    
    if (responseEntries.length === 0) {
      return res.status(400).json({
        message: 'No valid field IDs found in the request'
      });
    }
    
    // Insert all responses in a single transaction
    await db.transaction(async (tx) => {
      // First delete existing responses for these fields
      await tx.delete(ky3pResponses)
        .where(and(
          eq(ky3pResponses.taskId, taskId),
          inArray(ky3pResponses.fieldId, responseEntries.map(entry => entry.fieldId))
        ));
      
      // Then insert new responses
      await tx.insert(ky3pResponses).values(responseEntries);
    });
    
    // Update task progress
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
        logger.error(`Failed to update task progress: ${response.status}`);
      } else {
        const result = await response.json();
        logger.info(`Task progress updated:`, result);
      }
    } catch (progressError) {
      logger.error('Error updating task progress:', progressError);
      // We don't want to fail the entire request if just the progress update fails
      // So we catch this error separately and continue
    }
    
    return res.status(200).json({
      success: true,
      message: `Successfully updated ${responseEntries.length} responses`,
      updatedCount: responseEntries.length
    });
  } catch (error) {
    logger.error('Error processing batch update:', error);
    return res.status(500).json({
      message: 'An error occurred while processing the batch update',
      error: error.message
    });
  }
});

/**
 * Special demo-autofill endpoint for KY3P forms
 */
router.post('/api/ky3p/demo-autofill/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        message: 'Invalid task ID'
      });
    }
    
    logger.info(`Demo auto-fill requested for task ${taskId}`);
    
    // Get the UniversalDemoAutoFillService
    const { UniversalDemoAutoFillService } = await import('../services/universal-demo-auto-fill');
    
    // Get demo data for KY3P
    const demoData = await UniversalDemoAutoFillService.getDemoDataForForm('sp_ky3p_assessment');
    
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
    
    logger.info(`Converting ${responseEntries.length} demo fields with data`);
    
    // Insert all responses in a single transaction
    await db.transaction(async (tx) => {
      // First delete all existing responses for this task
      await tx.delete(ky3pResponses)
        .where(eq(ky3pResponses.taskId, taskId));
      
      // Then insert new responses
      await tx.insert(ky3pResponses).values(responseEntries);
    });
    
    // Update task progress
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
        logger.error(`Failed to update task progress: ${response.status}`);
      } else {
        const result = await response.json();
        logger.info(`Task progress updated:`, result);
      }
    } catch (progressError) {
      logger.error('Error updating task progress:', progressError);
      // We don't want to fail the entire request if just the progress update fails
      // So we catch this error separately and continue
    }
    
    return res.status(200).json({
      success: true,
      message: `Successfully populated ${responseEntries.length} fields with demo data`,
      fieldsPopulated: responseEntries.length
    });
  } catch (error) {
    logger.error('Error auto-filling demo data:', error);
    return res.status(500).json({
      message: 'An error occurred while auto-filling demo data',
      error: error.message
    });
  }
});

export default router;