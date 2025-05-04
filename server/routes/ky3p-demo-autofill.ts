/**
 * KY3P Demo Auto-Fill Routes
 * 
 * This module provides server-side endpoints for generating demo data
 * for KY3P forms, supporting both the standard and standardized approaches.
 */

import express from 'express';
import { db } from '@db';
import { ky3pFields, ky3pResponses } from '@db/schema';
import { eq } from 'drizzle-orm';
import console from 'console';

// Create a simple logger for this module
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[KY3P Demo Auto-Fill] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[KY3P Demo Auto-Fill] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[KY3P Demo Auto-Fill] ${message}`, ...args),
};

const router = express.Router();

/**
 * Generate demo data for a KY3P task
 * 
 * @param taskId The task ID
 * @returns Object with form data (field keys to values)
 */
async function generateKy3pDemoData(taskId: number): Promise<Record<string, any>> {
  try {
    logger.info(`[KY3P Demo Auto-Fill] Generating demo data for task ${taskId}`);
    
    // Get all KY3P fields
    const fields = await db.select().from(ky3pFields);
    
    if (!fields || fields.length === 0) {
      logger.error('No KY3P fields found');
      throw new Error('No KY3P fields found');
    }
    
    logger.info(`Found ${fields.length} KY3P fields`);
    
    // Create a response object with sensible demo values for each field
    const demoData: Record<string, any> = {};
    
    // Generate demo values based on field type and name/key
    fields.forEach(field => {
      const fieldKey = field.field_key || field.id.toString();
      const fieldType = field.field_type?.toLowerCase() || 'text';
      const fieldName = field.display_name?.toLowerCase() || '';
      
      // Skip fields that shouldn't have demo values
      if (field.field_key === 'skipThisField') {
        return;
      }
      
      // Determine demo value based on field type and name
      let demoValue: any = null;
      
      switch (fieldType) {
        case 'text':
        case 'string':
          // Contextual text responses based on field name patterns
          if (fieldName.includes('name') || fieldKey.includes('name')) {
            demoValue = 'DevTest35 Security Team';
          } else if (fieldName.includes('system') || fieldKey.includes('system')) {
            demoValue = 'Enterprise Risk Management System';
          } else if (fieldName.includes('process') || fieldKey.includes('process')) {
            demoValue = 'We follow a standardized process that includes regular reviews.';
          } else if (fieldName.includes('description') || fieldKey.includes('description')) {
            demoValue = 'This is a detailed description of our enterprise-grade system.';
          } else if (fieldName.includes('policy') || fieldKey.includes('policy')) {
            demoValue = 'Our policy requires annual reviews and updates.';
          } else if (fieldName.includes('framework') || fieldKey.includes('framework')) {
            demoValue = 'NIST Cybersecurity Framework';
          } else {
            demoValue = 'Sample response for demonstration purposes';
          }
          break;
          
        case 'textarea':
        case 'long_text':
          demoValue = 'This is a detailed explanation for demonstration purposes. It includes multiple sentences to simulate a real response. Our organization follows industry best practices and maintains comprehensive documentation.';
          break;
          
        case 'number':
          if (fieldName.includes('year') || fieldKey.includes('year')) {
            demoValue = 2025;
          } else if (fieldName.includes('count') || fieldKey.includes('count')) {
            demoValue = 5;
          } else if (fieldName.includes('percentage') || fieldKey.includes('percentage')) {
            demoValue = 95;
          } else {
            demoValue = 42;
          }
          break;
          
        case 'boolean':
        case 'checkbox':
          // Most security/compliance questions should default to "yes"
          demoValue = true;
          break;
          
        case 'select':
        case 'dropdown':
          // Default to a common option since we don't have options data in the DB schema yet
          demoValue = 'Option A';
          break;
          
        case 'date':
          demoValue = '2025-01-15';
          break;
          
        case 'radio':
        case 'radio_group':
          // Default to a common option for radio buttons
          demoValue = 'Yes';
          break;
          
        default:
          demoValue = 'Sample response';
          break;
      }
      
      // Add the demo value to the response data
      demoData[fieldKey] = demoValue;
    });
    
    logger.info(`[KY3P Demo Auto-Fill] Generated demo data with ${Object.keys(demoData).length} fields`);
    
    return demoData;
  } catch (error) {
    logger.error('[KY3P Demo Auto-Fill] Error generating demo data:', error);
    throw error;
  }
}

/**
 * Save demo data responses to the database and update task progress
 * 
 * @param taskId The task ID
 * @param demoData The demo data object
 * @returns Result including success status and progress information
 */
async function saveDemoResponses(taskId: number, demoData: Record<string, any>): Promise<{
  success: boolean;
  progress?: number;
  status?: string;
  fieldCount: number;
}> {
  try {
    logger.info(`[KY3P Demo Auto-Fill] Saving ${Object.keys(demoData).length} demo responses for task ${taskId} with transaction`);
    
    // Import needed modules before transaction to prevent hangs
    const { tasks } = await import('@db/schema');
    const { calculateUniversalTaskProgress, determineStatusFromProgress, broadcastProgressUpdate } = await import('../utils/progress');
    
    // CRITICAL CHANGE: Wrap everything in a single transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Step 1: Delete any existing responses for this task
      await tx.delete(ky3pResponses).where(eq(ky3pResponses.task_id, taskId));
      
      // Step 2: Get field IDs for all fields
      const fields = await tx.select({ id: ky3pFields.id, field_key: ky3pFields.field_key }).from(ky3pFields);
      
      // Create a map of field keys to field IDs
      const fieldKeyToIdMap = new Map<string, number>();
      fields.forEach(field => {
        const key = field.field_key || field.id.toString();
        fieldKeyToIdMap.set(key, field.id);
      });
      
      // Step 3: Create batch insert data with BOTH field_id and field_key
      // This ensures compatibility with both old and new code paths
      const responsesToInsert = Object.entries(demoData).map(([fieldKey, value]) => {
        const fieldId = fieldKeyToIdMap.get(fieldKey);
        
        // Skip fields that don't exist in the database
        if (!fieldId) {
          logger.warn(`Field with key "${fieldKey}" not found in database`);
          return null;
        }
        
        // Using field value to determine status
        const status = value ? 'COMPLETE' : 'EMPTY';
        
        return {
          task_id: taskId,
          field_id: fieldId,
          field_key: fieldKey, // Include field_key for compatibility with unified system
          response_value: value?.toString() || '',
          status: status, // Include explicit status for each response
          created_at: new Date(),
          updated_at: new Date(),
          version: 1
        };
      }).filter(item => item !== null);
      
      // Step 4: Insert all responses in a batch
      let insertedCount = 0;
      if (responsesToInsert.length > 0) {
        // Insert the responses, TS doesn't like the null filtering so we cast
        await tx.insert(ky3pResponses).values(responsesToInsert as any);
        insertedCount = responsesToInsert.length;
      }
      
      logger.info(`Successfully saved ${insertedCount} demo responses for task ${taskId}`);
      
      // Step 5: Calculate progress WITHIN the transaction
      const calculatedProgress = await calculateUniversalTaskProgress(taskId, 'ky3p', { debug: true, trx: tx });
      
      logger.info(`Calculated progress for task ${taskId}: ${calculatedProgress}%`, {
        taskId,
        calculatedProgress,
        source: 'ky3p-demo-autofill-transaction'
      });
      
      // Step 6: Get the task for status determination and update
      const [task] = await tx.select().from(tasks).where(eq(tasks.id, taskId));
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      // Step 7: Determine the appropriate status
      const newStatus = determineStatusFromProgress(
        calculatedProgress,
        task.status as any,
        [], // No form responses needed for direct calculation
        task.metadata || {}
      );
      
      logger.info(`Determined status for task ${taskId}: ${newStatus} (from ${task.status})`);
      
      // Step 8: Update the task directly in the database within the SAME transaction
      const [updatedTask] = await tx.update(tasks)
        .set({
          progress: calculatedProgress,
          status: newStatus,
          updated_at: new Date(),
          metadata: {
            ...task.metadata,
            lastProgressUpdate: new Date().toISOString(),
            updatedVia: 'ky3p-demo-autofill-transactional',
            progressHistory: [
              ...(task.metadata?.progressHistory || []),
              { value: calculatedProgress, timestamp: new Date().toISOString() }
            ].slice(-10) // Keep last 10 updates
          }
        })
        .where(eq(tasks.id, taskId))
        .returning();
      
      if (!updatedTask) {
        throw new Error(`Failed to update task ${taskId}`);
      }
      
      // Verify the update was successful by checking the stored progress
      const storedProgress = Number(updatedTask.progress);
      
      logger.info(`Task progress update result:`, {
        taskId,
        calculatedProgress,
        storedProgress,
        status: newStatus,
        match: storedProgress === calculatedProgress
      });
      
      // Step 9: Schedule a broadcast outside the transaction
      setTimeout(() => {
        try {
          broadcastProgressUpdate(
            taskId,
            calculatedProgress,
            newStatus as any,
            updatedTask.metadata || {}
          );
          logger.info(`Broadcasted progress update for task ${taskId}`);
        } catch (broadcastError) {
          logger.error('Error broadcasting progress update:', broadcastError);
        }
      }, 0);
      
      // Return success with the progress info
      return {
        success: true,
        progress: calculatedProgress,
        status: newStatus,
        fieldCount: insertedCount
      };
    });
  } catch (error) {
    logger.error('Error saving demo responses:', error);
    return {
      success: false,
      fieldCount: 0
    };
  }
}

// Deprecated routes have been removed to standardize on '/api/ky3p/demo-autofill/:taskId' endpoints

/**
 * GET endpoint for standardized demo auto-fill
 */
router.get('/api/ky3p/demo-autofill/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    logger.info(`[KY3P Demo Auto-Fill] Standardized demo auto-fill GET requested for task ${taskId}`);
    
    // Generate the demo data
    const demoData = await generateKy3pDemoData(taskId);
    
    // Save the demo responses to the database and get progress information
    const saveResult = await saveDemoResponses(taskId, demoData);
    
    // Return the demo data in a standardized format
    // Include both formData and direct properties for maximum compatibility
    return res.status(200).json({
      success: true,
      fieldCount: Object.keys(demoData).length,
      progress: saveResult.progress,
      status: saveResult.status,
      formData: demoData,
      // Include the raw data too for services that expect it directly
      ...demoData
    });
  } catch (error: any) {
    logger.error('[KY3P Demo Auto-Fill] Error handling standardized demo auto-fill GET request:', error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while generating demo data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST endpoint for standardized demo auto-fill
 * This is the critical endpoint used by the KY3PDemoAutoFill component
 */
router.post('/api/ky3p/demo-autofill/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    logger.info(`[KY3P Demo Auto-Fill] Standardized demo auto-fill POST requested for task ${taskId}`);
    
    // Generate the demo data
    const demoData = await generateKy3pDemoData(taskId);
    
    // Save the demo responses to the database and get progress information
    const saveResult = await saveDemoResponses(taskId, demoData);
    
    // Return the demo data in a standardized format
    // Include both formData and direct properties for maximum compatibility
    return res.status(200).json({
      success: true,
      fieldCount: Object.keys(demoData).length,
      progress: saveResult.progress,
      status: saveResult.status,
      formData: demoData,
      // Include the raw data too for services that expect it directly
      ...demoData
    });
  } catch (error: any) {
    logger.error('[KY3P Demo Auto-Fill] Error handling standardized demo auto-fill POST request:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'An error occurred while generating demo data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;