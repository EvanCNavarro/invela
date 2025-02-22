import { Router } from 'express';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { db } from '@db';
import { tasks, TaskStatus, kybFields, kybResponses } from '@db/schema';
import { eq, and, ilike } from 'drizzle-orm';

const router = Router();

// Debug utility for logging task data
const logTaskDebug = (stage: string, task: any, extras: Record<string, any> = {}) => {
  console.log(`[KYB API Debug] ${stage}:`, {
    taskId: task?.id,
    status: task?.status,
    progress: task?.progress,
    metadata: task?.metadata ? Object.keys(task.metadata) : null,
    ...extras,
    timestamp: new Date().toISOString()
  });
};

// Debug utility for logging response data
const logResponseDebug = (stage: string, responses: any[], extras: Record<string, any> = {}) => {
  console.log(`[KYB API Debug] ${stage}:`, {
    responseCount: responses.length,
    fields: responses.map(r => ({
      field: r.field_key,
      status: r.status,
      hasValue: !!r.response_value
    })),
    ...extras,
    timestamp: new Date().toISOString()
  });
};

// Get KYB task by company name
router.get('/api/tasks/kyb/:companyName?', async (req, res) => {
  try {
    const { companyName } = req.params;

    console.log('[KYB API Debug] Task lookup request:', {
      companyName,
      timestamp: new Date().toISOString()
    });

    // If no company name provided, return all KYB tasks
    if (!companyName) {
      const kybTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.task_type, 'company_kyb'));
      return res.json(kybTasks[0] || null);
    }

    // Format company name by removing the 'kyb-' prefix if present
    const formattedCompanyName = companyName
      .replace(/^kyb-/, '')  // Remove 'kyb-' prefix if present
      .replace(/-/g, ' ');   // Replace dashes with spaces

    console.log('[KYB API Debug] Searching for company:', {
      original: companyName,
      formatted: formattedCompanyName,
      timestamp: new Date().toISOString()
    });

    const [task] = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.task_type, 'company_kyb'),
          ilike(tasks.title, `%${formattedCompanyName}%`)
        )
      );

    if (!task) {
      console.log('[KYB API Debug] Task not found:', {
        companyName: formattedCompanyName,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ error: 'KYB task not found' });
    }

    logTaskDebug('Found task', task);

    // Get all KYB responses for this task
    const responses = await db.select()
      .from(kybResponses)
      .where(eq(kybResponses.task_id, task.id));

    logResponseDebug('Retrieved responses', responses, {
      taskId: task.id
    });

    // Transform responses into form data
    const formData: Record<string, any> = {};
    for (const response of responses) {
      if (response.response_value !== null) {
        formData[response.field_key] = response.response_value;
      }
    }

    // Transform the task data to include saved form data
    const transformedTask = {
      ...task,
      savedFormData: formData,
      progress: task.progress || 0
    };

    console.log('[KYB API Debug] Transformed task data:', {
      id: transformedTask.id,
      status: transformedTask.status,
      progress: transformedTask.progress,
      formDataFields: Object.keys(formData),
      metadataFields: Object.keys(transformedTask.metadata || {}),
      timestamp: new Date().toISOString()
    });

    res.json(transformedTask);
  } catch (error) {
    console.error('[KYB API Debug] Error fetching KYB task:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Failed to fetch KYB task' });
  }
});

// Save progress for KYB form
router.post('/api/kyb/progress', async (req, res) => {
  try {
    const { taskId, progress, formData, fieldUpdates } = req.body;

    console.log('[KYB API Debug] Progress update initiated:', { 
      taskId, 
      requestedProgress: progress,
      formDataKeys: Object.keys(formData || {}),
      fieldUpdates: fieldUpdates ? Object.keys(fieldUpdates) : [],
      timestamp: new Date().toISOString()
    });

    if (!taskId) {
      console.warn('[KYB API Debug] Missing task ID in request');
      return res.status(400).json({ 
        error: 'Task ID is required',
        code: 'MISSING_TASK_ID'
      });
    }

    // Get existing task data
    const [existingTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!existingTask) {
      console.log('[KYB API Debug] Task not found:', taskId);
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Get all KYB fields
    const fields = await db.select().from(kybFields);
    const fieldMap = new Map(fields.map(f => [f.field_key, f.id]));

    // Update KYB responses for each field
    const timestamp = new Date();
    const processedFields = new Set();

    for (const [fieldKey, value] of Object.entries(formData)) {
      const fieldId = fieldMap.get(fieldKey);
      if (!fieldId) continue;

      processedFields.add(fieldKey);
      const responseValue = value === '' ? null : String(value);
      const status = responseValue === null ? 'EMPTY' : 'COMPLETE';

      // Check if response exists
      const [existingResponse] = await db.select()
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            eq(kybResponses.field_id, fieldId)
          )
        );

      if (existingResponse) {
        // Update existing response
        await db.update(kybResponses)
          .set({
            response_value: responseValue,
            status,
            version: existingResponse.version + 1,
            updated_at: timestamp
          })
          .where(eq(kybResponses.id, existingResponse.id));

        console.log('[KYB API Debug] Updated field response:', {
          fieldKey,
          oldValue: existingResponse.response_value,
          newValue: responseValue,
          oldStatus: existingResponse.status,
          newStatus: status,
          timestamp: timestamp.toISOString()
        });
      } else {
        // Create new response
        await db.insert(kybResponses)
          .values({
            task_id: taskId,
            field_id: fieldId,
            response_value: responseValue,
            status,
            version: 1,
            created_at: timestamp,
            updated_at: timestamp
          });

        console.log('[KYB API Debug] Created new field response:', {
          fieldKey,
          value: responseValue,
          status,
          timestamp: timestamp.toISOString()
        });
      }
    }

    // Handle fields that were in the database but not in the current formData
    // These should be marked as EMPTY
    const existingResponses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key,
      field_id: kybFields.id,
      response_id: kybResponses.id
    })
    .from(kybResponses)
    .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
    .where(eq(kybResponses.task_id, taskId));

    for (const response of existingResponses) {
      if (!processedFields.has(response.field_key)) {
        await db.update(kybResponses)
          .set({
            response_value: null,
            status: 'EMPTY',
            version: 1,
            updated_at: timestamp
          })
          .where(eq(kybResponses.id, response.response_id));

        console.log('[KYB API Debug] Cleared missing field:', {
          fieldKey: response.field_key,
          oldValue: response.response_value,
          timestamp: timestamp.toISOString()
        });
      }
    }

    // Determine appropriate status based on progress
    let newStatus = existingTask.status;
    if (progress === 0) {
      newStatus = TaskStatus.NOT_STARTED;
    } else if (progress < 100) {
      newStatus = TaskStatus.IN_PROGRESS;
    } else if (progress === 100) {
      newStatus = TaskStatus.READY_FOR_SUBMISSION;
    }

    // Update task progress and metadata
    await db.update(tasks)
      .set({
        progress: Math.min(progress, 100),
        status: newStatus,
        metadata: {
          ...existingTask.metadata,
          lastUpdated: timestamp.toISOString(),
          statusFlow: [...(existingTask.metadata?.statusFlow || []), newStatus]
            .filter((v, i, a) => a.indexOf(v) === i)
        },
        updated_at: timestamp
      })
      .where(eq(tasks.id, taskId));

    // Get updated responses
    const updatedResponses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key,
      status: kybResponses.status
    })
    .from(kybResponses)
    .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
    .where(eq(kybResponses.task_id, taskId));

    const updatedFormData: Record<string, any> = {};
    for (const response of updatedResponses) {
      if (response.response_value !== null) {
        updatedFormData[response.field_key] = response.response_value;
      }
    }

    res.json({ 
      success: true,
      savedData: {
        progress: Math.min(progress, 100),
        status: newStatus,
        formData: updatedFormData
      }
    });
  } catch (error) {
    console.error('[KYB API Debug] Error processing progress update:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      error: 'Failed to save progress',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get saved progress for KYB form
router.get('/api/kyb/progress/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log('[KYB API Debug] Loading progress for task:', taskId);

    // Get task data
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));

    logTaskDebug('Retrieved task', task);

    if (!task) {
      console.log('[KYB API Debug] Task not found:', taskId);
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get all KYB responses for this task with their field information
    const responses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key,
      status: kybResponses.status
    })
    .from(kybResponses)
    .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
    .where(eq(kybResponses.task_id, parseInt(taskId)));

    logResponseDebug('Retrieved responses', responses);

    // Transform responses into form data
    const formData: Record<string, any> = {};
    for (const response of responses) {
      if (response.response_value !== null) {
        formData[response.field_key] = response.response_value;
      }
    }

    console.log('[KYB API Debug] Retrieved task data:', {
      id: task.id,
      responseCount: responses.length,
      progress: task.progress,
      status: task.status,
      formDataKeys: Object.keys(formData),
      formData
    });

    // Return saved form data and progress
    res.json({
      formData,
      progress: Math.min(task.progress || 0, 100)
    });
  } catch (error) {
    console.error('[KYB API Debug] Error loading progress:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

// Save KYB form data
router.post('/api/kyb/save', async (req, res) => {
  try {
    const { fileName, formData, taskId } = req.body;

    console.log('[KYB API Debug] Save initiated:', { fileName, taskId, formDataKeys: Object.keys(formData) });

    // Save form data to a file
    const filePath = join(process.cwd(), 'uploads', 'kyb', `${fileName}.json`);
    await writeFile(filePath, JSON.stringify(formData, null, 2), 'utf-8');

    // Update task status and save final responses
    if (taskId) {
      const timestamp = new Date();

      // Get all KYB fields
      const fields = await db.select().from(kybFields);
      const fieldMap = new Map(fields.map(f => [f.field_key, f.id]));

      // Save final responses
      for (const [fieldKey, value] of Object.entries(formData)) {
        const fieldId = fieldMap.get(fieldKey);
        if (!fieldId) continue;

        const responseValue = value === '' ? null : String(value);
        const status = responseValue === null ? 'empty' : 'complete';

        // Update or create response
        const [existingResponse] = await db.select()
          .from(kybResponses)
          .where(
            and(
              eq(kybResponses.task_id, taskId),
              eq(kybResponses.field_id, fieldId)
            )
          );

        if (existingResponse) {
          await db.update(kybResponses)
            .set({
              response_value: responseValue,
              status,
              version: existingResponse.version + 1,
              updated_at: timestamp
            })
            .where(eq(kybResponses.id, existingResponse.id));
        } else {
          await db.insert(kybResponses)
            .values({
              task_id: taskId,
              field_id: fieldId,
              field_key: fieldKey,
              response_value: responseValue,
              status,
              version: 1,
              created_at: timestamp,
              updated_at: timestamp
            });
        }
      }

      // Update task status
      await db.update(tasks)
        .set({
          status: TaskStatus.SUBMITTED,
          progress: 100,
          updated_at: timestamp,
          metadata: {
            ...formData,
            kybFormFile: `${fileName}.json`,
            submissionDate: timestamp.toISOString()
          }
        })
        .where(eq(tasks.id, taskId));

        logTaskDebug('Task updated after submission', {id: taskId, status: TaskStatus.SUBMITTED});
    }

    console.log('[KYB API Debug] Save completed:', { filePath, timestamp: new Date().toISOString() });
    res.json({ success: true, filePath });
  } catch (error) {
    console.error('[KYB API Debug] Error saving KYB form:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Failed to save KYB form data' });
  }
});

export default router;