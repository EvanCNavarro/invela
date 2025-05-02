/**
 * Unified Task Progress Calculator
 * 
 * A central, simplified progress calculation function that consistently 
 * calculates task progress based on the number of completed responses.
 * 
 * This function follows the KISS principle (Keep It Simple, Stupid)
 * by directly counting field responses with status = 'complete'.
 */

import { db } from '@db';
import { eq, and, sql } from 'drizzle-orm';
import {
  tasks,
  kybResponses,
  ky3pResponses,
  openBankingResponses,
  kybFields,
  ky3pFields,
  openBankingFields,
  TaskStatus
} from '@db/schema';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';

// Define response interface for better type checking
interface ResponseWithStatus {
  field_id: number;
  status: string;
  [key: string]: any;
}

// Define task interface for better type checking
interface TaskWithMetadata {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  progress: number;
  submission_date?: Date;
  submitted?: boolean;
  metadata: Record<string, any> | null;
  [key: string]: any;
}

// Centralized log prefix for easy filtering
const LOG_PREFIX = '[UnifiedProgress]';

/**
 * Calculate and optionally update task progress
 * 
 * This function provides a single source of truth for task progress calculation:
 * - Counts total fields for the task type
 * - Counts responses with status = 'complete'
 * - Calculates percentage, rounds to nearest integer
 * - Updates the database (optional)
 * - Broadcasts the update to WebSocket clients (optional)
 * 
 * @param taskId The ID of the task to calculate progress for
 * @param taskType The type of task (company_kyb, ky3p, open_banking)
 * @param options Configuration options
 * @returns Promise with the calculated progress percentage
 */
export async function calculateAndUpdateTaskProgress(
  taskId: number,
  taskType: string,
  options: {
    updateDatabase?: boolean;
    broadcastUpdate?: boolean;
    source?: string;
    transactionId?: string;
  } = {}
): Promise<{ progress: number; status: TaskStatus }> {
  // Set defaults
  const {
    updateDatabase = true,
    broadcastUpdate = true,
    source = 'api',
    transactionId = `txid-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  } = options;

  // Start the operation with detailed logging
  console.log(`${LOG_PREFIX} Step 1: Getting task info - Task ID: ${taskId}, Type: ${taskType}`, {
    taskId,
    taskType,
    updateDatabase,
    broadcastUpdate,
    source,
    transactionId,
    timestamp: new Date().toISOString()
  });

  try {
    // Track timing for performance monitoring
    const startTime = performance.now();
    
    // Step 1: Get the current task to track any changes
    const [currentTask] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    
    if (!currentTask) {
      console.error(`${LOG_PREFIX} ERROR - Task not found: ${taskId}`);
      throw new Error(`Task not found: ${taskId}`);
    }

    // Cast to our interface for better type checking
    const taskData = currentTask as unknown as TaskWithMetadata;

    console.log(`${LOG_PREFIX} Step 1 Complete: Found task - Title: ${taskData.title}`, {
      taskId,
      taskType,
      currentProgress: taskData.progress,
      currentStatus: taskData.status,
      execution_time_ms: (performance.now() - startTime).toFixed(2)
    });

    // Step 2: Count total fields based on task type
    let totalFields = 0;
    const step2StartTime = performance.now();

    if (taskType === 'open_banking') {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(openBankingFields);
      totalFields = result[0].count;
    } 
    else if (['ky3p', 'security', 'sp_ky3p_assessment', 'security_assessment'].includes(taskType)) {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(ky3pFields);
      totalFields = result[0].count;
    }
    else {
      // Default to KYB
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(kybFields);
      totalFields = result[0].count;
    }

    console.log(`${LOG_PREFIX} Step 2 Complete: Counted total fields - Count: ${totalFields}`, {
      taskId,
      taskType,
      totalFields,
      execution_time_ms: (performance.now() - step2StartTime).toFixed(2)
    });

    // Step 3: Count completed responses
    let completedFields = 0;
    const step3StartTime = performance.now();

    // Direct string value for status comparison
    // Much simpler than using enums and dealing with type conversions
    const COMPLETE_STATUS = 'complete';

    if (taskType === 'open_banking') {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(openBankingResponses)
        .where(
          and(
            eq(openBankingResponses.task_id, taskId),
            sql`${openBankingResponses.status} = ${COMPLETE_STATUS}`
          )
        );
      completedFields = result[0].count;

      // Log some sample responses for debugging
      const sampleResponses = await db
        .select()
        .from(openBankingResponses)
        .where(eq(openBankingResponses.task_id, taskId))
        .limit(5);
      
      console.log(`${LOG_PREFIX} Sample responses for Open Banking task:`, {
        sampleCount: sampleResponses.length,
        samples: sampleResponses.map((r: ResponseWithStatus) => ({ 
          field_id: r.field_id, 
          status: r.status,
          isComplete: r.status === COMPLETE_STATUS
        }))
      });
    } 
    else if (['ky3p', 'security', 'sp_ky3p_assessment', 'security_assessment'].includes(taskType)) {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            sql`${ky3pResponses.status} = ${COMPLETE_STATUS}`
          )
        );
      completedFields = result[0].count;

      // Log some sample responses for debugging
      const sampleResponses = await db
        .select()
        .from(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId))
        .limit(5);
      
      console.log(`${LOG_PREFIX} Sample responses for KY3P task:`, {
        sampleCount: sampleResponses.length,
        samples: sampleResponses.map((r: ResponseWithStatus) => ({ 
          field_id: r.field_id, 
          status: r.status,
          isComplete: r.status === COMPLETE_STATUS
        }))
      });
    }
    else {
      // Default to KYB
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            sql`${kybResponses.status} = ${COMPLETE_STATUS}`
          )
        );
      completedFields = result[0].count;

      // Log some sample responses for debugging
      const sampleResponses = await db
        .select()
        .from(kybResponses)
        .where(eq(kybResponses.task_id, taskId))
        .limit(5);
      
      console.log(`${LOG_PREFIX} Sample responses for KYB task:`, {
        sampleCount: sampleResponses.length,
        samples: sampleResponses.map((r: ResponseWithStatus) => ({ 
          field_id: r.field_id, 
          status: r.status,
          isComplete: r.status === COMPLETE_STATUS
        }))
      });
    }

    console.log(`${LOG_PREFIX} Step 3 Complete: Counted completed fields - Count: ${completedFields}`, {
      taskId,
      taskType,
      completedFields,
      execution_time_ms: (performance.now() - step3StartTime).toFixed(2)
    });

    // Step 4: Calculate progress percentage
    const step4StartTime = performance.now();
    
    // Simple, deterministic calculation: (completed / total) * 100
    // Round to nearest integer and cap at 100%
    const progressPercentage = totalFields > 0 
      ? Math.min(100, Math.round((completedFields / totalFields) * 100))
      : 0;

    console.log(`${LOG_PREFIX} Step 4 Complete: Calculated progress - ${completedFields}/${totalFields} = ${progressPercentage}%`, {
      taskId,
      taskType,
      totalFields,
      completedFields,
      progressPercentage,
      execution_time_ms: (performance.now() - step4StartTime).toFixed(2)
    });

    // Step 5: Determine the appropriate status based on progress
    const step5StartTime = performance.now();
    
    // Extract necessary metadata to determine status
    const hasSubmissionDate = !!taskData.submission_date;
    const hasSubmittedFlag = !!taskData.submitted;
    const shouldBeSubmitted = hasSubmissionDate || hasSubmittedFlag;
    
    // Determine the appropriate status based on progress percentage
    let newStatus: TaskStatus;
    
    if (progressPercentage === 0) {
      newStatus = 'not_started';
    } else if (progressPercentage === 100) {
      if (shouldBeSubmitted) {
        newStatus = 'submitted';
      } else {
        newStatus = 'ready_for_submission';
      }
    } else {
      newStatus = 'in_progress';
    }

    console.log(`${LOG_PREFIX} Step 5 Complete: Determined status - Progress: ${progressPercentage}%, Status: ${newStatus}`, {
      taskId,
      taskType,
      progressPercentage,
      newStatus,
      previousStatus: taskData.status,
      hasSubmissionDate,
      hasSubmittedFlag,
      shouldBeSubmitted,
      execution_time_ms: (performance.now() - step5StartTime).toFixed(2)
    });

    // Step 6: Update the database (if requested)
    if (updateDatabase) {
      const step6StartTime = performance.now();
      
      const [updatedTask] = await db
        .update(tasks)
        .set({
          progress: progressPercentage,
          status: newStatus,
          updated_at: new Date(),
          metadata: {
            ...taskData.metadata,
            lastProgressUpdate: new Date().toISOString(),
            progressUpdateSource: source,
            progressUpdateTransactionId: transactionId
          }
        })
        .where(eq(tasks.id, taskId))
        .returning();

      console.log(`${LOG_PREFIX} Step 6 Complete: Updated database`, {
        taskId,
        taskType,
        oldProgress: taskData.progress,
        newProgress: progressPercentage,
        oldStatus: taskData.status,
        newStatus,
        execution_time_ms: (performance.now() - step6StartTime).toFixed(2)
      });
    } else {
      console.log(`${LOG_PREFIX} Step 6 Skipped: Database update not requested`, {
        taskId,
        taskType,
        calculatedProgress: progressPercentage,
        calculatedStatus: newStatus
      });
    }

    // Step 7: Broadcast the update to WebSocket clients (if requested)
    if (broadcastUpdate) {
      const step7StartTime = performance.now();
      
      try {
        // Broadcast update to all connected clients
        broadcastTaskUpdate(taskId, progressPercentage, newStatus, transactionId);
        
        console.log(`${LOG_PREFIX} Step 7 Complete: Broadcast update sent`, {
          taskId,
          taskType,
          progress: progressPercentage,
          status: newStatus,
          transactionId,
          execution_time_ms: (performance.now() - step7StartTime).toFixed(2)
        });
      } catch (broadcastError) {
        console.error(`${LOG_PREFIX} Step 7 ERROR: Failed to broadcast update`, {
          taskId,
          taskType,
          progress: progressPercentage,
          status: newStatus,
          error: broadcastError instanceof Error ? broadcastError.message : 'Unknown error',
          execution_time_ms: (performance.now() - step7StartTime).toFixed(2)
        });
      }
    } else {
      console.log(`${LOG_PREFIX} Step 7 Skipped: Broadcast not requested`, {
        taskId,
        taskType
      });
    }

    // Log the overall execution time
    console.log(`${LOG_PREFIX} Complete: Task progress calculated and updated successfully`, {
      taskId,
      taskType,
      progress: progressPercentage,
      status: newStatus,
      total_execution_time_ms: (performance.now() - startTime).toFixed(2),
      timestamp: new Date().toISOString()
    });

    // Return the final progress and status
    return { progress: progressPercentage, status: newStatus };
  } catch (error) {
    // Log detailed error information
    console.error(`${LOG_PREFIX} ERROR: Failed to calculate or update task progress`, {
      taskId,
      taskType,
      transactionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Re-throw to allow caller to handle
    throw error;
  }
}

/**
 * Broadcast a task update via WebSocket
 * 
 * @param taskId Task ID to broadcast update for
 * @param progress Updated progress value
 * @param status Updated task status
 * @param transactionId Unique ID for this transaction
 */
function broadcastTaskUpdate(
  taskId: number,
  progress: number,
  status: TaskStatus,
  transactionId: string
): void {
  // Access the WebSocket server from the global scope
  // This assumes the WebSocket server is already set up
  const wss = (global as any).wss as WebSocketServer | undefined;
  
  if (!wss) {
    console.warn(`${LOG_PREFIX} WebSocket server not available for broadcasting`);
    return;
  }
  
  // Build the message to send
  const message = {
    type: 'task_update',
    payload: {
      taskId,
      progress,
      status,
      timestamp: new Date().toISOString(),
      transactionId
    }
  };
  
  let clientCount = 0;
  
  // Broadcast to all connected clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      clientCount++;
    }
  });
  
  console.log(`${LOG_PREFIX} Broadcast sent to ${clientCount} clients`, {
    taskId,
    progress,
    status,
    clientCount,
    transactionId,
    timestamp: new Date().toISOString()
  });
}