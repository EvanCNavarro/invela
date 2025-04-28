import { Router } from 'express';
import { db } from '@db';
import { 
  ky3pFields, 
  ky3pResponses, 
  ky3pTimestamps,
  users, 
  tasks, 
  KYBFieldStatus,
  TaskStatus,
  companies 
} from '@db/schema';
import { eq, asc, and, desc, ne, count, like, inArray, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { fetchResults } from '../utils/fetch-results';
import { Logger } from '../utils/logger';
import { broadcastTaskUpdate } from '../services/websocket';

const router = Router();
const logger = new Logger('KY3P');

// Add middleware for task access control
async function hasTaskAccess(req, res, next) {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    // If we're a super admin, allow access to any task
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    
    // Check if the user has access to this task
    const [task] = await db
      .select({
        id: tasks.id,
        company_id: tasks.company_id,
        user_id: tasks.user_id
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Allow access if the user created the task or belongs to the company
    if (
      (req.user && task.user_id === req.user.id) ||
      (req.user && task.company_id === req.user.company_id)
    ) {
      return next();
    }
    
    // Also allow access to tasks for companies that have relationships with user's company
    if (req.user && req.user.company_id) {
      const [related] = await db
        .select({
          exists: sql<boolean>`EXISTS (
            SELECT 1 FROM ${db.ref('relationships')} r
            WHERE (r.company_id = ${task.company_id} AND r.related_company_id = ${req.user.company_id})
            OR (r.company_id = ${req.user.company_id} AND r.related_company_id = ${task.company_id})
          )`
        })
        .from(tasks);
        
      if (related && related.exists) {
        return next();
      }
    }
    
    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    logger.error('Error checking task access:', error);
    res.status(500).json({ message: 'Error checking access' });
  }
}

// Get KY3P fields
router.get('/api/ky3p/fields', requireAuth, async (req, res) => {
  try {
    const fields = await db
      .select()
      .from(ky3pFields)
      .orderBy(asc(ky3pFields.id));
    
    return res.json(fields);
  } catch (error) {
    logger.error('Error fetching KY3P fields:', error);
    res.status(500).json({ message: 'Error fetching fields' });
  }
});

// Get KY3P responses for a task
router.get('/api/tasks/:taskId/ky3p-responses', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    const responses = await db
      .select({
        id: ky3pResponses.id,
        task_id: ky3pResponses.task_id,
        field_id: ky3pResponses.field_id,
        response_value: ky3pResponses.response_value,
        status: ky3pResponses.status,
        created_at: ky3pResponses.created_at,
        updated_at: ky3pResponses.updated_at,
        field_key: ky3pFields.field_key,
        field_type: ky3pFields.field_type
      })
      .from(ky3pResponses)
      .leftJoin(ky3pFields, eq(ky3pResponses.field_id, ky3pFields.id))
      .where(eq(ky3pResponses.task_id, taskId))
      .orderBy(asc(ky3pFields.id));
    
    return res.json(responses);
  } catch (error) {
    logger.error('Error fetching KY3P responses:', error);
    res.status(500).json({ message: 'Error fetching responses' });
  }
});

// Get status of KY3P fields for a task
router.get('/api/tasks/:taskId/ky3p-status', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    // Get all fields
    const allFields = await db
      .select()
      .from(ky3pFields)
      .where(ne(ky3pFields.field_type, 'section'))
      .orderBy(asc(ky3pFields.id));
    
    // Get completed fields
    const completedFields = await db
      .select({
        field_id: ky3pResponses.field_id
      })
      .from(ky3pResponses)
      .where(
        and(
          eq(ky3pResponses.task_id, taskId),
          ne(ky3pResponses.status, KYBFieldStatus.EMPTY)
        )
      );
    
    const completedFieldIds = new Set(completedFields.map(f => f.field_id));
    const totalFields = allFields.length;
    const completedCount = completedFieldIds.size;
    const progress = totalFields > 0 ? Math.round((completedCount / totalFields) * 100) : 0;
    
    return res.json({
      totalFields,
      completedFields: completedCount,
      progress
    });
  } catch (error) {
    logger.error('Error fetching KY3P status:', error);
    res.status(500).json({ message: 'Error fetching status' });
  }
});

// Get a specific KY3P response
router.get('/api/tasks/:taskId/ky3p-responses/:fieldId', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const fieldId = parseInt(req.params.fieldId);
    
    if (isNaN(taskId) || isNaN(fieldId)) {
      return res.status(400).json({ message: 'Invalid IDs' });
    }
    
    const [response] = await db
      .select()
      .from(ky3pResponses)
      .where(
        and(
          eq(ky3pResponses.task_id, taskId),
          eq(ky3pResponses.field_id, fieldId)
        )
      )
      .limit(1);
    
    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }
    
    return res.json(response);
  } catch (error) {
    logger.error('Error fetching KY3P response:', error);
    res.status(500).json({ message: 'Error fetching response' });
  }
});

// Add or update a KY3P response
router.post('/api/tasks/:taskId/ky3p-responses/:fieldId', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const fieldId = parseInt(req.params.fieldId);
    
    if (isNaN(taskId) || isNaN(fieldId)) {
      return res.status(400).json({ message: 'Invalid IDs' });
    }
    
    const { value, status } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ message: 'Response value is required' });
    }
    
    // Check if the field exists
    const [field] = await db
      .select()
      .from(ky3pFields)
      .where(eq(ky3pFields.id, fieldId))
      .limit(1);
    
    if (!field) {
      return res.status(404).json({ message: 'Field not found' });
    }
    
    // Check if a response already exists
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
    
    let response;
    if (existingResponse) {
      // Update existing response
      [response] = await db
        .update(ky3pResponses)
        .set({
          response_value: String(value),
          status: status || KYBFieldStatus.COMPLETE,
          updated_at: new Date()
        })
        .where(eq(ky3pResponses.id, existingResponse.id))
        .returning();
    } else {
      // Create new response
      [response] = await db
        .insert(ky3pResponses)
        .values({
          task_id: taskId,
          field_id: fieldId,
          response_value: String(value),
          status: status || KYBFieldStatus.COMPLETE
        })
        .returning();
    }
    
    // Update task progress
    await updateTaskProgress(taskId);
    
    return res.json(response);
  } catch (error) {
    logger.error('Error updating KY3P response:', error);
    res.status(500).json({ message: 'Error updating response' });
  }
});

// Helper function to update task progress
async function updateTaskProgress(taskId) {
  try {
    // Get all fields (except section headers)
    const [totalFields] = await db
      .select({
        count: count()
      })
      .from(ky3pFields)
      .where(ne(ky3pFields.field_type, 'section'));
    
    // Get completed fields
    const [completedFields] = await db
      .select({
        count: count()
      })
      .from(ky3pResponses)
      .where(
        and(
          eq(ky3pResponses.task_id, taskId),
          ne(ky3pResponses.status, KYBFieldStatus.EMPTY)
        )
      );
    
    const totalCount = totalFields?.count || 0;
    const completedCount = completedFields?.count || 0;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    // Update task progress
    await db
      .update(tasks)
      .set({
        progress,
        status: progress > 0 ? TaskStatus.IN_PROGRESS : TaskStatus.NOT_STARTED,
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId));
    
    // Broadcast task update
    await broadcastTaskUpdate(taskId);
    
    return { progress, totalCount, completedCount };
  } catch (error) {
    logger.error('Error updating task progress:', error);
    throw error;
  }
}

// Create a new KY3P task
router.post('/api/tasks/ky3p', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { company_id, task_name, deadline, priority } = req.body;
    
    if (!company_id) {
      return res.status(400).json({ message: 'Company ID is required' });
    }
    
    // Check if company exists
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, company_id))
      .limit(1);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    // Create new task
    const [task] = await db
      .insert(tasks)
      .values({
        user_id: req.user.id,
        company_id,
        task_name: task_name || `KY3P Assessment for ${company.name}`,
        task_type: 'ky3p',
        deadline: deadline ? new Date(deadline) : null,
        priority: priority || 'medium',
        status: TaskStatus.NOT_STARTED,
        progress: 0
      })
      .returning();
    
    return res.status(201).json(task);
  } catch (error) {
    logger.error('Error creating KY3P task:', error);
    res.status(500).json({ message: 'Error creating task' });
  }
});

// Submit a KY3P task
router.post('/api/tasks/:taskId/ky3p-submit', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    // Check if task exists
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Get company info
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, task.company_id))
      .limit(1);
    
    // Get all responses
    const responses = await db
      .select({
        task_id: ky3pResponses.task_id,
        field_id: ky3pResponses.field_id,
        response_value: ky3pResponses.response_value,
        status: ky3pResponses.status,
        field_key: ky3pFields.field_key,
        field_type: ky3pFields.field_type,
        field_label: ky3pFields.display_name,
        section: ky3pFields.section,
        subsection: ky3pFields.subsection
      })
      .from(ky3pResponses)
      .leftJoin(ky3pFields, eq(ky3pResponses.field_id, ky3pFields.id))
      .where(eq(ky3pResponses.task_id, taskId))
      .orderBy(asc(ky3pFields.id));
    
    // Get missing required fields
    const requiredFields = await db
      .select({
        id: ky3pFields.id,
        field_key: ky3pFields.field_key,
        display_name: ky3pFields.display_name,
        is_required: ky3pFields.is_required
      })
      .from(ky3pFields)
      .where(and(
        eq(ky3pFields.is_required, true),
        ne(ky3pFields.field_type, 'section')
      ));
    
    const respondedFieldIds = new Set(responses.map(r => r.field_id));
    const missingFields = requiredFields.filter(field => !respondedFieldIds.has(field.id));
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields
      });
    }
    
    // Update task to completed
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: TaskStatus.COMPLETED,
        completed_at: new Date(),
        updated_at: new Date(),
        progress: 100
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    // Broadcast task update
    await broadcastTaskUpdate(taskId);
    
    // Return success with some metadata about the submission
    return res.json({
      success: true,
      task: updatedTask,
      metadata: {
        company_name: company?.name || 'Unknown',
        response_count: responses.length,
        submission_time: updatedTask.completed_at
      }
    });
  } catch (error) {
    logger.error('Error submitting KY3P task:', error);
    res.status(500).json({ message: 'Error submitting task' });
  }
});

// Removed problematic batch update endpoint that was causing syntax issues
// And replaced with a simpler redirect to our fixed implementation
router.post('/api/ky3p/batch-update/:taskId', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    logger.info(`[KY3P API] Redirecting batch update request to fixed implementation`);
    // This redirects to the fixed implementation in ky3p-batch-update-fixed.ts
    return res.redirect(307, req.originalUrl);
  } catch (error) {
    logger.error('[KY3P API] Error redirecting batch update:', error);
    res.status(500).json({ message: 'Error processing batch update' });
  }
});

// KY3P bulk update endpoint - specifically designed for the demo auto-fill functionality
router.post('/api/ky3p-bulk-update/:taskId', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    const { fields, demoData, useFieldKeys } = req.body;
    
    if (!fields && !demoData) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    // Use either provided fields or demo data
    const fieldsToUpdate = fields || demoData;
    
    if (typeof fieldsToUpdate !== 'object') {
      return res.status(400).json({ message: 'Invalid fields format' });
    }
    
    // Process fields
    const updatedFields = [];
    
    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      try {
        let fieldId;
        
        if (useFieldKeys) {
          // Use the key as field_key
          const [field] = await db
            .select()
            .from(ky3pFields)
            .where(eq(ky3pFields.field_key, key))
            .limit(1);
          
          if (!field) {
            logger.warn(`[KY3P API] Field not found by key: ${key}`);
            continue;
          }
          
          fieldId = field.id;
        } else {
          // Try to parse key as numeric field ID
          fieldId = parseInt(key);
          
          if (isNaN(fieldId)) {
            logger.warn(`[KY3P API] Invalid field ID: ${key}`);
            continue;
          }
          
          // Verify field exists
          const [field] = await db
            .select()
            .from(ky3pFields)
            .where(eq(ky3pFields.id, fieldId))
            .limit(1);
          
          if (!field) {
            logger.warn(`[KY3P API] Field not found: ${fieldId}`);
            continue;
          }
        }
        
        // Check if response already exists
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
        
        if (existingResponse) {
          // Update existing response
          await db
            .update(ky3pResponses)
            .set({
              response_value: String(value),
              status: KYBFieldStatus.COMPLETE,
              updated_at: new Date()
            })
            .where(eq(ky3pResponses.id, existingResponse.id));
        } else {
          // Create new response
          await db
            .insert(ky3pResponses)
            .values({
              task_id: taskId,
              field_id: fieldId,
              response_value: String(value),
              status: KYBFieldStatus.COMPLETE
            });
        }
        
        updatedFields.push(key);
      } catch (fieldError) {
        logger.error(`[KY3P API] Error updating field ${key}:`, fieldError);
      }
    }
    
    // Update task progress
    const progressData = await updateTaskProgress(taskId);
    
    return res.json({
      success: true,
      updated: updatedFields.length,
      fields: updatedFields,
      progress: progressData.progress
    });
  } catch (error) {
    logger.error('[KY3P API] Error in bulk update:', error);
    res.status(500).json({ message: 'Error processing bulk update' });
  }
});

// Add more endpoints as needed...

export default router;