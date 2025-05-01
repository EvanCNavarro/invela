/**
 * KY3P Fields API Route
 * 
 * This file defines the API route for getting KY3P field definitions,
 * which are required by the KY3P form to render properly.
 */

import { Router } from 'express';
import { db } from '@db';
import { ky3pFields } from '@db/schema';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';

// Logger is already initialized in the imported module
const router = Router();

/**
 * GET /api/ky3p-fields
 * 
 * Retrieves all KY3P field definitions from the database.
 * These fields are used to render the KY3P form in the UI.
 */
router.get('/api/ky3p-fields', requireAuth, async (req, res) => {
  try {
    logger.info('Fetching all KY3P fields');
    
    const fields = await db.select().from(ky3pFields).orderBy(ky3pFields.id);
    
    if (!fields || fields.length === 0) {
      logger.warn('No KY3P fields found in database');
    } else {
      logger.info(`Successfully retrieved ${fields.length} KY3P fields`);
    }
    
    // Always return an array, even if empty
    return res.json(fields || []);
  } catch (error) {
    logger.error('Error fetching KY3P fields', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      error: 'Failed to retrieve KY3P fields',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
