/**
 * Debug endpoints for testing and troubleshooting
 * 
 * These endpoints are for development and testing purposes only.
 * They should NOT be enabled in production environments.
 */

import { Router } from 'express';
import { db } from '@db';
import { tasks, ky3pFields } from '@db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Get all KY3P tasks for testing purposes
 */
router.get('/ky3p-tasks', async (req, res) => {
  try {
    const ky3pTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.task_type, 'ky3p'))
      .limit(10);
    
    // Return the tasks
    return res.json(ky3pTasks);
  } catch (error) {
    console.error('[Debug] Error fetching KY3P tasks:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Get KY3P field definitions for testing purposes
 */
router.get('/ky3p-fields', async (req, res) => {
  try {
    const fields = await db
      .select()
      .from(ky3pFields)
      .limit(20);
    
    return res.json(fields);
  } catch (error) {
    console.error('[Debug] Error fetching KY3P fields:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
