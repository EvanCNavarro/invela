/**
 * Enhanced Open Banking API Routes
 * 
 * This module provides improved API endpoints for Open Banking form submissions
 * with better error handling, retry logic, and standardized success/failure responses.
 */

import express from 'express';
import { tasks, openBankingFields, openBankingResponses } from '@db/schema';
import { db } from '@db';
import { eq, and, or } from 'drizzle-orm';
import { processSubmission } from '../services/enhanced-form-submission-handler';
import { executeWithRetry } from '../services/db-connection-service';
import { Logger } from '../services/logger';
import { WebSocketService } from '../websocket-server';

const router = express.Router();
const logger = new Logger('EnhancedOpenBankingRoutes');

/**
 * Submit an Open Banking Survey form with improved error handling
 * 
 * POST /api/enhanced-open-banking/submit/:taskId
 */
router.post('/submit/:taskId', async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  const { formData, fileName } = req.body;
  
  if (!formData) {
    return res.status(400).json({ 
      success: false, 
      error: 'Form data is required' 
    });
  }
  
  try {
    logger.info(`Processing Open Banking submission for task ${taskId}`, {
      taskId,
      dataKeys: Object.keys(formData).length,
      timestamp: new Date().toISOString()
    });
    
    // Process the submission
    const result = await processSubmission({
      taskId,
      formData,
      userId: req.user?.id
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Form submission failed'
      });
    }
    
    // Save individual form responses with retry
    try {
      await executeWithRetry(
        async () => {
          // Using a transaction to ensure all responses are saved atomically
          await db.transaction(async (tx) => {
            // First clear any existing responses
            await tx
              .delete(openBankingResponses)
              .where(eq(openBankingResponses.task_id, taskId));
            
            // Then insert new responses
            for (const [fieldKey, value] of Object.entries(formData)) {
              // Find the field ID from the field_key
              const [field] = await tx
                .select()
                .from(openBankingFields)
                .where(eq(openBankingFields.field_key, fieldKey))
                .limit(1);
              
              if (field) {
                await tx
                  .insert(openBankingResponses)
                  .values({
                    task_id: taskId,
                    field_id: field.id,
                    field_key: fieldKey,
                    response_value: String(value),
                    status: 'COMPLETE'
                  });
              }
            }
          });
        },
        { operationName: `save Open Banking responses for task ${taskId}` }
      );
      
      logger.info(`Saved ${Object.keys(formData).length} Open Banking responses for task ${taskId}`, {
        taskId
      });
    } catch (saveError) {
      logger.error(`Failed to save individual Open Banking responses`, {
        taskId,
        error: saveError instanceof Error ? saveError.message : String(saveError)
      });
      
      // We still consider the submission successful if the task status update succeeded
    }
    
    // Return success
    return res.status(200).json({
      success: true,
      message: 'Open Banking survey submitted successfully',
      taskId,
      status: 'submitted'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(`Open Banking submission failed for task ${taskId}`, {
      taskId,
      error: errorMessage
    });
    
    return res.status(500).json({
      success: false,
      error: 'Server error processing Open Banking submission',
      details: errorMessage
    });
  }
});

export default router;