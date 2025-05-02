/**
 * Progress Protection Module
 * 
 * This module implements a protection mechanism to prevent progress values from being
 * improperly reset to zero or decreasing when they shouldn't.
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';

// In-memory cache of the highest progress values seen for each task
// This serves as a safeguard against incorrect recalculations
const highestProgressCache: Map<number, number> = new Map();

// Timestamp of last progress update for a task
const lastProgressUpdate: Map<number, Date> = new Map();

// Lock timeouts (milliseconds)
const REGRESSIVE_UPDATE_TIMEOUT = 10000; // 10 seconds
const ZERO_RESET_TIMEOUT = 30000; // 30 seconds

/**
 * Check if a progress update is valid based on previous progress
 * 
 * This function prevents certain invalid progress transitions:
 * 1. Prevents progress from decreasing unless explicit reset requested
 * 2. Prevents progress from resetting to 0% after recently being > 0%
 * 3. Always allows progress to increase
 * 
 * @param taskId Task ID
 * @param newProgress New progress value (0-100)
 * @param options Configuration options 
 * @returns The validated progress value
 */
export async function validateProgressUpdate(
  taskId: number,
  newProgress: number,
  options: { 
    forceUpdate?: boolean; 
    explicitReset?: boolean;
    allowDecrease?: boolean;
  } = {}
): Promise<number> {
  const { forceUpdate = false, explicitReset = false, allowDecrease = false } = options;
  
  // Always allow forced updates or explicit resets
  if (forceUpdate || explicitReset) {
    // Update the cache with the new value
    if (explicitReset && newProgress === 0) {
      // For explicit resets to zero, clear the cache entry
      highestProgressCache.delete(taskId);
      lastProgressUpdate.delete(taskId);
      return 0;
    } else {
      // For forced updates, update the cache if the new value is higher
      const currentHighest = highestProgressCache.get(taskId) || 0;
      if (newProgress > currentHighest) {
        highestProgressCache.set(taskId, newProgress);
      }
      lastProgressUpdate.set(taskId, new Date());
      return newProgress;
    }
  }
  
  // Get the current highest progress from cache or database
  let currentHighest = highestProgressCache.get(taskId);
  
  // If not in cache, get from database
  if (currentHighest === undefined) {
    try {
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (task) {
        currentHighest = Number(task.progress) || 0;
        highestProgressCache.set(taskId, currentHighest);
      } else {
        currentHighest = 0;
      }
    } catch (error) {
      console.error(`[Progress Protection] Error getting task progress from database:`, error);
      currentHighest = 0;
    }
  }
  
  // Check if the last update was recent
  const lastUpdate = lastProgressUpdate.get(taskId);
  const now = new Date();
  const isRecentlyUpdated = lastUpdate && (now.getTime() - lastUpdate.getTime() < REGRESSIVE_UPDATE_TIMEOUT);
  
  // Special case for preventing a task from going back to 0% shortly after being > 0%
  // This is to prevent flashing between states during navigation
  if (newProgress === 0 && currentHighest > 0 && isRecentlyUpdated) {
    console.log(`[Progress Protection] Prevented regression to 0% for task ${taskId}:`, {
      currentProgress: currentHighest,
      attemptedProgress: newProgress,
      lastUpdateTime: lastUpdate,
      timeSinceLastUpdate: lastUpdate ? now.getTime() - lastUpdate.getTime() : 'unknown',
      protected: true
    });
    return currentHighest; // Keep the current non-zero progress
  }
  
  // Check for progress decrease (but allow if explicitly permitted)
  if (!allowDecrease && newProgress < currentHighest) {
    console.log(`[Progress Protection] Detected progress regression for task ${taskId}:`, {
      currentHighest,
      attemptedProgress: newProgress,
      prevented: true
    });
    return currentHighest; // Use the highest value
  }
  
  // For increasing progress, update the cache
  if (newProgress > currentHighest) {
    highestProgressCache.set(taskId, newProgress);
    console.log(`[Progress Protection] Updated highest progress for task ${taskId}:`, {
      previous: currentHighest,
      new: newProgress
    });
  }
  
  // Update the timestamp
  lastProgressUpdate.set(taskId, now);
  
  return newProgress;
}

/**
 * Explicitly reset a task's progress protection
 * 
 * This should be called when explicitly clearing all fields in a form
 * or when an action should legitimately reset progress to zero.
 * 
 * @param taskId Task ID
 */
export function explicitlyResetProgress(taskId: number): void {
  highestProgressCache.delete(taskId);
  lastProgressUpdate.delete(taskId);
  console.log(`[Progress Protection] Explicitly reset progress protection for task ${taskId}`);
}

/**
 * Get the current highest progress value for a task
 * 
 * @param taskId Task ID
 * @returns The highest recorded progress value or undefined if not cached
 */
export function getHighestProgress(taskId: number): number | undefined {
  return highestProgressCache.get(taskId);
}
