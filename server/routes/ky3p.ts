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
  KYBFieldStatus,
  TaskStatus
} from '@db/schema';
import { eq, asc, and, desc, or, ne } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';

const router = Router();
const logger = new Logger('KY3PRoutes');

/**
 * Unlock dependent tasks after KY3P task completion
 * This is similar to the unlockSecurityTasks function in kyb.ts
 * but focuses on unlocking CARD and/or Open Banking Survey tasks
 */
const unlockDependentTasks = async (companyId: number, ky3pTaskId: number, userId?: number) => {
  try {
    logger.info('[KY3P API] Looking for dependent tasks to unlock after KY3P submission', {
      ky3pTaskId,
      companyId
    });
    
    // Find CARD or Open Banking Survey tasks for this company that might need unlocking
    const dependentTasks = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.company_id, companyId),
          or(
            eq(tasks.task_type, 'company_card'),
            eq(tasks.task_type, 'open_banking_survey')
          )
        )
      );
      
    logger.info('[KY3P API] Found potential dependent tasks to unlock', {
      count: dependentTasks.length,
      taskIds: dependentTasks.map(t => t.id),
      taskTypes: dependentTasks.map(t => t.task_type)
    });
    
    // Check each task to see if it's dependent on the KY3P task that was just completed
    for (const dependentTask of dependentTasks) {
      // Special case for Open Banking Survey and Company Card tasks - always unlock them after KY3P submission
      // OR check the standard prerequisite logic for other task types
      const isOpenBankingSurvey = dependentTask.task_type === 'open_banking_survey';
      const isCompanyCard = dependentTask.task_type === 'company_card';
      const isCardOrSurveyTask = isOpenBankingSurvey || isCompanyCard;
      
      logger.info('[KY3P API] Checking task for unlocking', {
        taskId: dependentTask.id,
        taskType: dependentTask.task_type,
        isCardOrSurveyTask,
        isLocked: dependentTask.metadata?.locked === true,
        status: dependentTask.status
      });
      
      // For Card/Survey tasks, always force unlock them regardless of their current status
      if (isCardOrSurveyTask) {
        logger.info('[KY3P API] Force unlocking Card/Survey task regardless of current status', {
          taskId: dependentTask.id,
          taskType: dependentTask.task_type
        });
        
        try {
          // Use direct SQL for maximum reliability
          await db.execute(`
            UPDATE tasks 
            SET 
              status = CASE WHEN status = 'locked' OR status IS NULL THEN 'not_started' ELSE status END,
              metadata = jsonb_set(
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      COALESCE(metadata, '{}'::jsonb),
                      '{locked}', 
                      'false'
                    ),
                    '{prerequisite_completed}',
                    'true'
                  ),
                  '{prerequisite_completed_at}',
                  '"${new Date().toISOString()}"'
                ),
                '{unlocked_by}',
                '"ky3p_submission"'
              ),
              updated_at = NOW()
            WHERE id = $1
          `, [dependentTask.id]);
          
          logger.info('[KY3P API] Task successfully unlocked using direct SQL', {
            taskId: dependentTask.id,
            taskType: dependentTask.task_type
          });
        } catch (sqlError) {
          logger.error('[KY3P API] Failed to unlock task with direct SQL, falling back to ORM:', sqlError);
          
          // Fallback to the ORM update method
          await db.update(tasks)
            .set({
              status: dependentTask.status === 'locked' || !dependentTask.status ? 'not_started' : dependentTask.status,
              metadata: {
                ...dependentTask.metadata,
                locked: false, // Explicitly unlock the task
                prerequisite_completed: true,
                prerequisite_completed_at: new Date().toISOString(),
                prerequisite_completed_by: userId,
                unlocked_by: 'ky3p_submission' // Mark how this was unlocked
              },
              updated_at: new Date()
            })
            .where(eq(tasks.id, dependentTask.id));
        }
        
        // Broadcast the task update through WebSocket
        try {
          const { broadcastTaskUpdate } = await import('../services/websocket.js');
          await broadcastTaskUpdate(dependentTask.id);
          
          // Also broadcast the progress update to ensure UI refreshes
          const { broadcastProgressUpdate } = await import('../utils/progress');
          await broadcastProgressUpdate(dependentTask.id, 0);
          
          logger.info('[KY3P API] WebSocket broadcast sent for task unlock', {
            taskId: dependentTask.id
          });
        } catch (wsError) {
          logger.error('[KY3P API] Failed to broadcast WebSocket update for task unlock:', wsError);
        }
      }
      // Handle normal task prerequisite logic for other task types
      else if (
        dependentTask.metadata?.locked === true || 
        dependentTask.metadata?.prerequisite_task_id === ky3pTaskId ||
        dependentTask.metadata?.prerequisite_task_type === 'sp_ky3p_assessment'
      ) {
        logger.info('[KY3P API] Unlocking dependent task based on prerequisites', {
          dependentTaskId: dependentTask.id,
          dependentTaskType: dependentTask.task_type,
          previousMetadata: {
            locked: dependentTask.metadata?.locked,
            prerequisiteTaskId: dependentTask.metadata?.prerequisite_task_id,
            prerequisiteTaskType: dependentTask.metadata?.prerequisite_task_type
          }
        });
        
        // Update the dependent task to unlock it
        await db.update(tasks)
          .set({
            status: dependentTask.status === 'locked' || !dependentTask.status ? 'not_started' : dependentTask.status,
            metadata: {
              ...dependentTask.metadata,
              locked: false, // Explicitly unlock the task
              prerequisite_completed: true,
              prerequisite_completed_at: new Date().toISOString(),
              prerequisite_completed_by: userId,
              unlocked_by: 'ky3p_submission' // Mark how this was unlocked
            },
            updated_at: new Date()
          })
          .where(eq(tasks.id, dependentTask.id));
          
        logger.info('[KY3P API] Dependent task unlocked successfully', {
          dependentTaskId: dependentTask.id,
          dependentTaskType: dependentTask.task_type
        });
        
        // Broadcast the task update through WebSocket
        try {
          const { broadcastTaskUpdate } = await import('../services/websocket.js');
          await broadcastTaskUpdate(dependentTask.id);
          
          // Also broadcast the progress update to ensure UI refreshes
          const { broadcastProgressUpdate } = await import('../utils/progress');
          await broadcastProgressUpdate(dependentTask.id, 0);
          
          logger.info('[KY3P API] WebSocket broadcast sent for task unlock', {
            taskId: dependentTask.id
          });
        } catch (wsError) {
          logger.error('[KY3P API] Failed to broadcast WebSocket update for task unlock:', wsError);
        }
      }
    }
    
    return { success: true, count: dependentTasks.length };
  } catch (error) {
    logger.error('[KY3P API] Error unlocking dependent tasks:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

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
          display_name: ky3pFields.display_name,
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
 * Get KY3P task progress and form data
 * This endpoint follows the same pattern as /api/kyb/progress/:taskId
 * to ensure compatibility with the UniversalForm component
 */
router.get('/api/ky3p/progress/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      logger.warn(`[KY3P API] Invalid task ID provided: ${req.params.taskId}`);
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    logger.info(`[KY3P API] Fetching progress for task ${taskId}. User authenticated: ${!!req.user}`);
    
    // Log user details to help debug authentication issues
    if (req.user) {
      logger.debug(`[KY3P API] User details:`, {
        userId: req.user.id,
        companyId: req.user.company_id
      })
    }
    
    // Get the task
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check access - user must be assigned to the task or part of the company
    if (task.assigned_to !== req.user.id && task.created_by !== req.user.id && task.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get all responses for this task
    const responses = await db
      .select({
        response_value: ky3pResponses.response_value,
        field_key: ky3pFields.field_key
      })
      .from(ky3pResponses)
      .leftJoin(ky3pFields, eq(ky3pResponses.field_id, ky3pFields.id))
      .where(eq(ky3pResponses.task_id, taskId));
    
    logger.debug('Retrieved task:', {
      taskId,
      status: task.status,
      progress: task.progress,
      metadata: Object.keys(task.metadata || {}),
      timestamp: new Date().toISOString()
    });
    
    logger.debug('Retrieved responses:', { 
      responseCount: responses.length, 
      timestamp: new Date().toISOString()
    });
    
    // Convert responses to key-value format expected by the form
    const formData: Record<string, any> = {};
    
    for (const response of responses) {
      if (response.field_key) {
        formData[response.field_key] = response.response_value;
      }
    }
    
    // Add submission date from task metadata if available
    const submissionDate = task.metadata?.submissionDate || task.completion_date;
    
    if (task.status === 'submitted' && submissionDate) {
      formData['_submissionDate'] = submissionDate;
    }
    
    // For debugging purposes
    logger.debug('Retrieved task data:', {
      id: taskId,
      responseCount: responses.length,
      progress: task.progress,
      status: task.status,
      formDataKeys: Object.keys(formData)
    });
    
    // Return the formatted data
    return res.json({
      formData,
      progress: task.status === 'submitted' ? 100 : task.progress,
      status: task.status
    });
    
  } catch (error) {
    logger.error('Error fetching KY3P progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Save a KY3P response for a field using field key - USED BY DEMO AUTO-FILL
 * This endpoint allows saving data by field key instead of field ID
 * which is more reliable for demo auto-fill operations
 */
router.post('/api/tasks/:taskId/ky3p-field/:fieldKey', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const fieldKey = req.params.fieldKey;
    const { value } = req.body;
    
    logger.debug(`[KY3P API] Processing field update by key:`, {
      taskId,
      fieldKey,
      valueType: typeof value,
      valueSnippet: typeof value === 'object' 
        ? JSON.stringify(value).substring(0, 50) + '...' 
        : String(value).substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    });
    
    // Lookup the field by key to get the field ID
    const [field] = await db
      .select()
      .from(ky3pFields)
      .where(eq(ky3pFields.field_key, fieldKey))
      .limit(1);
    
    if (!field) {
      logger.error(`[KY3P API] Field key "${fieldKey}" not found in database`);
      return res.status(404).json({
        message: 'Field not found',
        details: `No field with key "${fieldKey}" exists in the database`
      });
    }
    
    const fieldId = field.id;
    
    // Determine response status
    let status: keyof typeof KYBFieldStatus = 'EMPTY';
    if (value !== null && value !== undefined && value !== '') {
      status = 'COMPLETE';
    }
    
    // Check if a response already exists for this field
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
      await db.update(ky3pResponses)
        .set({
          response_value: value,
          status,
          updated_at: new Date()
        })
        .where(eq(ky3pResponses.id, existingResponse.id));
    } else {
      // Create new response
      await db.insert(ky3pResponses)
        .values({
          task_id: taskId,
          field_id: fieldId,
          response_value: value,
          status,
          created_at: new Date(),
          updated_at: new Date()
        });
    }
    
    // Update task progress if not already submitted
    const [currentTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (currentTask && currentTask.status !== 'submitted') {
      // Calculate progress based on total number of fields and completed fields
      const [{ total }] = await db
        .select({ total: db.fn.count() })
        .from(ky3pFields);
      
      const [{ completed }] = await db
        .select({ completed: db.fn.count() })
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            eq(ky3pResponses.status, 'COMPLETE')
          )
        );
      
      const progress = Math.min(Math.round((completed / total) * 100), 99);
      const newStatus = progress > 0 ? 'in_progress' : 'not_started';
      
      // Update task progress
      await db.update(tasks)
        .set({
          progress,
          status: newStatus,
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
      
      // Broadcast the update
      try {
        const { broadcastTaskUpdate } = await import('../services/websocket.js');
        await broadcastTaskUpdate(taskId);
        
        const { broadcastProgressUpdate } = await import('../utils/progress');
        await broadcastProgressUpdate(taskId, progress);
      } catch (wsError) {
        logger.error('[KY3P API] Failed to broadcast WebSocket update for progress:', wsError);
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      fieldKey,
      fieldId,
      message: 'Response saved successfully' 
    });
  } catch (error) {
    logger.error('[KY3P API] Error saving response by field key:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Save a KY3P response for a field
 */
router.post('/api/tasks/:taskId/ky3p-responses/:fieldId', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    // Parse values with thorough validation and error handling
    const taskIdRaw = req.params.taskId;
    const fieldIdRaw = req.params.fieldId;
    const { response_value } = req.body;
    
    // Log the incoming request parameters
    logger.debug(`[KY3P API] Processing single response:`, {
      taskIdRaw,
      fieldIdRaw,
      responseValue: typeof response_value === 'object' 
        ? JSON.stringify(response_value).substring(0, 100) 
        : String(response_value).substring(0, 100),
      responseValueType: typeof response_value
    });
    
    // Ensure we have valid integer IDs
    let taskId: number;
    let fieldId: number;
    
    try {
      taskId = parseInt(taskIdRaw);
      if (isNaN(taskId)) {
        return res.status(400).json({ 
          message: 'Invalid task ID format'
        });
      }
    } catch (error) {
      logger.error(`[KY3P API] Failed to parse taskId "${taskIdRaw}"`, error);
      return res.status(400).json({ 
        message: 'Invalid task ID format'
      });
    }
    
    try {
      fieldId = parseInt(fieldIdRaw);
      if (isNaN(fieldId)) {
        return res.status(400).json({ 
          message: 'Invalid field ID format'
        });
      }
    } catch (error) {
      logger.error(`[KY3P API] Failed to parse fieldId "${fieldIdRaw}"`, error);
      return res.status(400).json({ 
        message: 'Invalid field ID format'
      });
    }
    
    // For debugging field type mismatches
    const [fieldDefinition] = await db
      .select()
      .from(ky3pFields)
      .where(eq(ky3pFields.id, fieldId))
      .limit(1);
    
    if (!fieldDefinition) {
      logger.error(`[KY3P API] Field ID ${fieldId} not found in database`);
      return res.status(404).json({
        message: 'Field not found',
        details: `No field with ID ${fieldId} exists in the database`
      });
    }
    
    // Determine the status of the response based on the value
    let status: keyof typeof KYBFieldStatus = 'EMPTY';
    
    // If we have a response value that's not empty or undefined
    if (response_value !== null && response_value !== undefined && response_value !== '') {
      status = 'COMPLETE';
    } else {
      status = 'EMPTY';
    }
    
    // Get current task to check its status
    const [currentTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
      
    // If task is already submitted, just save the response but don't change task status
    if (currentTask && currentTask.status === 'submitted') {
      logger.info(`[KY3P API] Task ${taskId} is already submitted, saving response but keeping submission status`);
      
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
      
      // For submitted tasks, ensure metadata has the submitted status marker
      if (!currentTask.metadata?.status || currentTask.metadata.status !== 'submitted') {
        await db
          .update(tasks)
          .set({
            metadata: {
              ...currentTask.metadata,
              status: 'submitted',
              lastStatusUpdate: new Date().toISOString()
            },
            updated_at: new Date()
          })
          .where(eq(tasks.id, taskId));
          
        logger.info(`[KY3P API] Added 'submitted' status flag to task ${taskId} metadata`);
      }
      
      return res.json(responseResult[0]);
    }
    
    // Normal flow for non-submitted tasks
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
          eq(ky3pResponses.status, "COMPLETE")
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
      .where(
        and(
          eq(tasks.id, taskId),
          // Never revert a task from submitted status to anything else
          ne(tasks.status, 'submitted')
        )
      );
    
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
    const userId = req.user!.id;
    
    // Extract form data from request body if available
    const { formData } = req.body;
    
    // Get the task data
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const companyId = task.company_id;
    
    // Get company information for the file metadata
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    // Get all KY3P field definitions
    const allFields = await db
      .select()
      .from(ky3pFields);
    
    // ENHANCEMENT: Process any pending form data updates before CSV creation
    // This ensures the CSV file contains the latest data, including auto-filled values
    if (formData && typeof formData === 'object') {
      logger.info(`[KY3P API] Synchronizing form data from submission request for task ${taskId}`, {
        fieldCount: Object.keys(formData).length
      });
      
      try {
        // Get field key to ID mapping
        const fieldKeyToIdMap = new Map(allFields.map(field => [field.field_key, field.id]));
        
        // Track how many fields we update
        let fieldUpdatesCount = 0;
        
        // Process each field in the form data
        for (const [fieldKey, value] of Object.entries(formData)) {
          const fieldId = fieldKeyToIdMap.get(fieldKey);
          
          if (!fieldId) {
            logger.warn(`[KY3P API] Field key not found during pre-submission sync: ${fieldKey}`);
            continue;
          }
          
          // Value sanitization - convert to string and handle null/undefined
          const sanitizedValue = value !== null && value !== undefined ? String(value) : '';
          
          // Determine field status based on value
          const status = sanitizedValue ? 'COMPLETE' : 'EMPTY';
          
          try {
            // Check if response already exists for this field
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
                  response_value: sanitizedValue,
                  status: status as any,
                  version: existingResponse.version + 1,
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
                  response_value: sanitizedValue,
                  status: status as any,
                  version: 1,
                  created_at: new Date(),
                  updated_at: new Date()
                });
            }
            
            fieldUpdatesCount++;
          } catch (updateError) {
            logger.error(`[KY3P API] Error updating field ${fieldKey} during pre-submission sync:`, updateError);
          }
        }
        
        logger.info(`[KY3P API] Pre-submission sync complete: updated ${fieldUpdatesCount} fields`);
      } catch (syncError) {
        logger.error(`[KY3P API] Error during pre-submission form data sync:`, syncError);
        // Continue with CSV generation even if sync fails
      }
    }
    
    // Get all KY3P responses for this task AFTER any updates above
    const responses = await db
      .select()
      .from(ky3pResponses)
      .where(eq(ky3pResponses.task_id, taskId));
    
    // Format the data for file creation
    const formattedData: Record<string, any> = {};
    
    // Build a map of field ID to field metadata
    const fieldMap = new Map<number, typeof ky3pFields.$inferSelect>();
    allFields.forEach(field => {
      fieldMap.set(field.id, field);
    });
    
    // Add all responses to the formatted data
    responses.forEach(response => {
      const field = fieldMap.get(response.field_id);
      if (field) {
        // Always include the field even if response_value is empty
        // This ensures all answered questions appear in the CSV, even if answered with empty string
        formattedData[field.field_key] = response.response_value || '';
      }
    });
    
    // For debugging, log the number of responses
    console.log(`[KY3P API] Total responses for task ${taskId}: ${responses.length}`);
    console.log(`[KY3P API] Total fields added to formattedData: ${Object.keys(formattedData).length}`);
    
    console.log(`[KY3P API] Creating KY3P assessment file for task ${taskId}`);
    
    // Generate a file from the form data
    const { fileCreationService } = await import('../services/fileCreation');
    const fileResult = await fileCreationService.createTaskFile(
      userId,
      companyId,
      formattedData,
      {
        taskType: 'sp_ky3p_assessment',
        taskId,
        companyName: company.name,
        additionalData: {
          fields: allFields
        }
      }
    );
    
    if (!fileResult.success) {
      logger.error('Failed to create KY3P file', {
        error: fileResult.error,
        taskId,
        companyId
      });
    }
    
    // Update the task status and include the file ID in metadata
    // Store under both ky3pFormFile and securityFormFile keys for backward compatibility
    const updatedMetadata = {
      ...task.metadata,
      ky3pFormFile: fileResult.success ? fileResult.fileId : undefined,
      securityFormFile: fileResult.success ? fileResult.fileId : undefined // For backward compatibility
    };
    
    // Add logging for file information
    if (fileResult.success) {
      console.log(`[KY3P API] File generated successfully:`, {
        fileId: fileResult.fileId,
        fileName: fileResult.fileName,
        taskId,
        companyId
      });
    }
    
    // Get current date for consistent timestamps
    const submissionDate = new Date();
    
    // Add submission metadata markers that match KYB task format
    const enhancedMetadata = {
      ...updatedMetadata,
      status: 'submitted', // Explicit status flag
      submissionDate: submissionDate.toISOString(), // Match KYB format
      lastStatusUpdate: submissionDate.toISOString(),
      ky3pSubmitted: true, // Add explicit KY3P flag for queries
    };
    
    // Update the task with completion data and file reference
    // Make sure to mark it as submitted and include the file reference
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: 'submitted',
        completion_date: submissionDate,
        progress: 100, // Set to 100% explicitly
        updated_at: submissionDate,
        metadata: enhancedMetadata as any
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    console.log(`[KY3P API] Successfully submitted KY3P assessment for task ${taskId}`, {
      fileId: fileResult.success ? fileResult.fileId : undefined,
      fileName: fileResult.success ? fileResult.fileName : undefined,
      metadata: enhancedMetadata
    });
    
    // Broadcast update via the standard progress update utility
    try {
      const { broadcastProgressUpdate } = await import('../utils/progress');
      broadcastProgressUpdate(
        taskId, 
        100,
        'submitted',
        enhancedMetadata
      );
      logger.info(`[KY3P API] Broadcast task update with submission status`);
    } catch (wsError) {
      logger.error('[KY3P API] Failed to broadcast submission status update:', wsError);
    }
    
    // Unlock any dependent tasks (like CARD or Open Banking Survey tasks)
    await unlockDependentTasks(task.company_id, taskId, req.user?.id);
    logger.info(`[KY3P API] Checked for dependent tasks to unlock after KY3P submission`);
    
    // Structure the response with completedActions similar to KYB submission
    const completedActions = [
      {
        type: "task_completion", 
        description: "Task Completed",
        data: {
          details: "Your S&P KY3P Security Assessment has been successfully submitted."
        }
      }
    ];
    
    // Add file generation action if the file was created successfully
    if (fileResult.success && fileResult.fileId) {
      // Log file info for debugging
      console.log(`[KY3P API] Adding file to completedActions:`, {
        fileId: fileResult.fileId,
        fileName: fileResult.fileName
      });
      
      // Add file info to completedActions in the format expected by UniversalSuccessModal
      completedActions.push({
        type: "file_generation",
        description: "CSV File Generated",
        fileId: fileResult.fileId, // This is required for the modal to display file
        data: {
          details: `A CSV file containing your S&P KY3P responses has been saved to the File Vault.`,
          fileId: fileResult.fileId, // This is also needed for the file download button
          buttonText: "Download CSV" // Optional custom button text
        }
      });
    } else {
      console.log(`[KY3P API] File creation failed or no fileId returned:`, fileResult);
    }
    
    res.json({
      ...updatedTask,
      fileId: fileResult.success ? fileResult.fileId : undefined,
      completedActions
    });
  } catch (error) {
    logger.error('Error submitting KY3P task:', error);
    res.status(500).json({ message: 'Error submitting KY3P task' });
  }
});

/**
 * Special bulk update endpoint that handles mixed request formats
 * This fixes client issues with direct /bulk requests
 */
router.post('/api/ky3p-bulk-update/:taskId', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    const { taskId: taskIdRaw } = req.params;
    
    // Log the request for debugging
    logger.info(`[KY3P API] Received dedicated bulk update request for task ${taskIdRaw}`, {
      reqBodyKeys: Object.keys(req.body),
      hasResponses: !!req.body.responses
    });
    
    let taskId: number;
    try {
      taskId = parseInt(taskIdRaw);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: 'Invalid task ID format' });
      }
    } catch (error) {
      logger.error(`[KY3P API] Failed to parse taskId "${taskIdRaw}"`, error);
      return res.status(400).json({ message: 'Invalid task ID format' });
    }
    
    // Validate response object
    const { responses } = req.body;
    
    if (!responses) {
      return res.status(400).json({
        message: 'Invalid request: responses is required',
        hint: 'Request should include a responses property that is either an object or array'
      });
    }
    
    // Get all fields for field type validation and ID mapping
    const fields = await db.select().from(ky3pFields);
    
    // Create useful maps for field lookup
    const fieldKeyToIdMap = new Map(fields.map(field => [field.field_key, field.id]));
    const fieldIdToTypeMap = new Map(fields.map(field => [field.id, field.field_type]));
    
    // Import the safe type conversion utility
    const { safeTypeConversion } = await import('../utils/form-standardization');
    
    // Store all response updates to process
    const responseUpdates = [];
    
    // Process responses based on format
    if (Array.isArray(responses)) {
      // Handle array format (from newer KY3P form service)
      logger.info(`[KY3P API] Processing bulk responses in array format for task ${taskId}`, {
        responseCount: responses.length,
        taskId
      });
      
      for (const response of responses) {
        try {
          const fieldId = Number(response.fieldId);
          
          if (isNaN(fieldId)) {
            logger.error(`[KY3P API] Invalid field ID in array format: ${response.fieldId}`);
            continue;
          }
          
          const fieldDef = fields.find(f => f.id === fieldId);
          if (!fieldDef) {
            logger.error(`[KY3P API] Field ID not found in database: ${fieldId}`);
            continue;
          }
          
          const fieldType = fieldDef.field_type || 'TEXT';
          const responseValue = response.value;
          
          // Convert and validate value
          const sanitizedValue = safeTypeConversion(responseValue, fieldType, {
            fieldKey: fieldDef.field_key,
            fieldName: fieldDef.display_name,
            formType: 'ky3p'
          });
          
          // Store as string for consistency
          const finalValue = String(sanitizedValue);
          
          // Determine status based on value
          const status = (finalValue !== null && finalValue !== undefined && finalValue.trim() !== '') 
            ? 'COMPLETE' 
            : 'EMPTY';
          
          // Check if response exists
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
          
          // Prepare update query
          if (existingResponse) {
            responseUpdates.push(
              db.update(ky3pResponses)
                .set({
                  response_value: finalValue,
                  status,
                  version: existingResponse.version + 1,
                  updated_at: new Date()
                })
                .where(eq(ky3pResponses.id, existingResponse.id))
            );
          } else {
            responseUpdates.push(
              db.insert(ky3pResponses)
                .values({
                  task_id: taskId,
                  field_id: fieldId,
                  response_value: finalValue,
                  status,
                  version: 1,
                  created_at: new Date(),
                  updated_at: new Date()
                })
            );
          }
        } catch (fieldError) {
          // Log but continue processing other fields
          logger.error(`[KY3P API] Error processing field in array format:`, fieldError);
          continue;
        }
      }
    } else if (typeof responses === 'object') {
      // Handle object format (from older KYB form service)
      const fieldEntries = Object.entries(responses);
      
      logger.info(`[KY3P API] Processing bulk responses in object format for task ${taskId}`, {
        responseCount: fieldEntries.length,
        taskId
      });
      
      for (const [fieldKey, value] of fieldEntries) {
        try {
          // Look up field ID from key
          const fieldId = fieldKeyToIdMap.get(fieldKey);
          
          if (!fieldId) {
            logger.warn(`[KY3P API] Field key not found in database: ${fieldKey}`);
            continue;
          }
          
          const fieldType = fieldIdToTypeMap.get(fieldId) || 'TEXT';
          
          // Convert and validate value
          const sanitizedValue = safeTypeConversion(value, fieldType, {
            fieldKey,
            formType: 'ky3p'
          });
          
          // Store as string for consistency
          const finalValue = String(sanitizedValue);
          
          // Determine status based on value
          const status = (finalValue !== null && finalValue !== undefined && finalValue.trim() !== '') 
            ? 'COMPLETE' 
            : 'EMPTY';
          
          // Check if response exists
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
          
          // Prepare update query
          if (existingResponse) {
            responseUpdates.push(
              db.update(ky3pResponses)
                .set({
                  response_value: finalValue,
                  status,
                  version: existingResponse.version + 1,
                  updated_at: new Date()
                })
                .where(eq(ky3pResponses.id, existingResponse.id))
            );
          } else {
            responseUpdates.push(
              db.insert(ky3pResponses)
                .values({
                  task_id: taskId,
                  field_id: fieldId,
                  response_value: finalValue,
                  status,
                  version: 1,
                  created_at: new Date(),
                  updated_at: new Date()
                })
            );
          }
        } catch (fieldError) {
          // Log but continue processing other fields
          logger.error(`[KY3P API] Error processing field in object format:`, fieldError);
          continue;
        }
      }
    } else {
      logger.error(`[KY3P API] Unsupported responses format: ${typeof responses}`);
      return res.status(400).json({
        message: 'Invalid responses format',
        hint: 'The responses property must be either an array or an object'
      });
    }
    
    // Process all response updates in parallel
    if (responseUpdates.length > 0) {
      await Promise.all(responseUpdates.map(query => query));
    }
    
    // Return success response
    res.json({
      success: true,
      updatedFields: responseUpdates.length,
      format: Array.isArray(responses) ? 'array' : 'object'
    });
  } catch (error) {
    logger.error('[KY3P API] Error in dedicated bulk update endpoint:', error);
    res.status(500).json({ message: 'Error processing bulk update' });
  }
});

/**
 * Bulk update KY3P responses for a task
 * This is used primarily by the auto-fill functionality
 */
router.post('/api/tasks/:taskId/ky3p-responses/bulk', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    // Parse taskId with validation
    const taskIdRaw = req.params.taskId;
    let taskId: number;
    
    try {
      taskId = parseInt(taskIdRaw);
      if (isNaN(taskId)) {
        return res.status(400).json({ 
          message: 'Invalid task ID format'
        });
      }
    } catch (error) {
      logger.error(`[KY3P API] Failed to parse taskId "${taskIdRaw}"`, error);
      return res.status(400).json({ 
        message: 'Invalid task ID format'
      });
    }
    
    // Check if the request is valid
    logger.debug(`[KY3P API] Processing bulk request body:`, {
      bodyKeys: Object.keys(req.body),
      hasResponses: req.body && req.body.responses ? 'yes' : 'no',
      requestBodyPreview: JSON.stringify(req.body).substring(0, 200)
    });
    
    // Special handling for requests with 'fieldIdRaw': 'bulk' pattern - used to identify malformed requests
    if (req.body && req.body.fieldIdRaw === 'bulk') {
      logger.warn(`[KY3P API] Detected malformed bulk request with fieldIdRaw=bulk pattern`, {
        taskIdRaw: req.body.taskIdRaw,
        fieldIdRaw: req.body.fieldIdRaw,
        responseValue: req.body.responseValue,
        responseValueType: typeof req.body.responseValue
      });
      
      return res.status(400).json({
        message: 'Invalid field ID format',
        hint: 'Request should be in format: { responses: [...] }',
        error: 'malformed_request_structure'
      });
    }
    
    // Validate response object
    const { responses } = req.body;
    
    if (!responses) {
      return res.status(400).json({ 
        message: 'Invalid request: responses is required',
        hint: 'Request should include a responses property that is either an object or array'
      });
    }
    
    // Get all fields for field type validation and ID mapping
    const fields = await db.select().from(ky3pFields);
    
    // Create useful maps for field lookup
    const fieldKeyToIdMap = new Map(fields.map(field => [field.field_key, field.id]));
    const fieldIdToTypeMap = new Map(fields.map(field => [field.id, field.field_type]));
    
    // Import the safe type conversion utility
    const { safeTypeConversion } = await import('../utils/form-standardization');
    
    // Store all response updates to process
    const responseUpdates = [];
    
    // Handle array format (from KY3P form service)
    if (Array.isArray(responses)) {
      logger.info(`[KY3P API] Processing bulk responses in array format for task ${taskId}`, {
        responseCount: responses.length,
        taskId,
        format: 'array',
        sampleResponses: responses.slice(0, 3).map(r => 
          JSON.stringify({ 
            fieldId: r.fieldId, 
            valuePreview: typeof r.value === 'object' ? '[Object]' : String(r.value).slice(0, 20) 
          }).slice(0, 100)
        )
      });
      
      for (const response of responses) {
        const fieldId = Number(response.fieldId);
        
        if (isNaN(fieldId)) {
          logger.error(`[KY3P API] Invalid field ID in array format: ${response.fieldId}`);
          continue;
        }
        
        const fieldDef = fields.find(f => f.id === fieldId);
        if (!fieldDef) {
          logger.error(`[KY3P API] Field ID not found in database: ${fieldId}`);
          continue;
        }
        
        const fieldType = fieldDef.field_type || 'TEXT';
        const responseValue = response.value;
        
        // Convert and validate value
        const sanitizedValue = safeTypeConversion(responseValue, fieldType, {
          fieldKey: fieldDef.field_key,
          fieldName: fieldDef.display_name,
          formType: 'ky3p'
        });
        
        // Store as string for consistency
        const finalValue = String(sanitizedValue);
        
        // Determine status based on value
        const status = (finalValue !== null && finalValue !== undefined && finalValue.trim() !== '') 
          ? 'COMPLETE' 
          : 'EMPTY';
          
        // Check if response exists
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
        
        // Prepare update query
        if (existingResponse) {
          responseUpdates.push(
            db.update(ky3pResponses)
              .set({
                response_value: finalValue,
                status,
                version: existingResponse.version + 1,
                updated_at: new Date()
              })
              .where(eq(ky3pResponses.id, existingResponse.id))
          );
        } else {
          responseUpdates.push(
            db.insert(ky3pResponses)
              .values({
                task_id: taskId,
                field_id: fieldId,
                response_value: finalValue,
                status,
                version: 1,
                created_at: new Date(),
                updated_at: new Date()
              })
          );
        }
      }
    } 
    // Handle object format (backward compatibility)
    else if (typeof responses === 'object') {
      logger.info(`[KY3P API] Processing bulk responses in object format for task ${taskId}`, {
        responseCount: Object.keys(responses).length,
        taskId,
        format: 'object',
        firstKeys: Object.keys(responses).slice(0, 3),
        firstValues: Object.values(responses).slice(0, 3).map(v => 
          typeof v === 'object' ? JSON.stringify(v).slice(0, 50) : String(v).slice(0, 50)
        )
      });
      
      for (const [fieldKey, responseValue] of Object.entries(responses)) {
        try {
          const rawFieldId = fieldKeyToIdMap.get(fieldKey);
          
          if (!rawFieldId) {
            logger.warn(`[KY3P API] Field key not found: ${fieldKey}`);
            continue;
          }
          
          const fieldId = Number(rawFieldId);
          if (isNaN(fieldId)) {
            logger.error(`[KY3P API] Invalid field ID for key ${fieldKey}: ${rawFieldId}`);
            continue;
          }
          
          // Find the field definition to get its type
          const fieldDefinition = fields.find(field => field.field_key === fieldKey);
          const fieldType = fieldDefinition?.field_type || 'TEXT';
          
          // Use the safe type conversion utility with enhanced logging
          const sanitizedValue = safeTypeConversion(responseValue, fieldType, {
            fieldKey,
            fieldName: fieldDefinition?.display_name,
            formType: 'ky3p'
          });
          
          // Always store as string in database for consistency
          const finalValue = String(sanitizedValue);
          
          // Determine status based on value
          const status = (finalValue !== null && finalValue !== undefined && finalValue.trim() !== '') 
            ? 'COMPLETE' 
            : 'EMPTY';
          
          // Check if response exists
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
          
          // Prepare update query
          if (existingResponse) {
            responseUpdates.push(
              db.update(ky3pResponses)
                .set({
                  response_value: finalValue,
                  status,
                  version: existingResponse.version + 1,
                  updated_at: new Date()
                })
                .where(eq(ky3pResponses.id, existingResponse.id))
            );
          } else {
            responseUpdates.push(
              db.insert(ky3pResponses)
                .values({
                  task_id: taskId,
                  field_id: fieldId,
                  response_value: finalValue,
                  status,
                  version: 1,
                  created_at: new Date(),
                  updated_at: new Date()
                })
            );
          }
        } catch (fieldError) {
          // Log but continue processing other fields
          logger.error(`[KY3P API] Error processing field ${fieldKey}:`, fieldError);
          continue;
        }
      }
    }
    
    // Execute all updates
    if (responseUpdates.length > 0) {
      for (const update of responseUpdates) {
        await update;
      }
    }
    
    // Calculate new progress
    const requiredFields = await db
      .select()
      .from(ky3pFields)
      .where(eq(ky3pFields.is_required, true));
    
    const totalRequiredFields = requiredFields.length;
    
    const completedResponses = await db
      .select()
      .from(ky3pResponses)
      .where(
        and(
          eq(ky3pResponses.task_id, taskId),
          eq(ky3pResponses.status, "COMPLETE")
        )
      );
    
    const completedRequiredFields = completedResponses.length;
    
    // Calculate progress as a percentage
    const progress = totalRequiredFields > 0 
      ? Math.min(100, Math.round((completedRequiredFields / totalRequiredFields) * 100)) / 100
      : 0;
    
    // Get current task to check if it's already submitted
    const [currentTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
      
    let finalProgress = progress;
    let finalStatus = progress >= 1 ? 'ready_for_submission' : 'in_progress';
    let updatedTask;
    
    // If task is already submitted, don't change the status or progress
    if (currentTask && currentTask.status === 'submitted') {
      logger.info(`[KY3P API] Task ${taskId} is already submitted, preserving status and progress`);
      
      // Maintain submitted status but update timestamp
      [updatedTask] = await db
        .update(tasks)
        .set({
          updated_at: new Date(),
          // Ensure metadata has the submitted flag
          metadata: {
            ...currentTask.metadata,
            status: 'submitted',
          }
        })
        .where(eq(tasks.id, taskId))
        .returning();
        
      finalStatus = 'submitted';
      finalProgress = 100;
    } else {
      // Normal progress update for non-submitted tasks
      [updatedTask] = await db
        .update(tasks)
        .set({
          progress,
          status: finalStatus,
          updated_at: new Date()
        })
        .where(
          and(
            eq(tasks.id, taskId),
            // Never revert a task from submitted status to anything else
            ne(tasks.status, 'submitted')
          )
        )
        .returning();
    }
    
    // Get all updated responses to return
    const allResponses = await db
      .select({
        id: ky3pResponses.id,
        fieldId: ky3pResponses.field_id,
        value: ky3pResponses.response_value,
        status: ky3pResponses.status
      })
      .from(ky3pResponses)
      .where(eq(ky3pResponses.task_id, taskId));
    
    // Use the enhanced broadcast utility for consistent messaging
    try {
      const { broadcastProgressUpdate } = await import('../utils/progress');
      broadcastProgressUpdate(
        taskId,
        finalProgress,
        finalStatus,
        updatedTask.metadata
      );
      logger.info(`[KY3P API] Progress update broadcast sent: ${finalStatus} (${finalProgress}%)`);
    } catch (wsError) {
      logger.error('[KY3P API] Failed to broadcast progress update:', wsError);
    }
    
    res.json({
      success: true,
      updatedFields: Object.keys(responses).length,
      progress,
      status: updatedTask.status,
      responses: allResponses
    });
  } catch (error) {
    logger.error('[KY3P API] Error updating responses in bulk:', error);
    res.status(500).json({ message: 'Error updating responses in bulk' });
  }
});

/**
 * Debug endpoint to diagnose bulk update issues
 */
router.post('/api/ky3p/debug-bulk', async (req, res) => {
  try {
    // Log the full request body for debugging
    console.log('[DEBUG] KY3P Bulk Update Debug Endpoint:', {
      bodyKeys: Object.keys(req.body),
      hasResponses: req.body && req.body.responses ? 'yes' : 'no',
      bodyType: typeof req.body,
      responsesType: req.body.responses ? typeof req.body.responses : 'not present',
      isResponsesArray: req.body.responses ? Array.isArray(req.body.responses) : 'not present',
      responsesLength: req.body.responses ? 
        (Array.isArray(req.body.responses) ? req.body.responses.length : Object.keys(req.body.responses).length) : 
        'not present',
      sampleData: req.body.responses ? 
        (Array.isArray(req.body.responses) ? 
          req.body.responses.slice(0, 2) : 
          Object.entries(req.body.responses).slice(0, 2)) : 
        'not present',
      fullBody: JSON.stringify(req.body).substring(0, 1000) // Limit to avoid huge logs
    });
    
    res.json({ 
      success: true, 
      message: 'Debug info logged to server console',
      requestInfo: {
        bodyKeys: Object.keys(req.body),
        hasResponses: req.body && req.body.responses ? true : false
      }
    });
  } catch (error) {
    logger.error('[KY3P Debug] Error processing debug request:', error);
    res.status(500).json({ message: 'Error processing debug request' });
  }
});

/**
 * Endpoint to provide demo data for auto-filling KY3P forms
 */
router.get('/api/ky3p/demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      logger.error('Unauthenticated user attempted to access demo auto-fill');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to use this feature'
      });
    }
    
    const { taskId } = req.params;
    logger.info('KY3P Demo auto-fill requested for task', { taskId, userId: req.user.id });
    
    // Get the task to retrieve company information
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId, 10)));
      
    if (!task) {
      logger.error('Task not found for KY3P demo auto-fill', { taskId });
      return res.status(404).json({ 
        error: 'Task not found',
        message: 'Could not find the specified task for auto-filling'
      });
    }
    
    // CRITICAL SECURITY CHECK: Verify user belongs to company that owns the task
    if (req.user.company_id !== task.company_id) {
      logger.error('Security violation: User attempted to access task from another company', {
        userId: req.user.id,
        userCompanyId: req.user.company_id,
        taskId: task.id,
        taskCompanyId: task.company_id
      });
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this task'
      });
    }
    
    // Check if the company associated with this task is a demo company
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, task.company_id));
      
    // Ensure we're explicitly checking for true, not just truthy values 
    if (!company || company.is_demo !== true) {
      logger.error('Company is not a demo company', { 
        taskId, 
        companyId: task.company_id,
        isDemo: company?.is_demo
      });
      
      return res.status(403).json({
        error: 'Not a demo company',
        message: 'Auto-fill is only available for demo companies'
      });
    }
    
    // Get all KY3P fields with explicit selection of the demo_autofill column
    const fields = await db.select({
      id: ky3pFields.id,
      field_key: ky3pFields.field_key,
      display_name: ky3pFields.display_name,
      field_type: ky3pFields.field_type,
      question: ky3pFields.question,
      group: ky3pFields.group,
      required: ky3pFields.is_required,
      order: ky3pFields.order,
      step_index: ky3pFields.step_index,
      validation_rules: ky3pFields.validation_rules,
      help_text: ky3pFields.help_text,
      demo_autofill: ky3pFields.demo_autofill // Explicitly select demo_autofill
    })
      .from(ky3pFields)
      .orderBy(asc(ky3pFields.order));
    
    logger.info('Fetched fields for KY3P demo auto-fill', {
      fieldCount: fields.length,
      taskId
    });
    
    // Create demo data for each field using predefined demo_autofill values from the database
    const demoData: Record<string, any> = {};
    
    // Get current user information for personalized values
    let userEmail = '';
    if (req.user) {
      userEmail = req.user.email;
    }
    
    // Log the first few fields to debug with explicit column check
    console.log('[KY3P Demo Auto-Fill] First 5 fields from database:');
    
    // Inspect the raw database results to verify the structure
    const rawFields = fields.slice(0, 5);
    console.log('[KY3P Demo Auto-Fill] Raw field objects:', rawFields);
    
    // Import the safe type conversion utility
    const { safeTypeConversion } = await import('../utils/form-standardization');
    
    for (const field of fields) {
      const fieldKey = field.field_key;
      let rawValue: any = null;
      
      // Use the demo_autofill value directly from the database
      if (field.demo_autofill !== null && field.demo_autofill !== undefined) {
        // For fields that might contain company name references
        if (typeof field.demo_autofill === 'string' && field.demo_autofill.includes('{{COMPANY_NAME}}')) {
          rawValue = field.demo_autofill.replace('{{COMPANY_NAME}}', company.name);
          logger.info(`[KY3P Demo Auto-Fill] Replaced template in ${fieldKey}: ${rawValue}`);
        } else {
          // Use the predefined value from the database
          rawValue = field.demo_autofill;
          logger.info(`[KY3P Demo Auto-Fill] Used database value for ${fieldKey}: ${rawValue}`);
        }
      } 
      // Fallback for any fields without defined demo values
      else {
        // Generate a basic fallback value based on field type
        logger.info(`[KY3P Demo Auto-Fill] No demo_autofill value found for ${fieldKey}`);
        
        switch (field.field_type?.toUpperCase()) {
          case 'TEXTAREA':
            rawValue = `This is a sample response for ${field.display_name || fieldKey}.`;
            break;
          case 'EMAIL':
            rawValue = userEmail || 'demo@example.com';
            break;
          case 'NUMBER':
            rawValue = '123';
            break;
          case 'DATE':
            rawValue = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            break;
          case 'CHECKBOX':
          case 'BOOLEAN':
            rawValue = true;
            break;
          case 'SELECT':
          case 'DROPDOWN':
          case 'TEXT':
          default:
            rawValue = `Demo value for ${field.display_name || fieldKey}`;
            break;
        }
      }
      
      // Use safe type conversion to ensure value matches field type
      // This prevents PostgreSQL type conversion errors (22P02)
      demoData[fieldKey] = safeTypeConversion(rawValue, field.field_type || 'TEXT', {
        fieldKey,
        fieldName: field.display_name,
        formType: 'ky3p'
      });
    }
    
    logger.info('KY3P Demo auto-fill data generated', {
      fieldCount: Object.keys(demoData).length,
      taskId
    });
    
    res.json(demoData);
  } catch (error) {
    logger.error('Error generating KY3P demo auto-fill data:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred while generating demo data'
    });
  }
});

/**
 * Apply demo data for KY3P form - completely standalone solution that bypasses form service
 * This endpoint handles both retrieving and applying demo data in one request
 */
router.post('/api/ky3p/apply-demo-data/:taskId', requireAuth, async (req, res) => {
  try {
    // Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get taskId and parse it
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }
    
    // Get the task to verify access
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
      
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Verify user has access to this task
    if (task.assigned_to !== req.user.id && 
        task.created_by !== req.user.id && 
        task.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get company information
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, task.company_id))
      .limit(1);
      
    // Get all KY3P fields with their demo_autofill data
    const fields = await db.select()
      .from(ky3pFields);
      
    logger.info('[KY3P API] Applying demo data for task', { 
      taskId, 
      userId: req.user.id,
      fieldCount: fields.length,
      company: company?.name
    });
    
    let successCount = 0;
    let errorCount = 0;
    const demoData: Record<string, any> = {};
    
    // Process each field
    for (const field of fields) {
      if (!field.demo_autofill) continue;
      
      try {
        // Add to the demo data object for client-side display
        let demoValue = field.demo_autofill;
        
        // Replace company name placeholder if needed
        if (typeof demoValue === 'string' && demoValue.includes('{{COMPANY_NAME}}') && company) {
          demoValue = demoValue.replace('{{COMPANY_NAME}}', company.name);
        }
        
        demoData[field.field_key] = demoValue;
        
        // Save the response
        const [existingResponse] = await db.select()
          .from(ky3pResponses)
          .where(
            and(
              eq(ky3pResponses.task_id, taskId),
              eq(ky3pResponses.field_id, field.id)
            )
          )
          .limit(1);
          
        // Determine status
        const status: keyof typeof KYBFieldStatus = 'COMPLETE';
        
        if (existingResponse) {
          // Update existing response
          await db.update(ky3pResponses)
            .set({
              response_value: demoValue,
              status,
              updated_at: new Date()
            })
            .where(eq(ky3pResponses.id, existingResponse.id));
        } else {
          // Create new response
          await db.insert(ky3pResponses)
            .values({
              task_id: taskId,
              field_id: field.id,
              response_value: demoValue,
              status,
              created_at: new Date(),
              updated_at: new Date()
            });
        }
        
        successCount++;
      } catch (error) {
        errorCount++;
        logger.error('[KY3P API] Error applying demo data for field:', { 
          fieldKey: field.field_key, 
          error
        });
      }
    }
    
    // Calculate progress
    const [{ total }] = await db
      .select({ total: db.fn.count() })
      .from(ky3pFields);
      
    const [{ completed }] = await db
      .select({ completed: db.fn.count() })
      .from(ky3pResponses)
      .where(
        and(
          eq(ky3pResponses.task_id, taskId),
          eq(ky3pResponses.status, 'COMPLETE')
        )
      );
      
    const progress = Math.min(Math.round((completed / total) * 100), 99);
    
    // Update task status
    await db.update(tasks)
      .set({
        progress,
        status: progress > 0 ? 'in_progress' : 'not_started',
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId));
      
    // Broadcast updates
    try {
      const { broadcastTaskUpdate } = await import('../services/websocket.js');
      await broadcastTaskUpdate(taskId);
      
      const { broadcastProgressUpdate } = await import('../utils/progress');
      await broadcastProgressUpdate(taskId, progress);
    } catch (wsError) {
      logger.error('[KY3P API] Error broadcasting update:', wsError);
    }
    
    // Return successful response with demo data
    return res.status(200).json({
      success: true,
      message: `Applied demo data to ${successCount} fields`,
      data: demoData,
      progress,
      successCount,
      errorCount
    });
  } catch (error) {
    logger.error('[KY3P API] Error in apply-demo-data endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test endpoint to manually force-unlock a company card task (Open Banking Survey)
 * This is for debugging purposes to test task dependency chain
 */
router.post('/api/tasks/fix-company-card', async (req, res) => {
  try {
    const { taskId, companyId } = req.body;
    
    if (!taskId || !companyId) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }
    
    logger.info('[KY3P Fix] Unlocking company card task via endpoint', {
      taskId,
      companyId
    });
    
    // Execute the SQL query using psql directly
    const { exec } = await import('child_process');
    const cmd = `psql $DATABASE_URL -c "UPDATE tasks SET metadata = jsonb_set(metadata, '{locked}', 'false'), status = 'not_started' WHERE id = ${taskId};"`;
    
    exec(cmd, async (error, stdout, stderr) => {
      if (error) {
        logger.error('[KY3P Fix] SQL execution error:', error);
        return res.status(500).json({ message: 'SQL execution failed', error: error.message });
      }
      
      logger.info('[KY3P Fix] Task updated successfully, SQL output:', stdout);
      
      // Try to broadcast the update
      try {
        const broadcastCmd = `curl -X POST http://localhost:5000/api/tasks/${taskId}/broadcast`;
        exec(broadcastCmd);
        logger.info('[KY3P Fix] Broadcast initiated for task: ' + taskId);
      } catch (error) {
        logger.error('[KY3P Fix] Failed to broadcast task update:', error);
      }
      
      // Get the updated task
      const [updatedTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);
        
      res.json({ 
        success: true, 
        message: `Task ${taskId} unlocked successfully`,
        task: {
          id: updatedTask.id,
          status: updatedTask.status,
          isLocked: updatedTask.metadata?.locked === true,
          metadata: updatedTask.metadata
        }
      });
    });
  } catch (error) {
    logger.error('[KY3P Fix] Error in fix-company-card endpoint:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});



export default router;