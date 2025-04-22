/**
 * KY3P Demo Auto-fill API Route
 * 
 * This file provides an API endpoint for automatically filling KY3P forms with demo data
 * for testing and demonstration purposes.
 */

import { Router } from 'express';
import { db } from '@db';
import { 
  ky3pFields, 
  ky3pResponses, 
  tasks,
  companies
} from '@db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';
import { broadcastTaskUpdate } from '../services/websocket';

const router = Router();
const logger = new Logger('KY3PDemoAutofill');

/**
 * Helper function to handle the KY3P demo auto-fill logic
 * This is reused by both endpoint formats to avoid code duplication
 */
async function handleKy3pDemoAutofill(req, res) {
  const taskId = parseInt(req.params.taskId, 10);
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    logger.info('Demo auto-fill requested for KY3P task', { taskId, userId: req.user.id });
    
    // Get the task to verify ownership and company
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      logger.error('Task not found for KY3P demo auto-fill', { taskId });
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // SECURITY: Verify user belongs to the task's company
    if (req.user.company_id !== task.company_id) {
      logger.error('Security violation: User attempted to access task from another company', {
        userId: req.user.id,
        userCompanyId: req.user.company_id,
        taskId: task.id,
        taskCompanyId: task.company_id
      });
      
      return res.status(403).json({
        message: 'You do not have permission to access this task'
      });
    }
    
    // Verify this is a demo company
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, task.company_id));
      
    // In the DB schema it's 'is_demo', but we need to verify both naming conventions for compatibility
    if (!company || company.is_demo !== true) {
      logger.error('Company is not marked as demo', { 
        companyId: task.company_id,
        isDemo: company?.is_demo
      });
      
      return res.status(403).json({
        message: 'Auto-fill is only available for demo companies'
      });
    }
    
    // Get all KY3P fields with demo_autofill values
    const fields = await db.select({
      id: ky3pFields.id,
      field_key: ky3pFields.field_key,
      demo_autofill: ky3pFields.demo_autofill
    })
      .from(ky3pFields)
      .where(and(
        sql`${ky3pFields.demo_autofill} IS NOT NULL`,
        sql`${ky3pFields.demo_autofill} != ''`
      ))
      .orderBy(asc(ky3pFields.id));
    
    logger.info(`Found ${fields.length} KY3P fields with demo values for task ${taskId}`);
    
    // First delete any existing responses for this task
    await db.delete(ky3pResponses)
      .where(eq(ky3pResponses.task_id, taskId));
    
    logger.info(`Cleared existing responses for task ${taskId}`);
    
    // Insert all demo data
    const insertPromises = fields.map(field => {
      return db.insert(ky3pResponses)
        .values({
          field_id: field.id,
          field_key: field.field_key,
          task_id: taskId,
          value: field.demo_autofill || '',
          created_at: new Date(),
          updated_at: new Date(),
          created_by: req.user.id,
          updated_by: req.user.id
        });
    });
    
    await Promise.all(insertPromises);
    const insertCount = insertPromises.length;
    
    logger.info(`Successfully inserted ${insertCount} KY3P responses for task ${taskId}`);
    
    // Update task progress based on response count
    const progress = Math.min(Math.round((insertCount / 120) * 100), 100);
    let status = 'in_progress';
    
    if (progress >= 100) {
      status = 'submitted';
    } else if (progress === 0) {
      status = 'not_started';
    }
    
    await db.update(tasks)
      .set({
        progress,
        status,
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId));
    
    logger.info('Updated task progress after demo auto-fill', {
      taskId,
      progress,
      status
    });
    
    // Broadcast the update to WebSocket clients for real-time UI updates
    broadcastTaskUpdate({
      id: taskId, // IMPORTANT: Must use 'id' not 'taskId' for WebSocket broadcast
      taskId, // Keep taskId for backwards compatibility
      status,
      progress,
      source: 'ky3p_demo_autofill',
      timestamp: new Date().toISOString()
    });
    
    return res.json({
      success: true,
      message: 'KY3P form auto-filled with demo data',
      responsesInserted: insertCount,
      progress,
      status
    });
  } catch (error) {
    logger.error('Error performing KY3P demo auto-fill', {
      taskId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      message: 'Failed to auto-fill KY3P form',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * API endpoint to auto-fill all KY3P form fields with demo data
 * Original URL format: /api/tasks/:taskId/ky3p-demo-autofill
 * This directly inserts the data into the responses table
 */
router.post('/api/tasks/:taskId/ky3p-demo-autofill', requireAuth, async (req, res) => {
  return handleKy3pDemoAutofill(req, res);
});

/**
 * API endpoint to auto-fill all KY3P form fields with demo data
 * New URL format: /api/ky3p/demo-autofill/:taskId  
 * This matches the pattern used by other form types
 */
router.post('/api/ky3p/demo-autofill/:taskId', requireAuth, async (req, res) => {
  return handleKy3pDemoAutofill(req, res);
});

export default router;