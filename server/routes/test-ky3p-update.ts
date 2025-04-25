/**
 * Test endpoint for KY3P batch update functionality
 * 
 * This route helps diagnose and test the KY3P form batch update functionality
 * by logging detailed information about the request and response.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';
import { db } from '@db';
import { ky3pFields, ky3pResponses } from '@db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();
const logger = new Logger('TestKY3PUpdate');

router.post('/api/test/ky3p-batch-update/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    logger.info(`[Test] Received KY3P batch update test request for task ${taskId}`, {
      requestBody: typeof req.body === 'object' ? 'object' : typeof req.body,
      responseFormat: req.body && req.body.responses ? 
        (Array.isArray(req.body.responses) ? 'array' : 'object') : 'unknown',
      bodyKeys: Object.keys(req.body),
      responseCount: req.body.responses ? 
        (Array.isArray(req.body.responses) ? 
          req.body.responses.length : 
          Object.keys(req.body.responses).length) : 0
    });
    
    // Extract responses from request body
    const responses = req.body.responses || req.body;
    
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({ 
        message: 'Invalid request format',
        details: {
          responsesType: typeof responses,
          isArray: Array.isArray(responses),
          bodyReceived: req.body ? true : false
        }
      });
    }
    
    // Test the conversion from object to array format (if needed)
    if (!Array.isArray(responses)) {
      // Get fields for mapping
      const fields = await db.select().from(ky3pFields);
      logger.info(`[Test] Retrieved ${fields.length} fields for mapping`);
      
      const fieldKeyToIdMap = new Map(
        fields.map(field => [field.field_key, field.id])
      );
      
      // Do the conversion in memory without saving
      const convertedResponses = Object.entries(responses)
        .filter(([key, value]) => {
          if (key.startsWith('_')) return false;
          const fieldId = fieldKeyToIdMap.get(key);
          return fieldId !== undefined;
        })
        .map(([key, value]) => {
          const fieldId = fieldKeyToIdMap.get(key);
          return { 
            fieldKey: key,
            fieldId, 
            value 
          };
        });
      
      return res.json({
        success: true,
        message: 'Test completed - object format converted to array format',
        original: {
          format: 'object',
          keyCount: Object.keys(responses).length,
          sampleKeys: Object.keys(responses).slice(0, 5)
        },
        converted: {
          format: 'array',
          responseCount: convertedResponses.length,
          sample: convertedResponses.slice(0, 5)
        }
      });
    } else {
      // Check array format
      return res.json({
        success: true,
        message: 'Test completed - array format detected',
        details: {
          format: 'array',
          responseCount: responses.length,
          sample: responses.slice(0, 5)
        }
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Test] Error processing KY3P batch update test:', { error: errorMessage });
    res.status(500).json({ 
      message: 'Error processing test request',
      error: errorMessage
    });
  }
});

export default router;