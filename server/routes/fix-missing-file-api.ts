/**
 * Fix Missing File API
 * 
 * This route provides endpoints to fix missing files in tasks.
 * It allows repairing tasks that have file references but the actual files are missing.
 */

import express from 'express';
import { db } from '@db';
import { files, tasks, kybResponses } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Middleware to ensure user is authenticated
router.use(requireAuth);

/**
 * Check if a file is missing for a task
 */
router.get('/check/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    // Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if there's a file associated with this task
    const taskFile = await db.query.files.findFirst({
      where: eq(files.task_id, taskId)
    });

    // Response format includes file status and task info
    const response = {
      task: {
        id: task.id,
        title: task.title,
        status: task.status
      },
      file: taskFile ? {
        id: taskFile.id,
        exists: true,
        name: taskFile.name,
        size: taskFile.size
      } : {
        exists: false
      }
    };

    return res.json(response);
  } catch (error) {
    logger.error('Error checking file status:', error);
    return res.status(500).json({ error: 'Error checking file status' });
  }
});

/**
 * Fix a missing file for a task
 */
router.post('/fix/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    // Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if there's already a file associated with this task
    const existingFile = await db.query.files.findFirst({
      where: eq(files.task_id, taskId)
    });

    if (existingFile) {
      return res.status(400).json({ 
        error: 'Task already has a file', 
        file: existingFile 
      });
    }

    // Create a new file entry for the task
    const newFile = await db.insert(files).values({
      name: `Task_${taskId}_File.pdf`,
      size: 0, // Size will be updated later
      mime_type: 'application/pdf',
      path: `/uploads/task_${taskId}/file.pdf`,
      created_at: new Date(),
      updated_at: new Date(),
      task_id: taskId,
      user_id: req.user.id
    }).returning();

    // Create the directory structure if needed (handled by separate utility)

    return res.json({
      success: true,
      message: 'File reference created successfully',
      file: newFile[0]
    });
  } catch (error) {
    logger.error('Error fixing missing file:', error);
    return res.status(500).json({ error: 'Error fixing missing file' });
  }
});

/**
 * Get stats for missing files across all tasks
 */
router.get('/stats', async (req, res) => {
  try {
    // Get all tasks with files
    const tasksWithFiles = await db.query.tasks.findMany({
      with: {
        files: true
      }
    });

    // Count tasks with and without files
    const stats = {
      total: tasksWithFiles.length,
      withFiles: tasksWithFiles.filter(task => task.files && task.files.length > 0).length,
      withoutFiles: tasksWithFiles.filter(task => !task.files || task.files.length === 0).length
    };

    return res.json(stats);
  } catch (error) {
    logger.error('Error getting file stats:', error);
    return res.status(500).json({ error: 'Error getting file stats' });
  }
});

export default router;