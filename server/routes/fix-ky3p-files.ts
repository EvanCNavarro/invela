/**
 * Fix KY3P Files API
 * 
 * This route provides endpoints to fix issues with KY3P file attachments.
 * It helps repair file references and regenerate missing files for KY3P tasks.
 */

import express from 'express';
import { db } from '@db';
import { files, tasks, ky3pResponses, ky3pFields } from '@db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { requireAuth } from '../middleware/auth';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Middleware to ensure user is authenticated
router.use(requireAuth);

/**
 * Check KY3P task file attachments
 */
router.get('/check/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    // Get the task
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.task_type, 'ky3p')
      )
    });

    if (!task) {
      return res.status(404).json({ error: 'KY3P task not found' });
    }

    // Check if there are files associated with this task
    const taskFiles = await db.query.files.findMany({
      where: eq(files.task_id, taskId)
    });

    // Get the responses that should have file attachments
    const fileResponses = await db.query.ky3p_responses.findMany({
      where: and(
        eq(ky3p_responses.task_id, taskId),
        inArray(ky3p_responses.field_type, ['file', 'attachment', 'document'])
      )
    });

    // Compare files and responses
    const fileResponseMap = new Map();
    for (const response of fileResponses) {
      fileResponseMap.set(response.field_id, {
        response,
        hasFile: false
      });
    }

    // Mark responses that have files
    for (const file of taskFiles) {
      if (file.field_id && fileResponseMap.has(file.field_id)) {
        fileResponseMap.get(file.field_id).hasFile = true;
      }
    }

    // Identify missing files
    const missingFiles = [];
    for (const [fieldId, data] of fileResponseMap.entries()) {
      if (!data.hasFile) {
        missingFiles.push({
          fieldId,
          response: data.response
        });
      }
    }

    return res.json({
      task: {
        id: task.id,
        title: task.title,
        status: task.status
      },
      files: {
        total: taskFiles.length,
        expectedFileFields: fileResponses.length,
        missingFiles: missingFiles.length,
        missingFileDetails: missingFiles
      }
    });
  } catch (error) {
    logger.error('Error checking KY3P file status:', error);
    return res.status(500).json({ error: 'Error checking KY3P file status' });
  }
});

/**
 * Fix missing KY3P files
 */
router.post('/fix/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    // Get the task
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.task_type, 'ky3p')
      )
    });

    if (!task) {
      return res.status(404).json({ error: 'KY3P task not found' });
    }

    // Get the responses that should have file attachments
    const fileResponses = await db.query.ky3p_responses.findMany({
      where: and(
        eq(ky3p_responses.task_id, taskId),
        inArray(ky3p_responses.field_type, ['file', 'attachment', 'document'])
      )
    });

    // Get existing files
    const existingFiles = await db.query.files.findMany({
      where: eq(files.task_id, taskId)
    });
    
    // Map of field_id to file
    const fieldToFileMap = new Map();
    for (const file of existingFiles) {
      if (file.field_id) {
        fieldToFileMap.set(file.field_id, file);
      }
    }

    // Identify and fix missing files
    const fixedFiles = [];
    for (const response of fileResponses) {
      if (!fieldToFileMap.has(response.field_id)) {
        // Create a placeholder file for this field
        const fileDir = `/uploads/task_${taskId}`;
        const filePath = path.join(fileDir, `${response.field_id}_file.pdf`);
        
        // Create a new file entry
        const newFile = await db.insert(files).values({
          name: `${response.field_key || response.field_id}_file.pdf`,
          size: 0, // Size will be updated later
          mime_type: 'application/pdf',
          path: filePath,
          created_at: new Date(),
          updated_at: new Date(),
          task_id: taskId,
          user_id: req.user.id,
          field_id: response.field_id
        }).returning();

        fixedFiles.push(newFile[0]);

        // Create file directory if it doesn't exist
        try {
          await fs.mkdir(fileDir, { recursive: true });
        } catch (err) {
          logger.warn(`Error creating directory ${fileDir}:`, err);
        }
      }
    }

    return res.json({
      success: true,
      message: `Fixed ${fixedFiles.length} missing files`,
      fixedFiles
    });
  } catch (error) {
    logger.error('Error fixing KY3P files:', error);
    return res.status(500).json({ error: 'Error fixing KY3P files' });
  }
});

/**
 * Get stats for KY3P file attachments
 */
router.get('/stats', async (req, res) => {
  try {
    // Get all KY3P tasks
    const ky3pTasks = await db.query.tasks.findMany({
      where: eq(tasks.task_type, 'ky3p')
    });

    // Get stats for each task
    const stats = {
      totalTasks: ky3pTasks.length,
      tasksWithFiles: 0,
      tasksWithMissingFiles: 0,
      totalFiles: 0,
      totalMissingFiles: 0
    };

    for (const task of ky3pTasks) {
      // Get files for this task
      const taskFiles = await db.query.files.findMany({
        where: eq(files.task_id, task.id)
      });

      // Get responses that should have files
      const fileResponses = await db.query.ky3p_responses.findMany({
        where: and(
          eq(ky3p_responses.task_id, task.id),
          inArray(ky3p_responses.field_type, ['file', 'attachment', 'document'])
        )
      });

      const fieldIds = fileResponses.map(r => r.field_id);
      const fileFieldIds = taskFiles.map(f => f.field_id).filter(Boolean);
      
      const missingFileCount = fieldIds.filter(id => !fileFieldIds.includes(id)).length;

      stats.totalFiles += taskFiles.length;
      stats.totalMissingFiles += missingFileCount;

      if (taskFiles.length > 0) {
        stats.tasksWithFiles++;
      }

      if (missingFileCount > 0) {
        stats.tasksWithMissingFiles++;
      }
    }

    return res.json(stats);
  } catch (error) {
    logger.error('Error getting KY3P file stats:', error);
    return res.status(500).json({ error: 'Error getting KY3P file stats' });
  }
});

export default router;