/**
 * Fix Missing File Module
 * 
 * This module handles generating missing files for tasks.
 * It is imported by the transactional-form-routes.ts file.
 */

import { db } from '@db';
import { files, tasks } from '@db/schema';
import { eq } from 'drizzle-orm';

/**
 * Generate a missing file for a task
 * 
 * @param taskId The ID of the task to generate a file for
 * @returns Object containing success flag and file information
 */
export async function generateMissingFileForTask(taskId: number) {
  try {
    // Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });

    if (!task) {
      return {
        success: false,
        error: 'Task not found'
      };
    }

    // Check if the task already has a file
    const existingFile = await db.query.files.findFirst({
      where: eq(files.task_id, taskId)
    });

    if (existingFile) {
      return {
        success: true,
        fileId: existingFile.id,
        fileName: existingFile.name,
        message: 'Task already has a file'
      };
    }

    // Create a new file for the task
    const fileName = `Task_${taskId}_Report.pdf`;
    const filePath = `/uploads/task_${taskId}/${fileName}`;

    const [newFile] = await db.insert(files).values({
      name: fileName,
      mime_type: 'application/pdf',
      size: 0,
      path: filePath,
      status: 'active',
      task_id: taskId,
      company_id: task.company_id,
      created_at: new Date(),
      updated_at: new Date(),
      metadata: {
        generatedFile: true,
        task_type: task.task_type
      }
    }).returning();

    // Update the task with the file ID
    await db.update(tasks)
      .set({
        metadata: {
          ...task.metadata,
          fileId: newFile.id,
          fileName: newFile.name
        },
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId));

    return {
      success: true,
      fileId: newFile.id,
      fileName: newFile.name,
      message: 'File generated successfully'
    };
  } catch (error) {
    console.error('Error generating file for task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}