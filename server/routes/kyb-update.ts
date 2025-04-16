// This is a temporary fix to update the KYB API endpoints
// We'll modify the router.get('/api/kyb/progress/:taskId') implementation to include status in the response

import { tasks } from '../db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { kybFields, kybResponses } from '../db/schema/kyb';
import { Request, Response, Router } from 'express';
import { db } from '../db';

// Function to update task status response to include 'status' field
export async function getKybProgressWithStatus(req: Request, res: Response) {
  try {
    const { taskId } = req.params;
    console.log('[KYB API Debug] Loading progress for task:', taskId);

    // Get task data
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));

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
    });

    // Return saved form data, progress, and task status
    return res.json({
      formData,
      progress: Math.min(task.progress || 0, 100),
      status: task.status  // Include task status in the response
    });
  } catch (error) {
    console.error('[KYB API Debug] Error loading progress:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({ error: 'Failed to load progress' });
  }
}