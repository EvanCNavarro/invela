/**
 * Enhanced WebSocket Monitoring Module
 * 
 * This module provides detailed monitoring and diagnostic capabilities 
 * for WebSocket communications, with special focus on progress updates
 * to help debug progress calculation inconsistencies.
 */

import { WebSocketServer } from 'ws';

// Keep a history of recent events for debugging
const progressEventHistory: Map<number, ProgressEvent[]> = new Map();

type ProgressEvent = {
  taskId: number;
  progress: number;
  status: string;
  timestamp: string;
  source?: string;
  diagnosticId?: string;
  broadcastSuccess?: boolean;
};

/**
 * Track a progress broadcast event
 * 
 * @param taskId Task ID
 * @param progress Progress value
 * @param status Task status
 * @param metadata Additional metadata
 * @param source Source of the event
 * @param diagnosticId Diagnostic tracking ID
 */
export function trackProgressBroadcast(
  taskId: number,
  progress: number,
  status: string,
  metadata: Record<string, any> | undefined,
  source: string,
  diagnosticId: string
): void {
  // Create a new progress event
  const progressEvent: ProgressEvent = {
    taskId,
    progress,
    status,
    timestamp: new Date().toISOString(),
    source,
    diagnosticId
  };

  // Get existing events for this task or create new array
  const events = progressEventHistory.get(taskId) || [];
  
  // Add new event to the beginning of the array (most recent first)
  events.unshift(progressEvent);
  
  // Keep only the last 20 events
  if (events.length > 20) {
    events.pop();
  }
  
  // Update the map
  progressEventHistory.set(taskId, events);
  
  // Log the progress change for debugging
  const previousEvent = events[1]; // Second most recent event (if exists)
  if (previousEvent) {
    const progressDiff = progress - previousEvent.progress;
    const isRegression = progressDiff < 0 && progress !== 0;
    
    if (isRegression) {
      console.log(`[WebSocketMonitor] 🚨 PROGRESS REGRESSION DETECTED for task ${taskId}:`, {
        previous: previousEvent.progress,
        current: progress,
        diff: progressDiff,
        previousTimestamp: previousEvent.timestamp,
        currentTimestamp: progressEvent.timestamp,
        previousSource: previousEvent.source,
        currentSource: source,
        timeDiff: new Date(progressEvent.timestamp).getTime() - new Date(previousEvent.timestamp).getTime(),
        diagnosticId
      });
    } else if (progressDiff > 0) {
      console.log(`[WebSocketMonitor] Progress increase for task ${taskId}: ${previousEvent.progress}% -> ${progress}%`, {
        diff: progressDiff,
        timeSinceLastUpdate: new Date(progressEvent.timestamp).getTime() - new Date(previousEvent.timestamp).getTime(),
        source
      });
    } else if (progress === 0 && previousEvent.progress > 0) {
      console.log(`[WebSocketMonitor] 🚨 Progress reset to zero for task ${taskId}:`, {
        previous: previousEvent.progress,
        timeSinceLastUpdate: new Date(progressEvent.timestamp).getTime() - new Date(previousEvent.timestamp).getTime(),
        source,
        diagnosticId
      });
    }
  } else {
    console.log(`[WebSocketMonitor] First progress event recorded for task ${taskId}: ${progress}%`);
  }
}

/**
 * Get recent progress events for a task
 * 
 * @param taskId Task ID
 * @returns Array of recent progress events
 */
export function getProgressHistory(taskId: number): ProgressEvent[] {
  return progressEventHistory.get(taskId) || [];
}

/**
 * Detect progress regressions for a task
 * 
 * @param taskId Task ID
 * @returns Information about the most recent regression, if any
 */
export function detectProgressRegression(taskId: number): {
  detected: boolean;
  currentProgress: number;
  previousProgress: number;
  diff: number;
  timestamp: string;
  source?: string;
} {
  const events = progressEventHistory.get(taskId) || [];
  
  if (events.length < 2) {
    return {
      detected: false,
      currentProgress: events[0]?.progress || 0,
      previousProgress: 0,
      diff: 0,
      timestamp: new Date().toISOString()
    };
  }
  
  const current = events[0];
  const previous = events[1];
  const diff = current.progress - previous.progress;
  
  return {
    detected: diff < 0 && current.progress !== 0, // Regression detected if diff is negative and not a reset to 0
    currentProgress: current.progress,
    previousProgress: previous.progress,
    diff,
    timestamp: current.timestamp,
    source: current.source
  };
}