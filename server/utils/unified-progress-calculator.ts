/**
 * Unified Progress Calculator
 * 
 * This module provides a unified interface for calculating progress
 * across all form types, normalizing the calculation process
 * and ensuring consistent progress tracking.
 */

import { db } from '@db';
import { eq } from 'drizzle-orm';
import { tasks } from '@db/schema';
import { calculateKybProgress } from './progress-calculators/kyb-progress';
import { calculateKy3pProgress } from './progress-calculators/ky3p-progress';
import { calculateOpenBankingProgress } from './progress-calculators/open-banking-progress';
import { logger } from './logger';

const log = logger.child({ module: 'UnifiedProgressCalc' });

// Types for task progress calculation
type TaskType = 'company_kyb' | 'ky3p' | 'open_banking' | 'card';

type ProgressOptions = {
  updateDatabase?: boolean;
  sendWebSocketUpdate?: boolean;
  preserveProgress?: boolean;
  source?: string;
  diagnosticId?: string;
  metadata?: Record<string, any>;
};

type ProgressResult = {
  success: boolean;
  taskId: number;
  message: string;
  progress: number;
  status?: string;
};

/**
 * Calculate and optionally update task progress
 * 
 * @param taskId The ID of the task to calculate progress for
 * @param taskType The type of the task
 * @param options Options for progress calculation and updating
 * @returns Progress calculation result
 */
export async function calculateAndUpdateProgress(
  taskId: number,
  taskType: TaskType,
  options: ProgressOptions = {}
): Promise<ProgressResult> {
  const {
    updateDatabase = true,
    sendWebSocketUpdate = true,
    preserveProgress = false,
    source = 'api',
    diagnosticId = `prog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    metadata = {},
  } = options;
  
  log.info(`Starting progress update for task ${taskId} (${taskType})`, {
    taskId,
    taskType,
    diagnosticId,
    metadata: Object.keys(metadata),
  });
  
  try {
    // Get current task state
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Don't update progress if task is already in a terminal state and we're preserving progress
    if (preserveProgress && ['submitted', 'approved', 'rejected'].includes(task.status)) {
      log.info(`Task ${taskId} is in terminal status (${task.status}), preserving progress`);
      return {
        success: true,
        taskId,
        message: `Task is in ${task.status} status, progress preserved`,
        progress: task.progress,
        status: task.status,
      };
    }
    
    // Calculate progress based on task type
    log.info(`Calculating progress for task ${taskId} (${taskType})`);
    let calculationResult: {
      taskId: number;
      taskType: string;
      normalizedTaskType: string;
      totalFields: number;
      completedFields: number;
      progress: number;
      timeStamp: string;
    };
    
    switch (taskType) {
      case 'company_kyb':
        calculationResult = await calculateKybProgress(taskId);
        break;
      case 'ky3p':
        calculationResult = await calculateKy3pProgress(taskId);
        break;
      case 'open_banking':
        calculationResult = await calculateOpenBankingProgress(taskId);
        break;
      case 'card':
        // For future implementation
        throw new Error('Card progress calculation not implemented yet');
      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
    
    // Log the calculated progress
    log.info(`Task ${taskId} (${taskType}) progress: ${calculationResult.completedFields}/${calculationResult.totalFields} = ${calculationResult.progress}%`);
    
    // Update the database if requested
    if (updateDatabase) {
      // If preserveProgress is true, only update if the new progress is higher
      const shouldUpdate = !preserveProgress || calculationResult.progress > task.progress;
      
      if (shouldUpdate) {
        await db.update(tasks)
          .set({ 
            progress: calculationResult.progress, 
            updated_at: new Date(),
          })
          .where(eq(tasks.id, taskId));
        
        log.info(`Updated progress for task ${taskId} to ${calculationResult.progress}%`);
      } else {
        log.info(`Preserved existing progress (${task.progress}%) for task ${taskId} (new calculated: ${calculationResult.progress}%)`);
      }
    }
    
    // Send WebSocket update if requested
    if (sendWebSocketUpdate) {
      try {
        // Import WebSocketServer dynamically to avoid circular dependencies
        const { getWebSocketServer } = await import('../websocket');
        const wss = getWebSocketServer();
        
        if (wss) {
          const message = {
            type: 'task_updated',
            payload: {
              taskId,
              progress: updateDatabase ? calculationResult.progress : task.progress,
              status: task.status,
              timestamp: new Date().toISOString(),
            },
            data: {
              taskId,
              progress: updateDatabase ? calculationResult.progress : task.progress,
              status: task.status,
              timestamp: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
          };
          
          // Broadcast to all connected clients
          let clientCount = 0;
          wss.clients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
              client.send(JSON.stringify(message));
              clientCount++;
            }
          });
          
          log.info(`Broadcast task_updated to ${clientCount} clients`);
        }
      } catch (wsError) {
        log.error('Error sending WebSocket update:', wsError);
      }
    }
    
    // Return success result
    return {
      success: true,
      taskId,
      message: updateDatabase && !preserveProgress ? 'Progress updated' : 'Progress unchanged',
      progress: updateDatabase ? calculationResult.progress : task.progress,
      status: task.status,
    };
  } catch (error) {
    log.error(`Error calculating progress for task ${taskId}:`, error);
    return {
      success: false,
      taskId,
      message: error instanceof Error ? error.message : 'Unknown error calculating progress',
      progress: 0,
    };
  }
}
