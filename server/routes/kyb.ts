import { Router } from 'express';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { TaskStatus } from '../types';

const router = Router();

// Get KYB task by company name
router.get('/api/tasks/kyb/:companyName?', async (req, res) => {
  try {
    const { companyName } = req.params;

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

    console.log('[KYB API] Searching for company:', formattedCompanyName);

    const [task] = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.task_type, 'company_kyb'),
          ilike(tasks.title, `%${formattedCompanyName}%`)
        )
      );

    if (!task) {
      console.log('[KYB API] Task not found for company:', formattedCompanyName);
      return res.status(404).json({ error: 'KYB task not found' });
    }

    console.log('[KYB API] Found task:', task);
    res.json(task);
  } catch (error) {
    console.error('[KYB API] Error fetching KYB task:', error);
    res.status(500).json({ error: 'Failed to fetch KYB task' });
  }
});

// Save progress for KYB form
router.post('/api/kyb/progress', async (req, res) => {
  try {
    const { taskId, progress, formData } = req.body;
    console.log('[KYB API] Saving progress:', { taskId, progress });

    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    // Get existing task data
    const [existingTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!existingTask) {
      console.log('[KYB API] Task not found:', taskId);
      return res.status(404).json({ error: 'Task not found' });
    }

    // Log existing data
    console.log('[KYB API] Existing task data:', {
      id: existingTask.id,
      currentMetadata: existingTask.metadata,
      currentProgress: existingTask.progress
    });

    // Merge existing metadata with new form data
    const updatedMetadata = {
      ...(existingTask.metadata || {}),
      ...formData,
      lastUpdated: new Date().toISOString()
    };

    // Log the data we're about to save
    console.log('[KYB API] Saving updated data:', {
      taskId,
      progress,
      existingMetadata: existingTask.metadata,
      updatedMetadata,
      formDataKeys: Object.keys(formData)
    });

    // Update task with progress and save form data
    await db.update(tasks)
      .set({
        progress: Math.min(progress, 100), // Ensure progress doesn't exceed 100%
        status: progress >= 100 ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS,
        metadata: updatedMetadata
      })
      .where(eq(tasks.id, taskId));

    res.json({ success: true });
  } catch (error) {
    console.error('[KYB API] Error saving progress:', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// Get saved progress for KYB form
router.get('/api/kyb/progress/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log('[KYB API] Loading progress for task:', taskId);

    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));

    if (!task) {
      console.log('[KYB API] Task not found:', taskId);
      return res.status(404).json({ error: 'Task not found' });
    }

    // Log the task data we're returning
    console.log('[KYB API] Retrieved task data:', {
      id: task.id,
      metadata: task.metadata,
      progress: task.progress,
      status: task.status
    });

    // Return saved form data and progress
    res.json({
      formData: task.metadata || {},
      progress: Math.min(task.progress || 0, 100) // Ensure progress doesn't exceed 100%
    });
  } catch (error) {
    console.error('[KYB API] Error loading progress:', error);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

// Save KYB form data
router.post('/api/kyb/save', async (req, res) => {
  try {
    const { fileName, formData, taskId } = req.body;

    // Save form data to a file
    const filePath = join(process.cwd(), 'uploads', 'kyb', `${fileName}.json`);
    await writeFile(filePath, JSON.stringify(formData, null, 2), 'utf-8');

    // Update task status
    if (taskId) {
      await db.update(tasks)
        .set({
          status: TaskStatus.COMPLETED,
          progress: 100,
          updated_at: new Date(),
          metadata: {
            ...formData,
            kybFormFile: `${fileName}.json`
          }
        })
        .where(eq(tasks.id, taskId));
    }

    res.json({ success: true, filePath });
  } catch (error) {
    console.error('[KYB API] Error saving KYB form:', error);
    res.status(500).json({ error: 'Failed to save KYB form data' });
  }
});

export default router;