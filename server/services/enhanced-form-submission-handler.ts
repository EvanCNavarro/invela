/**
 * Enhanced Form Submission Handler
 * 
 * This service handles form submissions with improved error handling,
 * retry logic, and standardized processing across all form types.
 */

import { tasks, TaskStatus } from '@db/schema';
import { db } from '@db';
import { eq, and, or } from 'drizzle-orm';
import { executeWithRetry } from './db-connection-service';
import { Logger } from './logger';
import { broadcastTaskUpdate } from '../utils/unified-websocket';

const logger = new Logger('EnhancedFormSubmissionHandler');

export interface SubmissionOptions {
  taskId: number;
  userId?: number;
  formData: Record<string, any>;
  skipStatusCheck?: boolean;
  broadcastUpdate?: boolean;
}

interface TaskUpdateParams {
  status?: TaskStatus;
  progress?: number;
  metadata?: Record<string, any>;
  savedFormData?: Record<string, any>;
}

/**
 * Process form submission with enhanced error handling and retry logic
 * 
 * @param options Submission options
 * @returns Result of the submission process
 */
export async function processSubmission(options: SubmissionOptions): Promise<{
  success: boolean;
  taskId: number;
  status: string | null;
  error?: string;
}> {
  const { 
    taskId, 
    formData, 
    userId, 
    skipStatusCheck = false,
    broadcastUpdate = true
  } = options;

  try {
    logger.info(`Processing form submission for task ${taskId}`, {
      taskId,
      dataKeys: Object.keys(formData).length,
      timestamp: new Date().toISOString()
    });

    // Get task info with retry
    const task = await executeWithRetry(
      async () => {
        const [taskRecord] = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId))
          .limit(1);
        
        return taskRecord;
      },
      { operationName: `get task ${taskId}` }
    );

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check if task is ready for submission
    if (!skipStatusCheck && task.status !== 'ready_for_submission') {
      logger.warn(`Task ${taskId} is not ready for submission`, {
        currentStatus: task.status,
        taskId
      });
      
      return {
        success: false,
        taskId,
        status: task.status,
        error: `Task ${taskId} is not ready for submission (current status: ${task.status})`
      };
    }

    // Update task with form data and mark as submitted
    const updateParams: TaskUpdateParams = {
      status: 'submitted' as TaskStatus,
      progress: 100,
      savedFormData: formData
    };

    // Update the task with retry
    await executeWithRetry(
      async () => {
        await db
          .update(tasks)
          .set(updateParams)
          .where(eq(tasks.id, taskId));
      },
      { operationName: `update task ${taskId} status to submitted` }
    );

    // Broadcast update via WebSocket
    if (broadcastUpdate) {
      broadcastTaskUpdate({
        taskId,
        status: 'submitted',
        progress: 100,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Successfully submitted form for task ${taskId}`, {
      taskId,
      status: 'submitted',
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      taskId,
      status: 'submitted'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(`Form submission failed for task ${taskId}`, {
      taskId,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      taskId,
      status: null,
      error: errorMessage
    };
  }
}

export default {
  processSubmission
};