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
 * Save demo data responses to the database
 * 
 * @param taskId The task ID
 * @param demoData The demo data object
 * @returns Success status
 */
async function saveDemoResponses(taskId: number, demoData: Record<string, any>): Promise<boolean> {
  try {
    logger.info(`[KY3P Demo Auto-Fill] Saving ${Object.keys(demoData).length} demo responses for task ${taskId}`);
    
    // First, delete any existing responses for this task
    await db.delete(ky3pResponses).where(eq(ky3pResponses.task_id, taskId));
    
    // Get field IDs for all fields
    const fields = await db.select({ id: ky3pFields.id, field_key: ky3pFields.field_key }).from(ky3pFields);
    
    // Create a map of field keys to field IDs
    const fieldKeyToIdMap = new Map<string, number>();
    fields.forEach(field => {
      const key = field.field_key || field.id.toString();
      fieldKeyToIdMap.set(key, field.id);
    });
    
    // Create batch insert data
    const responsesToInsert = Object.entries(demoData).map(([fieldKey, value]) => {
      const fieldId = fieldKeyToIdMap.get(fieldKey);
      
      // Skip fields that don't exist in the database
      if (!fieldId) {
        logger.warn(`[KY3P Demo Auto-Fill] Field with key "${fieldKey}" not found in database`);
        return null;
      }
      
      return {
        task_id: taskId,
        field_id: fieldId,
        response_value: value?.toString() || '',
      };
    }).filter(item => item !== null);
    
    // Insert all responses in a batch
    if (responsesToInsert.length > 0) {
      // Insert the responses, TS doesn't like the null filtering so we cast
      await db.insert(ky3pResponses).values(responsesToInsert as any);
    }
    
    logger.info(`[KY3P Demo Auto-Fill] Successfully saved ${responsesToInsert.length} demo responses`);
    
    return true;
  } catch (error) {
    logger.error('[KY3P Demo Auto-Fill] Error saving demo responses:', error);
    return false;
  }
}

/**
 * Endpoint for getting demo data for a KY3P task
 * Supports both the standard and standardized approaches
 */
router.get('/api/ky3p-task/:taskId/demo-data', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    logger.info(`[KY3P Demo Auto-Fill] Demo data requested for task ${taskId}`);
    
    // Generate the demo data
    const demoData = await generateKy3pDemoData(taskId);
    
    // Return the demo data in the format expected by the client
    return res.status(200).json({
      formData: demoData,
      progress: 95, // Demo data is nearly complete (but not 100% to allow for user edits)
      status: 'in_progress',
    });
  } catch (error: any) {
    logger.error('[KY3P Demo Auto-Fill] Error handling demo data request:', error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while generating demo data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Handle POST request for demo auto-fill (compatibility with legacy approach)
 */
router.post('/api/ky3p-task/:taskId/demo-autofill', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    logger.info(`[KY3P Demo Auto-Fill] Demo auto-fill requested for task ${taskId}`);
    
    // Generate the demo data
    const demoData = await generateKy3pDemoData(taskId);
    
    // Save the demo responses to the database
    await saveDemoResponses(taskId, demoData);
    
    // Return the demo data in the format expected by the client
    return res.status(200).json({
      formData: demoData,
      progress: 95,
      status: 'in_progress',
    });
  } catch (error: any) {
    logger.error('[KY3P Demo Auto-Fill] Error handling demo auto-fill request:', error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while generating demo data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

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
    
    // Save the demo responses to the database
    await saveDemoResponses(taskId, demoData);
    
    // Return the demo data in the standardized format
    return res.status(200).json({
      formData: demoData,
      progress: 95,
      status: 'in_progress',
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
    
    // Save the demo responses to the database
    await saveDemoResponses(taskId, demoData);
    
    // Return the demo data in the standardized format with additional fields for compatibility
    return res.status(200).json({
      success: true,
      fieldCount: Object.keys(demoData).length,
      formData: demoData,
      progress: 95,
      status: 'in_progress',
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