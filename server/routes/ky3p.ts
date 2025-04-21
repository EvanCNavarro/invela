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
    const userId = req.user!.id;
    
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
    
    // Get all KY3P responses for this task
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
      if (field && response.response_value) {
        // Use field_key which is the correct property name from the db schema
        formattedData[field.field_key] = response.response_value;
      }
    });
    
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
    const updatedMetadata = {
      ...task.metadata,
      ky3pFormFile: fileResult.success ? fileResult.fileId : undefined
    };
    
    // Update the task with completion data and file reference
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: 'submitted',
        completion_date: new Date(),
        updated_at: new Date(),
        metadata: updatedMetadata as any
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    console.log(`[KY3P API] Successfully submitted KY3P assessment for task ${taskId}`, {
      fileId: fileResult.success ? fileResult.fileId : undefined,
      fileName: fileResult.success ? fileResult.fileName : undefined
    });
    
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
      completedActions.push({
        type: "file_generation",
        description: "CSV File Generated",
        fileId: fileResult.fileId,
        data: {
          details: `A CSV file containing your S&P KY3P responses has been saved to the File Vault.`,
          fileId: fileResult.fileId
        }
      });
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
 * Bulk update KY3P responses for a task
 * This is used primarily by the auto-fill functionality
 */
router.post('/api/tasks/:taskId/ky3p-responses/bulk', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { responses } = req.body;
    
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({ 
        message: 'Invalid request: responses object is required'
      });
    }
    
    logger.info(`[KY3P API] Processing bulk responses update for task ${taskId}`, {
      responseCount: Object.keys(responses).length
    });
    
    // Get all fields to match field_key to field_id
    const fields = await db.select().from(ky3pFields);
    const fieldKeyToIdMap = new Map(fields.map(field => [field.field_key, field.id]));
    
    // Store all response updates to process
    const responseUpdates = [];
    
    // Process each response
    for (const [fieldKey, responseValue] of Object.entries(responses)) {
      const fieldId = fieldKeyToIdMap.get(fieldKey);
      
      if (!fieldId) {
        logger.warn(`[KY3P API] Field key not found: ${fieldKey}`);
        continue;
      }
      
      // Determine status
      const status = responseValue ? 'complete' : 'empty';
      
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
      
      if (existingResponse) {
        // Update existing
        responseUpdates.push(
          db.update(ky3pResponses)
            .set({
              response_value: responseValue as string,
              status,
              version: existingResponse.version + 1,
              updated_at: new Date()
            })
            .where(eq(ky3pResponses.id, existingResponse.id))
        );
      } else {
        // Create new
        responseUpdates.push(
          db.insert(ky3pResponses)
            .values({
              task_id: taskId,
              field_id: fieldId,
              response_value: responseValue as string,
              status,
              version: 1,
              created_at: new Date(),
              updated_at: new Date()
            })
        );
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
      .where(ky3pFields.is_required);
    
    const totalRequiredFields = requiredFields.length;
    
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
    const [updatedTask] = await db
      .update(tasks)
      .set({
        progress,
        status: progress >= 1 ? 'ready_for_submission' : 'in_progress',
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
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
    
    // Broadcast WebSocket update for task progress
    try {
      const { broadcastTaskUpdate } = await import('../services/websocket.js');
      await broadcastTaskUpdate(updatedTask.id, updatedTask);
      logger.info(`[KY3P API] WebSocket broadcast sent for task ${taskId} progress update: ${progress}`);
    } catch (wsError) {
      logger.error('[KY3P API] Failed to broadcast WebSocket update:', wsError);
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
    
    for (const field of fields) {
      const fieldKey = field.field_key;
      
      // Use the demo_autofill value directly from the database
      if (field.demo_autofill !== null && field.demo_autofill !== undefined) {
        // For fields that might contain company name references
        if (typeof field.demo_autofill === 'string' && field.demo_autofill.includes('{{COMPANY_NAME}}')) {
          demoData[fieldKey] = field.demo_autofill.replace('{{COMPANY_NAME}}', company.name);
          console.log(`[KY3P Demo Auto-Fill] Replaced template in ${fieldKey}: ${demoData[fieldKey]}`);
        } else {
          // Use the predefined value from the database
          demoData[fieldKey] = field.demo_autofill;
          console.log(`[KY3P Demo Auto-Fill] Used database value for ${fieldKey}: ${demoData[fieldKey]}`);
        }
      } 
      // Fallback for any fields without defined demo values
      else {
        // Generate a basic fallback value based on field type
        console.log(`[KY3P Demo Auto-Fill] No demo_autofill value found for ${fieldKey}`);
        
        switch (field.field_type?.toUpperCase()) {
          case 'TEXTAREA':
            demoData[fieldKey] = `This is a sample response for ${field.display_name || fieldKey}.`;
            break;
          case 'EMAIL':
            demoData[fieldKey] = userEmail || 'demo@example.com';
            break;
          case 'NUMBER':
            demoData[fieldKey] = '123';
            break;
          case 'DATE':
            demoData[fieldKey] = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            break;
          case 'CHECKBOX':
          case 'BOOLEAN':
            demoData[fieldKey] = true;
            break;
          case 'SELECT':
          case 'DROPDOWN':
          case 'TEXT':
          default:
            demoData[fieldKey] = `Demo value for ${field.display_name || fieldKey}`;
            break;
        }
      }
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

export default router;