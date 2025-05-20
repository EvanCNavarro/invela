/**
 * Fix Missing File for Transactional Forms
 * 
 * This module provides routes to check and fix missing file attachments
 * specifically for transactional forms.
 */

import express from 'express';
import { db } from '@db';
import { files, tasks } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { requireAuth } from '../../middleware/auth';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Middleware to ensure user is authenticated
router.use(requireAuth);

/**
 * Check if a transactional form has missing file attachments
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

    // Check if the task is a transactional form
    if (!task.task_type || !task.task_type.includes('transactional')) {
      return res.status(400).json({
        error: 'Task is not a transactional form',
        taskType: task.task_type
      });
    }

    // Get files for this task
    const taskFiles = await db.query.files.findMany({
      where: eq(files.task_id, taskId)
    });

    // Check for specific transactional file requirements
    const requiredFileTypes = [
      'transaction_agreement',
      'supporting_document',
      'entity_document'
    ];
    
    const missingFileTypes = [];
    for (const fileType of requiredFileTypes) {
      const hasFile = taskFiles.some(file => 
        file.file_type === fileType || 
        file.metadata?.fileType === fileType
      );
      
      if (!hasFile) {
        missingFileTypes.push(fileType);
      }
    }

    return res.json({
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        type: task.task_type
      },
      files: {
        total: taskFiles.length,
        requiredTypes: requiredFileTypes,
        missingTypes: missingFileTypes,
        existingFiles: taskFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: file.file_type || file.metadata?.fileType
        }))
      }
    });
  } catch (error) {
    logger.error('Error checking transactional form file status:', error);
    return res.status(500).json({ error: 'Error checking file status' });
  }
});

/**
 * Fix missing files for a transactional form
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

    // Check if the task is a transactional form
    if (!task.task_type || !task.task_type.includes('transactional')) {
      return res.status(400).json({
        error: 'Task is not a transactional form',
        taskType: task.task_type
      });
    }

    // Get existing files
    const existingFiles = await db.query.files.findMany({
      where: eq(files.task_id, taskId)
    });
    
    // Get existing file types
    const existingFileTypes = existingFiles.map(file => 
      file.file_type || file.metadata?.fileType
    ).filter(Boolean);

    // Determine missing file types
    const requiredFileTypes = [
      'transaction_agreement',
      'supporting_document',
      'entity_document'
    ];
    
    const missingFileTypes = requiredFileTypes.filter(
      type => !existingFileTypes.includes(type)
    );

    // Create missing files
    const fileDir = `/uploads/task_${taskId}`;
    const fixedFiles = [];

    for (const fileType of missingFileTypes) {
      const fileName = `${fileType}_${taskId}.pdf`;
      const filePath = path.join(fileDir, fileName);
      
      // Create a new file entry
      const newFile = await db.insert(files).values({
        name: fileName,
        size: 0, // Size will be updated later
        mime_type: 'application/pdf',
        path: filePath,
        file_type: fileType,
        created_at: new Date(),
        updated_at: new Date(),
        task_id: taskId,
        user_id: req.user?.id || task.created_by,
        metadata: { fileType, isPlaceholder: true }
      }).returning();

      fixedFiles.push(newFile[0]);

      // Create file directory if it doesn't exist
      try {
        await fs.mkdir(fileDir, { recursive: true });
      } catch (err) {
        logger.warn(`Error creating directory ${fileDir}:`, err);
      }
    }

    return res.json({
      success: true,
      message: `Fixed ${fixedFiles.length} missing files`,
      task: {
        id: task.id,
        title: task.title
      },
      fixedFiles: fixedFiles.map(file => ({
        id: file.id,
        name: file.name,
        type: file.file_type
      }))
    });
  } catch (error) {
    logger.error('Error fixing transactional form files:', error);
    return res.status(500).json({ error: 'Error fixing files' });
  }
});

export default router;