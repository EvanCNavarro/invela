/**
 * Open Banking Demo Auto-fill API Route
 * 
 * This file provides an API endpoint for automatically filling Open Banking forms with demo data
 * for testing and demonstration purposes.
 */

import { Router } from 'express';
import { db } from '@db';
import { 
  openBankingFields, 
  openBankingResponses, 
  tasks,
  companies
} from '@db/schema';
import { eq, and, asc, ne, isNotNull } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';
import { broadcastTaskUpdate } from '../services/websocket';

const router = Router();
const logger = new Logger('OpenBankingDemoAutofill');

/**
 * API endpoint to auto-fill all Open Banking form fields with demo data
 * This directly inserts the data into the responses table
 */
router.post('/api/tasks/:taskId/open-banking-demo-autofill', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    logger.info('Demo auto-fill requested for Open Banking task', { taskId, userId: req.user.id });
    
    // Get the task to verify ownership and company
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      logger.error('Task not found for Open Banking demo auto-fill', { taskId });
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
    
    // Get all Open Banking fields with demo_autofill values
    const fields = await db.select({
      id: openBankingFields.id,
      field_key: openBankingFields.field_key,
      demo_autofill: openBankingFields.demo_autofill
    })
      .from(openBankingFields)
      .where(and(
        openBankingFields.demo_autofill.notNull(),
        openBankingFields.demo_autofill.ne('')
      ))
      .orderBy(asc(openBankingFields.id));
    
    logger.info(`Found ${fields.length} Open Banking fields with demo values`);
    
    // Clear existing responses first
    await db.delete(openBankingResponses)
      .where(eq(openBankingResponses.task_id, taskId));
    
    logger.info('Cleared existing responses for task', { taskId });
    
    // Insert demo values for each field
    let insertCount = 0;
    const insertPromises = fields.map(async (field) => {
      try {
        await db.insert(openBankingResponses).values({
          task_id: taskId,
          field_id: field.id,
          response_value: field.demo_autofill || '',
          created_at: new Date(),
          updated_at: new Date(),
          created_by: req.user!.id
        });
        insertCount++;
      } catch (insertError) {
        logger.error('Error inserting demo response', {
          taskId,
          fieldId: field.id,
          error: insertError instanceof Error ? insertError.message : 'Unknown error'
        });
      }
    });
    
    await Promise.all(insertPromises);
    
    logger.info('Demo auto-fill completed successfully', {
      taskId,
      fieldsWithDemo: fields.length,
      insertedResponses: insertCount
    });
    
    // Update task progress based on response count
    // Adjust the denominator to match the total number of Open Banking fields
    const totalOpenBankingFields = 120; // Adjust this to match your actual count
    const progress = Math.min(Math.round((insertCount / totalOpenBankingFields) * 100), 100);
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
      taskId,
      status,
      progress,
      source: 'open_banking_demo_autofill',
      timestamp: new Date().toISOString()
    });
    
    return res.json({
      success: true,
      message: 'Open Banking form auto-filled with demo data',
      responsesInserted: insertCount,
      progress,
      status
    });
  } catch (error) {
    logger.error('Error performing Open Banking demo auto-fill', {
      taskId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      message: 'Failed to auto-fill Open Banking form',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET endpoint to retrieve demo data for Open Banking form
 * This endpoint returns a JSON object containing field keys mapped to their demo values
 */
router.get('/api/open-banking/demo-autofill/:taskId', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    logger.info('Retrieving Open Banking demo data for task', { taskId, userId: req.user.id });
    
    // Get the task to verify ownership and company
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      logger.error('Task not found for Open Banking demo auto-fill data retrieval', { taskId });
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
      
    // In the DB schema it's 'is_demo', but we need to verify this is a demo company
    if (!company || company.is_demo !== true) {
      logger.error('Company is not marked as demo for data retrieval', { 
        companyId: task.company_id,
        isDemo: company?.is_demo
      });
      
      return res.status(403).json({
        message: 'Auto-fill is only available for demo companies'
      });
    }
    
    // Get all Open Banking fields with demo_autofill values
    const fields = await db.select({
      id: openBankingFields.id,
      field_key: openBankingFields.field_key,
      demo_autofill: openBankingFields.demo_autofill
    })
      .from(openBankingFields)
      .where(and(
        openBankingFields.demo_autofill.notNull(),
        openBankingFields.demo_autofill.ne('')
      ))
      .orderBy(asc(openBankingFields.id));
    
    logger.info(`Retrieved ${fields.length} Open Banking fields with demo values for task ${taskId}`);
    
    // Convert to key-value object format
    const demoData: Record<string, string> = {};
    fields.forEach(field => {
      if (field.field_key && field.demo_autofill) {
        demoData[field.field_key] = field.demo_autofill;
      }
    });
    
    return res.json(demoData);
  } catch (error) {
    logger.error('Error retrieving Open Banking demo data', {
      taskId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      message: 'Failed to retrieve Open Banking demo data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;