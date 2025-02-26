import { Router } from 'express';
import { db } from '@db';
import { tasks, cardFields, cardResponses, files } from '@db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { TaskStatus } from '@db/schema';

const router = Router();

// Get CARD fields
router.get('/api/card/fields', requireAuth, async (req, res) => {
  try {
    console.log('[Card Routes] Fetching CARD fields');

    const fields = await db.select()
      .from(cardFields);

    console.log('[Card Routes] Fields retrieved:', {
      count: fields.length,
      sections: fields.length > 0 ? [...new Set(fields.map(f => f.wizard_section))] : [],
      fieldTypes: fields.length > 0 ? [...new Set(fields.map(f => f.field_key))] : [],
      timestamp: new Date().toISOString()
    });

    res.json(fields);
  } catch (error) {
    console.error('[Card Routes] Error fetching CARD fields:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      message: "Failed to fetch CARD fields",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Save individual CARD field response
router.post('/api/card/response/:taskId/:fieldId', requireAuth, async (req, res) => {
  try {
    const { taskId, fieldId } = req.params;
    const { response } = req.body;

    console.log('[Card Routes] Saving field response:', {
      taskId,
      fieldId,
      hasResponse: !!response,
      timestamp: new Date().toISOString()
    });

    // Check if response already exists
    const [existingResponse] = await db.select()
      .from(cardResponses)
      .where(
        and(
          eq(cardResponses.task_id, parseInt(taskId)),
          eq(cardResponses.field_id, parseInt(fieldId))
        )
      );

    const status = response ? 'COMPLETE' : 'EMPTY';
    const timestamp = new Date();

    if (existingResponse) {
      console.log('[Card Routes] Updating existing response:', {
        responseId: existingResponse.id,
        oldStatus: existingResponse.status,
        newStatus: status,
        version: existingResponse.version + 1,
        timestamp: timestamp.toISOString()
      });

      const [updatedResponse] = await db.update(cardResponses)
        .set({
          response_value: response,
          status,
          version: existingResponse.version + 1,
          updated_at: timestamp
        })
        .where(eq(cardResponses.id, existingResponse.id))
        .returning();

      res.json(updatedResponse);
    } else {
      console.log('[Card Routes] Creating new response:', {
        taskId,
        fieldId,
        status,
        timestamp: timestamp.toISOString()
      });

      const [newResponse] = await db.insert(cardResponses)
        .values({
          task_id: parseInt(taskId),
          field_id: parseInt(fieldId),
          response_value: response,
          status,
          version: 1,
          created_at: timestamp,
          updated_at: timestamp
        })
        .returning();

      res.json(newResponse);
    }

    // Update task progress
    const [taskResponses] = await db.select({
      total: db.fn.count<number>(),
      completed: db.fn.count<number>().filter(eq(cardResponses.status, 'COMPLETE'))
    })
    .from(cardResponses)
    .where(eq(cardResponses.task_id, parseInt(taskId)));

    const progress = Math.floor((taskResponses.completed / taskResponses.total) * 100);

    console.log('[Card Routes] Updating task progress:', {
      taskId,
      totalResponses: taskResponses.total,
      completedResponses: taskResponses.completed,
      calculatedProgress: progress,
      timestamp: timestamp.toISOString()
    });

    await db.update(tasks)
      .set({ progress })
      .where(eq(tasks.id, parseInt(taskId)));

  } catch (error) {
    console.error('[Card Routes] Error saving response:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: "Failed to save response",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get CARD responses for a task
router.get('/api/card/responses/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;

    console.log('[Card Routes] Fetching responses for task:', {
      taskId,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    const responses = await db.select()
      .from(cardResponses)
      .where(eq(cardResponses.task_id, parseInt(taskId)));

    console.log('[Card Routes] Responses retrieved:', {
      count: responses.length,
      responseStatuses: responses.map(r => r.status),
      timestamp: new Date().toISOString()
    });

    res.json(responses);
  } catch (error) {
    console.error('[Card Routes] Error fetching responses:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      message: "Failed to fetch responses",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get CARD task by company name
router.get('/api/tasks/card/:companyName', requireAuth, async (req, res) => {
  try {
    console.log('[Card Routes] Fetching CARD task:', {
      companyName: req.params.companyName,
      userId: req.user?.id,
      companyId: req.user?.company_id
    });

    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.task_type, 'company_card'),
        ilike(tasks.title, `Company CARD: ${req.params.companyName}`),
        eq(tasks.company_id, req.user!.company_id)
      )
    });

    console.log('[Card Routes] Task lookup result:', {
      found: !!task,
      taskId: task?.id,
      taskType: task?.task_type,
      taskStatus: task?.status
    });

    if (!task) {
      return res.status(404).json({
        message: `Could not find CARD task for company: ${req.params.companyName}`
      });
    }

    res.json(task);
  } catch (error) {
    console.error('[Card Routes] Error fetching CARD task:', error);
    res.status(500).json({ message: "Failed to fetch CARD task" });
  }
});

// Save CARD form data
router.post('/api/card/save', requireAuth, async (req, res) => {
  try {
    const { fileName, formData, taskId } = req.body;

    console.log('[Card Routes] Processing form save:', {
      fileName,
      taskId,
      formDataKeys: Object.keys(formData)
    });

    // Get task details
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      console.error('[Card Routes] Task not found:', taskId);
      return res.status(404).json({ message: "Task not found" });
    }

    // Save form data as JSON file
    const jsonData = JSON.stringify({
      taskId,
      formData,
      metadata: {
        submittedAt: new Date().toISOString(),
        taskType: 'company_card',
        taskStatus: TaskStatus.SUBMITTED
      }
    }, null, 2);

    const fileSize = Buffer.from(jsonData).length;

    // Create file record
    const [fileRecord] = await db.insert(files)
      .values({
        name: `${fileName}.json`,
        size: fileSize,
        type: 'application/json',
        path: jsonData,
        status: 'uploaded',
        user_id: req.user!.id,
        company_id: task.company_id,
        upload_time: new Date(),
        version: 1.0
      })
      .returning();

    // Update task status
    await db.update(tasks)
      .set({
        status: TaskStatus.SUBMITTED,
        progress: 100,
        metadata: {
          ...task.metadata,
          cardFormFile: fileRecord.id,
          submissionDate: new Date().toISOString()
        }
      })
      .where(eq(tasks.id, taskId));

    console.log('[Card Routes] Save completed:', {
      taskId,
      fileId: fileRecord.id,
      status: TaskStatus.SUBMITTED
    });

    res.json({
      success: true,
      fileId: fileRecord.id
    });
  } catch (error) {
    console.error('[Card Routes] Error saving form:', error);
    res.status(500).json({
      message: "Failed to save CARD form",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;