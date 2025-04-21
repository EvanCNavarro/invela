/**
 * S&P KY3P Security Assessment API Routes
 * 
 * This file contains the API routes for the S&P KY3P Security Assessment functionality.
 * It provides endpoints for fetching field definitions, submitting responses, and updating task status.
 */

import { Router } from 'express';
import { db } from '@db';
import { 
  ky3pFields, 
  ky3pResponses, 
  tasks, 
  users,
  companies,
  KYBFieldStatus
} from '@db/schema';
import { eq, asc, and, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';

const router = Router();
const logger = new Logger('KY3PRoutes');

// Middleware to check if the user has access to the requested task
async function hasTaskAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const taskId = parseInt(req.params.taskId);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: 'Invalid task ID' });
  }
  
  try {
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if the user has access to the task
    if (task.assigned_to !== req.user.id && task.created_by !== req.user.id && task.company_id !== req.user.company_id) {
      return res.status(403).json({ message: 'You do not have access to this task' });
    }
    
    req.task = task;
    next();
  } catch (error) {
    logger.error('Error checking task access:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get all KY3P field definitions
 */
router.get('/api/ky3p-fields', requireAuth, async (req, res) => {
  try {
    logger.info('[KY3P API] Fetching KY3P fields. User authenticated:', !!req.user);
    
    const fields = await db
      .select()
      .from(ky3pFields)
      .orderBy(asc(ky3pFields.order));
    
    logger.info(`[KY3P API] Successfully retrieved ${fields.length} KY3P fields`);
    
    // Group fields by step_index for logging
    const fieldsByStep = fields.reduce((acc, field) => {
      const step = field.step_index || 0;
      if (!acc[step]) acc[step] = [];
      acc[step].push(field.field_key);
      return acc;
    }, {});
    
    logger.info('[KY3P API] Fields grouped by step:', Object.keys(fieldsByStep).map(step => 
      `Step ${step}: ${fieldsByStep[step].length} fields`
    ));
    
    res.json(fields);
  } catch (error) {
    logger.error('Error fetching KY3P fields:', error);
    res.status(500).json({ message: 'Error fetching KY3P fields' });
  }
});

/**
 * Get all KY3P responses for a task
 */
router.get('/api/tasks/:taskId/ky3p-responses', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    const responses = await db
      .select({
        id: ky3pResponses.id,
        task_id: ky3pResponses.task_id,
        field_id: ky3pResponses.field_id,
        response_value: ky3pResponses.response_value,
        status: ky3pResponses.status,
        version: ky3pResponses.version,
        created_at: ky3pResponses.created_at,
        updated_at: ky3pResponses.updated_at,
        field: {
          id: ky3pFields.id,
          field_key: ky3pFields.field_key,
          label: ky3pFields.label,
          question: ky3pFields.question,
          group: ky3pFields.group,
          field_type: ky3pFields.field_type,
          is_required: ky3pFields.is_required
        }
      })
      .from(ky3pResponses)
      .leftJoin(ky3pFields, eq(ky3pResponses.field_id, ky3pFields.id))
      .where(eq(ky3pResponses.task_id, taskId))
      .orderBy(asc(ky3pFields.order));
    
    res.json(responses);
  } catch (error) {
    logger.error('Error fetching KY3P responses:', error);
    res.status(500).json({ message: 'Error fetching KY3P responses' });
  }
});

/**
 * Save a KY3P response for a field
 */
router.post('/api/tasks/:taskId/ky3p-responses/:fieldId', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const fieldId = parseInt(req.params.fieldId);
    const { response_value } = req.body;
    
    // Determine the status of the response based on the value
    let status: keyof typeof KYBFieldStatus = 'empty';
    if (response_value) {
      status = 'complete';
    } else {
      status = 'empty';
    }
    
    // Check if a response already exists for this task and field
    const [existingResponse] = await db
      .select()
      .from(ky3pResponses)
      .where(
        and(
          eq(ky3pResponses.task_id, taskId),
          eq(ky3pResponses.field_id, fieldId)
        )
      )
      .limit(1);
    
    let responseResult;
    
    if (existingResponse) {
      // Update the existing response
      responseResult = await db
        .update(ky3pResponses)
        .set({
          response_value,
          status,
          version: existingResponse.version + 1,
          updated_at: new Date()
        })
        .where(eq(ky3pResponses.id, existingResponse.id))
        .returning();
    } else {
      // Create a new response
      responseResult = await db
        .insert(ky3pResponses)
        .values({
          task_id: taskId,
          field_id: fieldId,
          response_value,
          status,
          version: 1,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();
    }
    
    // Calculate the completion percentage for the task
    const allFields = await db
      .select()
      .from(ky3pFields)
      .where(ky3pFields.is_required);
    
    const totalRequiredFields = allFields.length;
    
    const completedResponses = await db
      .select()
      .from(ky3pResponses)
      .where(
        and(
          eq(ky3pResponses.task_id, taskId),
          eq(ky3pResponses.status, 'complete')
        )
      );
    
    const completedRequiredFields = completedResponses.length;
    
    // Calculate progress as a percentage
    const progress = totalRequiredFields > 0 
      ? Math.min(100, Math.round((completedRequiredFields / totalRequiredFields) * 100)) / 100
      : 0;
      
    // Update the task progress
    await db
      .update(tasks)
      .set({
        progress,
        status: progress >= 1 ? 'ready_for_submission' : 'in_progress',
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId));
    
    res.json(responseResult[0]);
  } catch (error) {
    logger.error('Error saving KY3P response:', error);
    res.status(500).json({ message: 'Error saving KY3P response' });
  }
});

/**
 * Create a new KY3P assessment task
 */
router.post('/api/tasks/ky3p', requireAuth, async (req, res) => {
  try {
    const { company_id, assigned_to, title } = req.body;
    
    // Get company information to include in the task title if not provided
    let finalTitle = title;
    if (!finalTitle && company_id) {
      const [company] = await db
        .select({ name: companies.name })
        .from(companies)
        .where(eq(companies.id, company_id))
        .limit(1);
      
      if (company) {
        finalTitle = `2. S&P KY3P Security Assessment: ${company.name}`;
      } else {
        finalTitle = '2. S&P KY3P Security Assessment';
      }
    }
    
    // Create the task
    const [task] = await db
      .insert(tasks)
      .values({
        title: finalTitle,
        description: 'Complete the S&P KY3P Security Assessment form.',
        task_type: 'sp_ky3p_assessment', // New task type for KY3P assessments
        task_scope: 'company',
        status: 'not_started',
        priority: 'medium',
        progress: 0,
        assigned_to: assigned_to || null,
        created_by: req.user.id,
        company_id,
        created_at: new Date(),
        updated_at: new Date(),
        due_date: (() => {
          const date = new Date();
          date.setDate(date.getDate() + 21); // 3 weeks from now
          return date;
        })()
      })
      .returning();
    
    res.status(201).json(task);
  } catch (error) {
    logger.error('Error creating KY3P task:', error);
    res.status(500).json({ message: 'Error creating KY3P task' });
  }
});

/**
 * Submit a KY3P assessment task
 */
router.post('/api/tasks/:taskId/ky3p-submit', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    // Update the task status to submitted
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: 'submitted',
        completion_date: new Date(),
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    res.json(updatedTask);
  } catch (error) {
    logger.error('Error submitting KY3P task:', error);
    res.status(500).json({ message: 'Error submitting KY3P task' });
  }
});

export default router;