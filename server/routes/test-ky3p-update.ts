/**
 * Test endpoint for KY3P Batch Update Functionality
 * 
 * This route provides a test endpoint for validating the format conversion
 * from KYB-style response objects to KY3P-style response arrays.
 */

import express from 'express';
import { Logger } from '../utils/logger';

const router = express.Router();
const logger = new Logger('TestKy3pUpdate');

/**
 * Convert an object of key-value pairs to an array of KY3P response objects
 * 
 * @param responses - The object containing field keys and values
 * @returns An array of KY3P response objects with fieldId and value
 */
function convertToKy3pResponseFormat(responses: Record<string, any>): Array<{fieldId: string, value: any}> {
  // Filter out metadata fields (starting with underscore)
  const filteredResponses = Object.entries(responses).filter(([key]) => !key.startsWith('_'));
  
  // Convert to the array format expected by KY3P API
  return filteredResponses.map(([key, value]) => ({
    fieldId: key,
    value: value,
  }));
}

/**
 * Test endpoint for KY3P batch update format conversion
 * POST /api/test/ky3p-batch-update/:taskId
 */
router.post('/:taskId', async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const { responses } = req.body;
  
  logger.info('[Test] KY3P batch update test received', { 
    taskId, 
    responseKeys: Object.keys(responses || {}).length 
  });
  
  try {
    // Validate input
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({ 
        message: 'Invalid responses format',
        error: 'Expected an object with field keys and values' 
      });
    }
    
    if (isNaN(taskId)) {
      return res.status(400).json({ 
        message: 'Invalid task ID',
        error: 'Task ID must be a number' 
      });
    }
    
    // Convert the responses to KY3P format
    const convertedResponses = convertToKy3pResponseFormat(responses);
    
    logger.info('[Test] Converted responses', { 
      taskId, 
      originalCount: Object.keys(responses).length,
      convertedCount: convertedResponses.length
    });
    
    // Return the original and converted formats for comparison
    res.status(200).json({
      message: 'Format conversion successful',
      original: {
        format: 'object',
        keyCount: Object.keys(responses).length,
        keys: Object.keys(responses).slice(0, 10)
      },
      converted: {
        format: 'array',
        responseCount: convertedResponses.length,
        sample: convertedResponses.slice(0, 5)
      }
    });
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