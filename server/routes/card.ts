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
      .from(cardFields)
      .orderBy(cardFields.order);

    console.log('[Card Routes] Fields retrieved:', {
      count: fields.length,
      sections: [...new Set(fields.map(f => f.wizard_section))],
      fieldTypes: [...new Set(fields.map(f => f.field_type))]
    });

    res.json(fields);
  } catch (error) {
    console.error('[Card Routes] Error fetching CARD fields:', error);
    res.status(500).json({ message: "Failed to fetch CARD fields" });
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